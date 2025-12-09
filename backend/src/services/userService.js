const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/user');

function sanitizeUser(user) {
  if (!user) return null;
  const json = user.toJSON ? user.toJSON() : user;
  // Remove password hash if present
  const { passwordHash, ...rest } = json;
  return rest;
}

async function createUser({ email, password, displayName }) {
  const emailLower = email.toLowerCase();
  const existing = await User.findOne({ email: emailLower });
  if (existing) throw new Error('Email already registered');
  const passwordHash = await bcrypt.hash(password, 10);
  return User.create({
    email: emailLower,
    passwordHash,
    displayName: displayName || emailLower.split('@')[0],
    emailVerified: false
  });
}

async function verifyUser(email, password) {
  const emailLower = email.toLowerCase();
  const user = await User.findOne({ email: emailLower });
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return user;
}

async function getUserById(id) {
  return User.findById(id);
}

async function getUserByEmail(email) {
  if (!email) return null;
  return User.findOne({ email: email.toLowerCase() });
}

async function findOrCreateGoogleUser({ email, displayName, roles = [] }) {
  if (!email) throw new Error('Email is required');
  const emailLower = email.toLowerCase();
  let user = await getUserByEmail(emailLower);
  if (!user) {
    const randomPassword = uuidv4();
    const passwordHash = await bcrypt.hash(randomPassword, 10);
    user = await User.create({
      email: emailLower,
      passwordHash,
      displayName: displayName || emailLower.split('@')[0],
      roles: roles.length ? roles : ['user'],
      emailVerified: true
    });
    return user;
  }
  const mergedRoles = Array.from(new Set([...(user.roles || []), ...roles]));
  if (mergedRoles.join(',') !== (user.roles || []).join(',')) {
    user.roles = mergedRoles;
  }
  if (!user.emailVerified) {
    user.emailVerified = true;
  }
  await user.save();
  return user;
}

async function listUsers() {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  return users.map(sanitizeUser);
}

async function adminCreateUser({ email, password, displayName, roles = ['user'], emailVerified }) {
  const emailLower = email.toLowerCase();
  const existing = await User.findOne({ email: emailLower });
  if (existing) throw new Error('Email already registered');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: emailLower,
    passwordHash,
    displayName: displayName || emailLower.split('@')[0],
    roles: roles.length ? roles : ['user'],
    emailVerified: emailVerified === undefined ? true : Boolean(emailVerified)
  });
  return sanitizeUser(user);
}

async function adminUpdateUser(userId, updates = {}) {
  if (!userId) return null;
  const user = await User.findById(userId);
  if (!user) return null;

  if (updates.email) {
    const emailLower = updates.email.toLowerCase();
    const existing = await User.findOne({ email: emailLower, _id: { $ne: userId } });
    if (existing) throw new Error('Email already registered');
    user.email = emailLower;
  }

  if (updates.displayName !== undefined) {
    user.displayName = updates.displayName;
  }

  if (updates.roles) {
    user.roles = Array.from(new Set(updates.roles.filter(Boolean)));
  }

  if (updates.emailVerified !== undefined) {
    user.emailVerified = updates.emailVerified;
  }

  if (updates.password) {
    user.passwordHash = await bcrypt.hash(updates.password, 10);
  }

  await user.save();
  return sanitizeUser(user);
}

async function updateDisplayName(userId, displayName) {
  return updateUserProfile(userId, { displayName });
}

async function updateUserProfile(userId, { displayName, settings } = {}) {
  if (!userId) return null;
  const user = await User.findById(userId);
  if (!user) return null;

  if (displayName !== undefined) {
    user.displayName = displayName;
  }

  if (settings) {
    user.settings = { ...(user.settings || {}), ...settings };
  }

  await user.save();
  return user;
}

async function deleteUserById(id) {
  if (!id) return null;
  return User.deleteOne({ _id: id });
}

async function markEmailVerified(userId) {
  if (!userId) return null;
  const user = await User.findById(userId);
  if (!user) return null;
  if (!user.emailVerified) {
    user.emailVerified = true;
    await user.save();
  }
  return user;
}

module.exports = {
  createUser,
  verifyUser,
  getUserById,
  getUserByEmail,
  findOrCreateGoogleUser,
  updateDisplayName,
  updateUserProfile,
  deleteUserById,
  markEmailVerified,
  listUsers,
  adminCreateUser,
  adminUpdateUser
};

