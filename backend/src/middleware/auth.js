const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { verifySession } = require('../services/authService');

function pickLatestSessionToken(req) {
  const header = req.headers.cookie || '';
  const tokens = header
    .split(';')
    .map(s => s.trim())
    .filter(s => s.startsWith('session_token='))
    .map(s => s.split('=')[1] || '')
    .filter(Boolean);
  if (tokens.length) {
    return decodeURIComponent(tokens[tokens.length - 1]);
  }
  return req.cookies?.session_token || null;
}

async function attachUser(req, res, next) {
  try {
    const bearer = req.headers.authorization;
    const cookieToken = pickLatestSessionToken(req);
    const bearerToken = bearer?.startsWith('Bearer ') ? bearer.slice(7) : null;

    let sessionId = null;
    let userId = null;

    // Prefer Authorization header (JWT) if present.
    if (bearerToken && bearerToken.split('.').length === 3) {
      try {
        const decoded = jwt.verify(bearerToken, env.jwtSecret);
        sessionId = decoded.sid;
        userId = decoded.sub;
      } catch {
        // fall back to cookie/session token when JWT verification fails
      }
    }

    // Non-JWT bearer tokens (sid) or fallback to cookie token.
    if (!sessionId && bearerToken) {
      sessionId = bearerToken;
    }
    if (!sessionId && cookieToken) {
      sessionId = cookieToken;
    }

    if (!sessionId) return next();
    const result = await verifySession(sessionId);
    if (!result) return next();
    const { user, session } = result;
    // If JWT had sub mismatch, ignore JWT and rely on session record
    if (userId && user._id.toString() !== userId) return next();

    req.user = user;
    req.session = session;
    return next();
  } catch (err) {
    return next();
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  return next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!req.user.roles?.includes(role)) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}

module.exports = { attachUser, requireAuth, requireRole };

