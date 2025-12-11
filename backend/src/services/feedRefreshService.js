const Parser = require('rss-parser');
const Feed = require('../models/feed');
const { upsertPostFromFeedItem } = require('./postService');
const { listFeedsForUser } = require('./feedService');
const { scrapeFeed } = require('./scrapeService');
const { resolveYoutubeFeedUrl } = require('./youtubeResolver');

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; rss-agg/1.0; +https://example.com)',
  Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8'
};

const parser = new Parser({
  requestOptions: {
    headers: DEFAULT_HEADERS,
    timeout: 15000
  }
});

// Default public feeds; keep seeded for all users.
const defaultFeeds = [
  // Tech/news
  {
    slug: 'hacker-news',
    title: 'Hacker News',
    type: 'native_rss',
    rssUrl: 'https://hnrss.org/frontpage',
    config: null,
    enabled: true,
    displayOrder: 1
  },
  {
    slug: 'arxiv-cs-ai',
    title: 'arXiv CS: AI',
    type: 'native_rss',
    rssUrl: 'https://export.arxiv.org/rss/cs.AI',
    config: null,
    enabled: true,
    displayOrder: 2
  },
  {
    slug: 'stratechery',
    title: 'Stratechery (free)',
    type: 'native_rss',
    rssUrl: 'https://stratechery.com/feed/',
    config: null,
    enabled: true,
    displayOrder: 3
  },
  // Podcasts / longform
  {
    slug: 'lex-fridman',
    title: 'Lex Fridman Podcast',
    type: 'native_rss',
    rssUrl: 'https://lexfridman.com/feed/podcast/',
    config: null,
    enabled: true,
    displayOrder: 4
  },
  {
    slug: 'dwarkesh-patel',
    title: 'Dwarkesh Podcast (YouTube)',
    type: 'youtube',
    rssUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC9DThZ_wHc6ySsiQxzLXYxQ',
    config: null,
    enabled: true,
    displayOrder: 5
  }
];

async function ensureFeedsSeeded() {
  for (const seed of defaultFeeds) {
    // Migrate legacy slugs (e.g., "hackernews" -> "hacker-news") for global feeds.
    const legacyByTitle = await Feed.findOne({ title: seed.title, userId: null });
    if (legacyByTitle && legacyByTitle.slug !== seed.slug) {
      legacyByTitle.slug = seed.slug;
      legacyByTitle.rssUrl = seed.rssUrl;
      legacyByTitle.type = seed.type;
      await legacyByTitle.save();
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

  async function fetchAndParse(url) {
    // First attempt: parser.parseURL with headers (configured in parser above).
    try {
      return await parser.parseURL(url);
    } catch (primaryErr) {
      lastError = primaryErr;
      // Fallback: manual fetch with permissive headers, then parse string.
      try {
        const res = await fetch(url, { headers: DEFAULT_HEADERS, redirect: 'follow' });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const text = await res.text();
        return await parser.parseString(text);
      } catch (secondaryErr) {
        lastError = secondaryErr;
        throw secondaryErr;
      }
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = await fetchAndParse(candidate.url);
      return { parsed, usedUrl: candidate.url };
    } catch (err) {
      lastError = err;
      console.warn(`Failed parsing (${candidate.label}) ${feed.title} (${candidate.url}): ${err.message}`);
    }
  }
  return { parsed: null, usedUrl: null, lastError };
}

async function recoverYoutubeFeed(feed) {
  if (!feed?.rssUrl) return null;
  const url = feed.rssUrl;
  // If already a feed URL, attempt to resolve again from a channel/playlist handle.
  if (/feeds\/videos\.xml/.test(url)) {
    // Try to derive a channel page and re-resolve (handles channel ID rotations or legacy handles).
    const channelIdMatch = url.match(/channel_id=([^&]+)/i);
    const playlistIdMatch = url.match(/playlist_id=([^&]+)/i);
    const candidatePages = [];
    if (channelIdMatch?.[1]) candidatePages.push(`https://www.youtube.com/channel/${channelIdMatch[1]}`);
    if (playlistIdMatch?.[1]) candidatePages.push(`https://www.youtube.com/playlist?list=${playlistIdMatch[1]}`);
    // As a fallback, try the existing URL directly via resolver.
    candidatePages.push(url);

    for (const pageUrl of candidatePages) {
      try {
        const resolved = await resolveYoutubeFeedUrl(pageUrl);
        if (resolved && resolved !== feed.rssUrl) {
          feed.rssUrl = resolved;
          await feed.save();
          return resolved;
        }
      } catch {
        continue;
      }
    }
  }
  return null;
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
        let { parsed, lastError, usedUrl } = await parseWithFallback(feed);
        // For YouTube feeds that failed, try to re-resolve and parse again.
        if (!parsed && feed.type === 'youtube') {
          const recovered = await recoverYoutubeFeed(feed);
          if (recovered) {
            const retry = await parseWithFallback(feed);
            parsed = retry.parsed;
            lastError = retry.lastError;
            usedUrl = retry.usedUrl;
          }
        }
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


