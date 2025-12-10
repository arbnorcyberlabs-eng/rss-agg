const express = require('express');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { env } = require('../config/env');
const {
  createUser,
  verifyUser,
  findOrCreateGoogleUser,
  deleteUserById,
  updateUserProfile
} = require('../services/userService');
const { createSession, deleteSession, deleteSessionsForUser, verifySession } = require('../services/authService');
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

const handshakeSchema = z.object({
  token: z.string().min(10)
});

function setSessionCookie(req, res, sessionId, expiresAt, { partitioned = false } = {}) {
  // Cross-site frontend (separate domain) needs SameSite=None and Secure for the cookie to be sent.
  const forwardedProto = (req.headers['x-forwarded-proto'] || '').split(',')[0];
  const isForwardedHttps = forwardedProto === 'https';
  const isLocalFrontend = (env.frontendOrigin || '').includes('localhost');

  // On Render/https we always want a secure cookie; on localhost allow non-secure for dev.
  const isSecure = isForwardedHttps || req.secure || !isLocalFrontend;
  const sameSite = isSecure ? 'None' : 'Lax';

  if (!partitioned) {
    res.cookie('session_token', sessionId, {
      httpOnly: true,
      sameSite,
      secure: isSecure,
      expires: expiresAt
    });
    const headerVal = res.getHeader('Set-Cookie');
    console.log('Set-Cookie (non-partitioned)', headerVal);
    return;
  }

  // Manually craft header to include Partitioned (some cookie helpers don’t support it yet).
  const parts = [
    `session_token=${encodeURIComponent(sessionId)}`,
    'Path=/',
    'HttpOnly',
    `Expires=${expiresAt.toUTCString()}`,
    'SameSite=None',
    'Secure',
    'Partitioned'
  ];
  console.log('Setting partitioned session cookie', { sameSite: 'None', secure: true, partitioned: true });
  res.setHeader('Set-Cookie', parts.join('; '));
  console.log('Set-Cookie header (partitioned)', res.getHeader('Set-Cookie'));
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
  console.log('Google callback received', {
    hasCode: Boolean(code),
    stateLength: state ? String(state).length : 0
  });
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

    // Issue a short-lived handshake token so the frontend can set a partitioned cookie
    // while the top-level site is the frontend origin (needed when 3P cookies are blocked).
    const handshakeToken = jwt.sign(
      { sid: session.sessionId, sub: user._id.toString() },
      env.jwtSecret,
      { expiresIn: '5m' }
    );

    const parsedState = decodeState(state);
    const baseRedirect = parsedState.redirect || `${env.frontendOrigin.replace(/\/$/, '')}/admin.html`;
    const separator = baseRedirect.includes('?') ? '&' : '?';
    const redirectUrl = `${baseRedirect}${separator}handshake=${encodeURIComponent(handshakeToken)}`;

    res.redirect(redirectUrl);
  } catch (err) {
    console.error('Google auth failed', {
      message: err?.message,
      name: err?.name,
      code: err?.code,
      responseError: err?.response?.data?.error,
      responseDesc: err?.response?.data?.error_description
    });
    res.status(400).send('Google sign-in failed');
  }
});

router.post('/handshake', async (req, res) => {
  try {
    console.log('Handshake request headers', {
      cookie: req.headers.cookie || null,
      origin: req.headers.origin || null
    });
    const { token } = handshakeSchema.parse(req.body);
    const payload = jwt.verify(token, env.jwtSecret);
    const { sid, sub } = payload || {};
    if (!sid || !sub) return res.status(400).json({ error: 'Invalid handshake token' });

    const result = await verifySession(sid);
    if (!result || result.user._id.toString() !== sub) {
      return res.status(401).json({ error: 'Session expired' });
    }

    setSessionCookie(req, res, sid, result.session.expiresAt, { partitioned: true });
    res.json({ user: formatUser(result.user) });
  } catch (err) {
    console.error('Handshake failed', {
      message: err?.message,
      name: err?.name
    });
    const status = err.name === 'TokenExpiredError' ? 400 : 401;
    res.status(status).json({ error: 'Handshake failed' });
  }
});

module.exports = router;

