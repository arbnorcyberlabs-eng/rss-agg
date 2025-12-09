const Parser = require('rss-parser');
const Feed = require('../models/feed');
const { upsertPostFromFeedItem } = require('./postService');
const { listFeedsForUser } = require('./feedService');
const { scrapeFeed } = require('./scrapeService');

const parser = new Parser();

// Default public feeds; keep seeded for all users.
const defaultFeeds = [
  {
    slug: 'hackernews',
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
  const feeds = await fetchFeedsForRefresh(user, feedIds);
  let totalUpserted = 0;
  let feedsParsed = 0;

  for (const feed of feeds) {
    try {
      if (feed.type === 'scraped') {
        const { items } = await scrapeFeed(feed);
        if (!items || !items.length) continue;
        feedsParsed += 1;
        for (const item of items) {
          await upsertPostFromFeedItem(feed, item);
          totalUpserted += 1;
        }
      } else {
        const { parsed, lastError } = await parseWithFallback(feed);
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


