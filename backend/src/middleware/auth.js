const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { verifySession } = require('../services/authService');

function agentLog(payload) {
  const body = {
    sessionId: 'debug-session',
    runId: payload.runId || 'pre-fix',
    ...payload,
    timestamp: Date.now()
  };
  try {
    fetch('http://127.0.0.1:7242/ingest/3e16f2d6-49d1-4c3c-81fa-a147d8e19c39', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).catch(() => {});
    console.log('[agentLog]', JSON.stringify(body));
  } catch {
    // ignore
  }
}

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
    if (req.originalUrl?.startsWith('/api/auth/me')) {
      console.log('attachUser /auth/me', {
        cookieHeader: req.headers.cookie || null,
        authHeader: req.headers.authorization || null
      });
    }
    const bearer = req.headers.authorization;
    const cookieToken = pickLatestSessionToken(req);
    const rawToken = bearer?.startsWith('Bearer ') ? bearer.slice(7) : cookieToken;
    agentLog({
      hypothesisId: 'H7',
      location: 'middleware/auth.js:attachUser',
      message: 'Token selection',
      data: {
        hasBearer: Boolean(bearer),
        cookieCount: (req.headers.cookie || '').split('session_token=').length - 1,
        pickedCookieSuffix: rawToken ? String(rawToken).slice(-6) : null,
        url: req.originalUrl || null
      }
    });
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

