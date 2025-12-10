const { v4: uuidv4 } = require('uuid');
const Session = require('../models/session');
const { env } = require('../config/env');
const { getUserByEmail, getUserById } = require('./userService');
const { sendVerificationEmail } = require('./emailService');

function buildExpiryDate() {
  const hours = env.emailVerifyExpiryHours || 24;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function createVerificationToken(user) {
  if (!user?._id) throw new Error('User is required to create a verification token');
  const token = uuidv4();
  const expiresAt = buildExpiryDate();

  await Session.deleteMany({ userId: user._id, type: 'verification' });
  await Session.create({
    sessionId: token,
    userId: user._id,
    type: 'verification',
    expiresAt
  });

  return { token, expiresAt };
}

async function sendVerificationForUser(user) {
  const { token, expiresAt } = await createVerificationToken(user);
  console.log('[verification] Created token for user', {
    userId: user?._id?.toString(),
    email: user?.email,
    expiresAt,
    tokenSuffix: token.slice(-6)
  });
  await sendVerificationEmail({ to: user.email, token, expiresAt });
  return { token, expiresAt };
}

async function resendVerification(email) {
  const user = await getUserByEmail(email);
  if (!user) throw new Error('Account not found');
  if (user.emailVerified !== false) throw new Error('Email already verified');
  return sendVerificationForUser(user);
}

async function verifyEmailToken(token) {
  if (!token) return null;
  const record = await Session.findOne({ sessionId: token, type: 'verification' });
  if (!record) return null;
  if (record.expiresAt < new Date()) {
    await Session.deleteOne({ _id: record._id });
    return null;
  }
  const user = await getUserById(record.userId);
  if (!user) {
    await Session.deleteMany({ userId: record.userId, type: 'verification' });
    return null;
  }
  user.emailVerified = true;
  await user.save();
  await Session.deleteMany({ userId: user._id, type: 'verification' });
  return user;
}

module.exports = {
  sendVerificationForUser,
  resendVerification,
  verifyEmailToken
};


