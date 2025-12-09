const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Session = require('../models/session');
const { env } = require('../config/env');
const { getUserById } = require('./userService');

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
  return { sessionId, accessToken, expiresAt };
}

async function verifySession(sessionId) {
  if (!sessionId) return null;
  const session = await Session.findOne({ sessionId, type: 'session' });
  if (!session) return null;
  if (session.expiresAt < new Date()) return null;
  const user = await getUserById(session.userId);
  if (!user) return null;
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

