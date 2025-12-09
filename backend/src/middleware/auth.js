const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { verifySession } = require('../services/authService');

async function attachUser(req, res, next) {
  try {
    const bearer = req.headers.authorization;
    const rawToken = bearer?.startsWith('Bearer ') ? bearer.slice(7) : req.cookies?.session_token;
    if (!rawToken) return next();

    let sessionId = null;
    let userId = null;

    // Try JWT first
    if (rawToken.split('.').length === 3) {
      try {
        const decoded = jwt.verify(rawToken, env.jwtSecret);
        sessionId = decoded.sid;
        userId = decoded.sub;
      } catch {
        // fall back to session lookup by token
      }
    } else {
      sessionId = rawToken;
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

