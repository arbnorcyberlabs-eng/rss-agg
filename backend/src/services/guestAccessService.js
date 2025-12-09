const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const GuestAccess = require('../models/guestAccess');
const { env } = require('../config/env');

function hashIpUserAgent(ip, ua) {
  return crypto.createHash('sha256').update(`${ip || ''}-${ua || ''}`).digest('hex');
}

function buildExpiry(windowMinutes) {
  return new Date(Date.now() + windowMinutes * 60 * 1000);
}

async function getOrCreateGuest(anonKey) {
  const now = new Date();
  const windowMinutes = env.guestWindowMinutes;
  const expiresAt = buildExpiry(windowMinutes);
  let guest = await GuestAccess.findOne({ anonKey });
  if (!guest || guest.expiresAt < now) {
    guest = await GuestAccess.findOneAndUpdate(
      { anonKey },
      { anonKey, windowStart: now, totalCount: 0, feedCounts: {}, expiresAt },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  return guest;
}

async function incrementGuest(anonKey, feedSlug = 'all') {
  const guest = await getOrCreateGuest(anonKey);
  guest.totalCount += 1;
  const current = guest.feedCounts.get(feedSlug) || 0;
  guest.feedCounts.set(feedSlug, current + 1);
  await guest.save();
  return guest;
}

function newAnonKey() {
  return uuidv4();
}

module.exports = {
  hashIpUserAgent,
  newAnonKey,
  incrementGuest,
  getOrCreateGuest
};

