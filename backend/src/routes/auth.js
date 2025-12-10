const express = require('express');
const { z } = require('zod');
const { env } = require('../config/env');
const {
  createUser,
  verifyUser,
  findOrCreateGoogleUser,
  deleteUserById,
  updateUserProfile
} = require('../services/userService');
const { createSession, deleteSession, deleteSessionsForUser } = require('../services/authService');
const { sendVerificationForUser, resendVerification, verifyEmailToken } = require('../services/emailVerificationService');
const { requireAuth } = require('../middleware/auth');
const { buildGoogleAuthUrl, verifyGoogleCode } = require('../services/googleAuthService');
const { queueRefreshForUser } = require('../services/feedRefreshService');
const { listFeedsForUser } = require('../services/feedService');

const router = express.Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional()
});

const profileUpdateSchema = z
  .object({
    displayName: z.string().min(1).max(100).optional(),
    preferredFeeds: z.array(z.string().min(1)).optional()
  })
  .refine(data => data.displayName !== undefined || data.preferredFeeds !== undefined, {
    message: 'No updates provided'
  });

const emailSchema = z.object({
  email: z.string().email()
});

const verifyTokenSchema = z.object({
  token: z.string().min(10)
  });

function setSessionCookie(req, res, sessionId, expiresAt) {
  // Cross-site frontend (separate domain) needs SameSite=None and Secure for the cookie to be sent.
  const forwardedProto = (req.headers['x-forwarded-proto'] || '').split(',')[0];
  const isForwardedHttps = forwardedProto === 'https';
  const isLocalFrontend = (env.frontendOrigin || '').includes('localhost');

  // On Render/https we always want a secure cookie; on localhost allow non-secure for dev.
  const isSecure = isForwardedHttps || req.secure || !isLocalFrontend;
  const sameSite = isSecure ? 'None' : 'Lax';
  // Chrome is phasing out third-party cookies; partition them so they are accepted cross-site.
  const partitioned = isSecure && !isLocalFrontend;

  // Manually set cookie to guarantee the Partitioned attribute is sent (res.cookie may omit it on older Express/cookie versions).
  const parts = [
    `session_token=${encodeURIComponent(sessionId)}`,
    'Path=/',
    'HttpOnly',
    `Expires=${expiresAt.toUTCString()}`,
    `SameSite=${sameSite}`
  ];
  if (isSecure) parts.push('Secure');
  if (partitioned) parts.push('Partitioned');

  res.setHeader('Set-Cookie', parts.join('; '));
}

function formatUser(user) {
  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    settings: user.settings,
    emailVerified: user.emailVerified !== false
  };
}

function decodeState(state) {
  if (!state) return {};
  try {
    const json = Buffer.from(state, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return {};
  }
}

router.post('/register', async (req, res) => {
  try {
    const body = credentialsSchema.parse(req.body);
    const user = await createUser(body);
    await sendVerificationForUser(user);
    res.status(201).json({
      requiresVerification: true,
      message: 'Check your email to confirm your account.'
    });
  } catch (err) {
    const status = err.message === 'Email already registered' ? 400 : 500;
    res.status(status).json({ error: err.message || 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const body = credentialsSchema.parse(req.body);
    const user = await verifyUser(body.email, body.password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.emailVerified === false) {
      return res.status(403).json({
        error: 'Please confirm your email before logging in.',
        requiresVerification: true
      });
    }
    const session = await createSession(user, {
      userAgent: req.headers['user-agent'],
      ipHash: req.ip
    });
    setSessionCookie(req, res, session.sessionId, session.expiresAt);
    queueRefreshForUser(user);
    res.json({
      user: formatUser(user),
      accessToken: session.accessToken
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Login failed' });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { token } = verifyTokenSchema.parse(req.body);
    const user = await verifyEmailToken(token);
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification link' });
    const session = await createSession(user, {
      userAgent: req.headers['user-agent'],
      ipHash: req.ip
    });
    setSessionCookie(req, res, session.sessionId, session.expiresAt);
    queueRefreshForUser(user);
    res.json({
      user: formatUser(user),
      accessToken: session.accessToken,
      message: 'Email verified and account activated.'
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Verification failed' });
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = emailSchema.parse(req.body);
    await resendVerification(email);
    res.json({ success: true });
  } catch (err) {
    const status = err.message === 'Account not found' ? 404 : 400;
    res.status(status).json({ error: err.message || 'Could not resend verification email' });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    const sessionId = req.cookies?.session_token || req.session?.sessionId;
    await deleteSession(sessionId);
    res.clearCookie('session_token');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({
    user: formatUser(req.user)
  });
});

router.patch('/me', requireAuth, async (req, res) => {
  try {
    const body = profileUpdateSchema.parse(req.body);
    const updates = {};
    if (body.displayName !== undefined) {
      updates.displayName = body.displayName.trim();
    }
    if (body.preferredFeeds !== undefined) {
      const accessibleFeeds = await listFeedsForUser(req.user);
      const allowedSlugs = new Set(accessibleFeeds.map(f => f.slug).filter(Boolean));
      const uniquePrefs = Array.from(
        new Set((body.preferredFeeds || []).filter(slug => allowedSlugs.has(slug)))
      );
      updates.settings = { ...(req.user.settings || {}), preferredFeeds: uniquePrefs };
    }
    const updated = await updateUserProfile(req.user._id, updates);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json({
      user: formatUser(updated)
    });
  } catch (err) {
    const status = err?.errors ? 400 : 500;
    res.status(status).json({ error: err.message || 'Profile update failed' });
  }
});

router.delete('/me', requireAuth, async (req, res) => {
  try {
    await deleteSessionsForUser(req.user._id);
    await deleteUserById(req.user._id);
    res.clearCookie('session_token');
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete account', err);
    res.status(500).json({ error: 'Account deletion failed' });
  }
});

router.get('/google/start', (req, res) => {
  const redirectParam = req.query.redirect;
  const fallbackRedirect = `${env.frontendOrigin.replace(/\/$/, '')}/admin.html`;
  const redirect = redirectParam || fallbackRedirect;
  const state = Buffer.from(JSON.stringify({ redirect }), 'utf8').toString('base64url');
  const url = buildGoogleAuthUrl(state);
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send('Missing code');
  try {
    const googleUser = await verifyGoogleCode(code);
    if (!googleUser.email) {
      return res.status(400).send('Google account missing email');
    }
    const emailLower = googleUser.email.toLowerCase();
    const roles = emailLower === env.adminGoogleEmail.toLowerCase() ? ['admin'] : ['user'];
    const user = await findOrCreateGoogleUser({
      email: emailLower,
      displayName: googleUser.name,
      roles
    });
    const session = await createSession(user, {
      userAgent: req.headers['user-agent'],
      ipHash: req.ip
    });
    setSessionCookie(req, res, session.sessionId, session.expiresAt);
    const parsedState = decodeState(state);
    const redirectUrl = parsedState.redirect || `${env.frontendOrigin.replace(/\/$/, '')}/admin.html`;
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('Google auth failed', err);
    res.status(400).send('Google sign-in failed');
  }
});

module.exports = router;

