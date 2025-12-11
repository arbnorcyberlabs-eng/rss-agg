const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Session = require('../models/session');
const { env } = require('../config/env');
const { getUserById } = require('./userService');

function agentLog(payload) {
  const body = {
    sessionId: 'debug-session',
    runId: payload.runId || 'pre-fix',
    ...payload,
    timestamp: Date.now()
  };
  // Best-effort fire-and-forget
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

function buildAccessToken(user, sessionId) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      sid: sessionId,
      roles: user.roles
    },
    env.jwtSecret,
    { expiresIn: `${env.tokenTtlHours}h` }
  );
}

async function createSession(user, meta = {}) {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + env.refreshTtlDays * 24 * 60 * 60 * 1000);
  await Session.create({
    sessionId,
    userId: user._id,
    type: 'session',
    expiresAt,
    userAgent: meta.userAgent,
    ipHash: meta.ipHash
  });
  const accessToken = buildAccessToken(user, sessionId);
  agentLog({
    hypothesisId: 'H5',
    location: 'services/authService.js:createSession',
    message: 'Session created',
    data: {
      sessionSuffix: sessionId.slice(-6),
      userId: user?._id?.toString() || null,
      expiresAt: expiresAt.toISOString(),
      userAgent: meta.userAgent ? meta.userAgent.slice(0, 120) : null,
      ipHash: meta.ipHash || null
    }
  });
  return { sessionId, accessToken, expiresAt };
}

async function verifySession(sessionId) {
  if (!sessionId) return null;
  const session = await Session.findOne({ sessionId, type: 'session' });
  if (!session) {
    agentLog({
      hypothesisId: 'H6',
      location: 'services/authService.js:verifySession',
      message: 'Session not found',
      data: { sessionSuffix: sessionId.slice(-6) }
    });
    return null;
  }
  if (session.expiresAt < new Date()) {
    agentLog({
      hypothesisId: 'H6',
      location: 'services/authService.js:verifySession',
      message: 'Session expired',
      data: {
        sessionSuffix: sessionId.slice(-6),
        expiresAt: session.expiresAt.toISOString()
      }
    });
    return null;
  }
  const user = await getUserById(session.userId);
  if (!user) {
    agentLog({
      hypothesisId: 'H6',
      location: 'services/authService.js:verifySession',
      message: 'User missing for session',
      data: {
        sessionSuffix: sessionId.slice(-6),
        userId: session.userId?.toString() || null
      }
    });
    return null;
  }
  agentLog({
    hypothesisId: 'H6',
    location: 'services/authService.js:verifySession',
    message: 'Session verified',
    data: {
      sessionSuffix: sessionId.slice(-6),
      userId: user._id?.toString() || null,
      expiresAt: session.expiresAt.toISOString()
    }
  });
  return { session, user };
}

async function deleteSession(sessionId) {
  if (!sessionId) return;
  await Session.deleteOne({ sessionId });
}

async function deleteSessionsForUser(userId) {
  if (!userId) return;
  await Session.deleteMany({ userId });
}

module.exports = {
  createSession,
  verifySession,
  deleteSession,
  deleteSessionsForUser,
  buildAccessToken
};

