const { env } = require('../config/env');
const {
  hashIpUserAgent,
  newAnonKey,
  incrementGuest
} = require('../services/guestAccessService');

// Soft limits for guests: preview 7 on "global", 5 on "all", 3 per specific feed.
// The total limit stays generous to keep an anti-abuse guard without
// preventing the preview experience.
const hardLimitTotal = 30;
const previewLimitAllFeeds = 5;
const previewLimitSingleFeed = 3;
const previewLimitGlobal = 7;

function resolveLimits(feedSlug = 'all') {
  const feedPreviewLimit =
    feedSlug === 'global'
      ? previewLimitGlobal
      : feedSlug === 'all'
      ? previewLimitAllFeeds
      : previewLimitSingleFeed;
  return {
    feedPreviewLimit,
    feedLimit: feedPreviewLimit,
    totalLimit: hardLimitTotal
  };
}

function ensureGuestCookie(req, res) {
  let anonKey = req.cookies?.guest_key;
  if (!anonKey) {
    anonKey = newAnonKey();
    res.cookie('guest_key', anonKey, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: env.guestWindowMinutes * 60 * 1000
    });
  }
  return anonKey;
}

async function guestGate(req, res, next) {
  if (req.user) return next();

  const anonKey = ensureGuestCookie(req, res);
  const ipHash = hashIpUserAgent(req.ip, req.headers['user-agent']);
  const feedSlug = req.query.feed || 'all';
  const { feedPreviewLimit, feedLimit, totalLimit } = resolveLimits(feedSlug);

  const guest = await incrementGuest(`${anonKey}-${ipHash}`, feedSlug);
  const remainingTotal = Math.max(totalLimit - guest.totalCount, 0);
  const feedCount = guest.feedCounts.get(feedSlug) || 0;
  const remainingFeed = Math.max(feedLimit - feedCount, 0);

  req.guest = {
    anonKey,
    remainingTotal,
    remainingFeed,
    limitTotal: totalLimit,
    limitFeed: feedLimit,
    previewLimit: feedPreviewLimit,
    feedSlug
  };
  return next();
}

module.exports = { guestGate };

