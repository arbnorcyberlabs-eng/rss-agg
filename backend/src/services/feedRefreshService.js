const Parser = require('rss-parser');
const Feed = require('../models/feed');
const { upsertPostFromFeedItem } = require('./postService');
const { listFeedsForUser } = require('./feedService');
const { scrapeFeed } = require('./scrapeService');

const parser = new Parser();

// Default public feeds; keep seeded for all users.
const defaultFeeds = [
  {
    // Use slugified title for consistency with UI / requests (allows "hacker-news").
    slug: 'hacker-news',
    title: 'Hacker News',
    type: 'native_rss',
    rssUrl: 'https://hnrss.org/frontpage',
    config: null,
    enabled: true,
    displayOrder: 1
  },
  {
    slug: 'economymedia',
    title: 'Economy Media',
    type: 'youtube',
    rssUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCc8q4B1bj-668LMHyNXnTxQ',
    config: null,
    enabled: true,
    displayOrder: 2
  }
];

async function ensureFeedsSeeded() {
  for (const seed of defaultFeeds) {
    // Migrate legacy slugs (e.g., "hackernews" -> "hacker-news") for global feeds.
    const legacy = await Feed.findOne({ title: seed.title, userId: null });
    if (legacy && legacy.slug !== seed.slug) {
      legacy.slug = seed.slug;
      await legacy.save();
      continue;
    }

    const exists = await Feed.findOne({ slug: seed.slug, userId: null });
    if (!exists) {
      await Feed.create({
        title: seed.title,
        slug: seed.slug,
        type: seed.type,
        rssUrl: seed.rssUrl,
        config: seed.config,
        enabled: seed.enabled,
        displayOrder: seed.displayOrder || 0,
        userId: null
      });
    }
  }
}

async function parseWithFallback(feed) {
  const candidates = [];
  if (feed.rssUrl) candidates.push({ url: feed.rssUrl, label: 'rssUrl' });
  const defaultSeed = defaultFeeds.find(f => f.slug === feed.slug);
  if (defaultSeed && defaultSeed.rssUrl) {
    candidates.push({ url: defaultSeed.rssUrl, label: 'default' });
  }
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const parsed = await parser.parseURL(candidate.url);
      return { parsed, usedUrl: candidate.url };
    } catch (err) {
      lastError = err;
      console.warn(`Failed parsing (${candidate.label}) ${feed.title} (${candidate.url}): ${err.message}`);
    }
  }
  return { parsed: null, usedUrl: null, lastError };
}

async function fetchFeedsForRefresh(user, feedIds) {
  if (feedIds && feedIds.length) {
    return Feed.find({ _id: { $in: feedIds }, enabled: true });
  }
  if (user) {
    return listFeedsForUser(user);
  }
  return Feed.find({ enabled: true });
}

async function refreshFeeds({ user = null, feedIds = null } = {}) {
  await ensureFeedsSeeded();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3e16f2d6-49d1-4c3c-81fa-a147d8e19c39', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId: 'H1',
      location: 'feedRefreshService.js:refreshFeeds',
      message: 'refreshFeeds invoked',
      data: { feedIds, userId: user?._id || null },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion
  const feeds = await fetchFeedsForRefresh(user, feedIds);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3e16f2d6-49d1-4c3c-81fa-a147d8e19c39', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId: 'H1',
      location: 'feedRefreshService.js:refreshFeeds',
      message: 'feeds fetched for refresh',
      data: { count: feeds.length, ids: feeds.map(f => f._id), slugs: feeds.map(f => f.slug) },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion
  let totalUpserted = 0;
  let feedsParsed = 0;

  for (const feed of feeds) {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3e16f2d6-49d1-4c3c-81fa-a147d8e19c39', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'pre-fix',
          hypothesisId: 'H2',
          location: 'feedRefreshService.js:refreshFeeds',
          message: 'processing feed',
          data: { feedId: feed._id, slug: feed.slug, type: feed.type },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
      if (feed.type === 'scraped') {
        const { items } = await scrapeFeed(feed);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3e16f2d6-49d1-4c3c-81fa-a147d8e19c39', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'pre-fix',
            hypothesisId: 'H3',
            location: 'feedRefreshService.js:scraped',
            message: 'scrape results',
            data: { feedId: feed._id, slug: feed.slug, itemCount: items ? items.length : 0 },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        if (!items || !items.length) continue;
        feedsParsed += 1;
        for (const item of items) {
          await upsertPostFromFeedItem(feed, item);
          totalUpserted += 1;
        }
      } else {
        const { parsed, lastError, usedUrl } = await parseWithFallback(feed);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3e16f2d6-49d1-4c3c-81fa-a147d8e19c39', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'pre-fix',
            hypothesisId: 'H2',
            location: 'feedRefreshService.js:parseWithFallback',
            message: 'parse result',
            data: { feedId: feed._id, slug: feed.slug, usedUrl, itemCount: parsed?.items?.length || 0, error: lastError ? lastError.message : null },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        if (!parsed) {
          console.warn(`Skipped ${feed.title}: ${lastError ? lastError.message : 'no usable URL'}`);
          continue;
        }
        feedsParsed += 1;
        for (const item of parsed.items || []) {
          await upsertPostFromFeedItem(feed, item);
          totalUpserted += 1;
        }
      }
    } catch (err) {
      console.warn(`Failed refreshing ${feed.title}: ${err.message}`);
    }
  }

  return {
    feedsAttempted: feeds.length,
    feedsParsed,
    totalUpserted
  };
}

function queueRefreshForUser(user, feedIds = null) {
  setImmediate(() => {
    refreshFeeds({ user, feedIds }).catch(err => console.error('Refresh failed', err));
  });
}

module.exports = {
  ensureFeedsSeeded,
  refreshFeeds,
  refreshFeedsForUser: user => refreshFeeds({ user }),
  refreshAllFeeds: () => refreshFeeds({}),
  queueRefreshForUser
};


