const express = require('express');
const { guestGate } = require('../middleware/guestGate');
const { listPosts } = require('../services/postService');

const router = express.Router();

router.get('/', guestGate, async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const requestedLimit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);
  const search = req.query.search;
  const feedSlug = req.query.feed || 'all'; // used for preview rules
  const feedFilterSlug = req.query.feed || null; // pass null to fetch from all feeds
  const isGuest = !req.user;
  const guestPreviewLimit = isGuest
    ? (
        req.guest?.previewLimit
        || (feedSlug === 'global' ? 7 : (feedSlug === 'all' ? 5 : 3))
      )
    : null;

  // For guests, force a preview-only slice and avoid pagination beyond the preview.
  const effectiveLimit = isGuest && guestPreviewLimit
    ? Math.min(requestedLimit, guestPreviewLimit)
    : requestedLimit;
  const effectivePage = isGuest ? 1 : page;

  const { items, total: fullTotal } = await listPosts({
    user: req.user,
    page: effectivePage,
    limit: effectiveLimit,
    search,
    feedSlug: feedFilterSlug
  });

  const previewRemaining = isGuest && guestPreviewLimit
    ? Math.max(fullTotal - guestPreviewLimit, 0)
    : 0;
  const guestPreview = isGuest
    ? {
        feed: feedSlug,
        max: guestPreviewLimit,
        available: fullTotal,
        remaining: previewRemaining
      }
    : null;
  const visibleTotal = isGuest && guestPreviewLimit ? Math.min(fullTotal, guestPreviewLimit) : fullTotal;

  res.json({
    posts: items,
    page: isGuest ? 1 : page,
    total: visibleTotal,
    showSignInGate: false,
    remaining: req.guest ? req.guest.remainingFeed : null,
    limit: req.guest ? req.guest.limitFeed : null,
    guestPreview
  });
});

module.exports = router;

