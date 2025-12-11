const express = require('express');
const fs = require('fs');
const { guestGate } = require('../middleware/guestGate');
const { listPosts } = require('../services/postService');

const LOG_PATH = 'c:\\Users\\arbnor.morina\\OneDrive - PECB\\Desktop\\Testing\\rss-agg-mongo\\rss-agg\\.cursor\\debug.log';

function logDebug(payload) {
  try {
    const line = JSON.stringify({
      sessionId: 'debug-session',
      timestamp: Date.now(),
      ...payload
    });
    fs.appendFileSync(LOG_PATH, `${line}\n`);
  } catch {
    // ignore logging errors
  }
}

const router = express.Router();

router.get('/', guestGate, async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const requestedLimit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);
  const search = req.query.search;
  const feedSlug = req.query.feed || 'all'; // used for preview rules
  const feedFilterSlug = req.query.feed || null; // pass null to fetch from all feeds
  const isGuest = !req.user;
  logDebug({
    runId: 'pre-fix2',
    hypothesisId: 'H4',
    location: 'routes/posts:get',
    message: 'request start',
    data: {
      page,
      requestedLimit,
      search: Boolean(search),
      feedSlug,
      ifNoneMatch: req.headers['if-none-match'] || null
    }
  });
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

  // Force no caching to avoid 304 responses interfering with the UI.
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('etag', false);

  // #region agent log
  if (typeof fetch === 'function') {
    fetch('http://127.0.0.1:7242/ingest/3e16f2d6-49d1-4c3c-81fa-a147d8e19c39', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H4',
        location: 'routes/posts.js:get',
        message: 'posts route response',
        data: {
          status: 200,
          feedSlug,
          page: isGuest ? 1 : page,
          limit: effectiveLimit,
          guest: isGuest,
          ifNoneMatch: req.headers['if-none-match'] || null,
          visibleTotal,
          previewRemaining
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
  } else {
    logDebug({
      runId: 'pre-fix',
      hypothesisId: 'H4',
      location: 'routes/posts.js:get',
      message: 'posts route response',
      data: {
        status: 200,
        feedSlug,
        page: isGuest ? 1 : page,
        limit: effectiveLimit,
        guest: isGuest,
        ifNoneMatch: req.headers['if-none-match'] || null,
        visibleTotal,
        previewRemaining
      }
    });
  }
  // #endregion

  res.json({
    posts: items,
    page: isGuest ? 1 : page,
    total: visibleTotal,
    showSignInGate: false,
    remaining: req.guest ? req.guest.remainingFeed : null,
    limit: req.guest ? req.guest.limitFeed : null,
    guestPreview
  });
  logDebug({
    runId: 'pre-fix2',
    hypothesisId: 'H4',
    location: 'routes/posts:get',
    message: 'response sent',
    data: {
      feedSlug,
      scope: isGuest ? 'guest' : 'authed',
      items: items.length,
      total: fullTotal,
      visibleTotal,
      guestPreviewLimit,
      guestPreviewRemaining: previewRemaining
    }
  });
});

module.exports = router;

