const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const { listFeedsForUser, createFeed, updateFeed, deleteFeed } = require('../services/feedService');
const { queueRefreshForUser } = require('../services/feedRefreshService');
const { resolveYoutubeFeedUrl } = require('../services/youtubeResolver');

const router = express.Router();

const feedSchema = z.object({
  title: z.string(),
  slug: z.string().optional(),
  type: z.enum(['scraped', 'native_rss', 'youtube']),
  rssUrl: z.string().url().optional(),
  config: z.any().optional(),
  enabled: z.boolean().optional(),
  displayOrder: z.number().optional()
});

function ensureScrapeConfig(data) {
  if (data.type !== 'scraped') return data;
  const url = data.config?.url || data.rssUrl;
  if (!url) {
    throw new Error('A URL is required for Link feeds.');
  }
  const baseConfig = {
    url,
    headingSelectors: 'h1, h2, h3',
    maxItems: 100
  };
  return {
    ...data,
    config: { ...baseConfig, ...(data.config || {}) }
  };
}

router.get('/', requireAuth, async (req, res) => {
  const feeds = await listFeedsForUser(req.user, { includeShared: false });
  res.json({ feeds });
});

// Public view: enabled global feeds only
router.get('/public', async (req, res) => {
  const feeds = await listFeedsForUser(null, { includeShared: true });
  res.json({ feeds });
});

// Queue a refresh of the authenticated user's accessible feeds.
router.post('/refresh', requireAuth, async (req, res) => {
  queueRefreshForUser(req.user);
  res.status(202).json({ queued: true });
});

// Allow any signed-in user to create their own feeds; admins can also create shared/global feeds via services.
router.post('/', requireAuth, async (req, res) => {
  try {
    const data = feedSchema.parse(req.body);
    if ((data.type === 'native_rss' || data.type === 'youtube') && !data.rssUrl) {
      return res.status(400).json({ error: 'rssUrl is required for this type' });
    }
    const prepared = data.type === 'scraped' ? ensureScrapeConfig(data) : data;
    if (data.type === 'youtube') {
      const resolved = await resolveYoutubeFeedUrl(prepared.rssUrl);
      if (!resolved) return res.status(400).json({ error: 'Could not resolve YouTube channel or playlist.' });
      prepared.rssUrl = resolved;
    }
    const feed = await createFeed(prepared, req.user);
    // Ensure the creator sees the new feed even if they have preferredFeeds set.
    if (req.user?.settings) {
      const prefs = new Set(req.user.settings.preferredFeeds || []);
      if (feed.slug) {
        prefs.add(feed.slug);
        req.user.settings.preferredFeeds = Array.from(prefs);
        await req.user.save();
      }
    }
    queueRefreshForUser(req.user, [feed._id]);
    res.status(201).json({ feed });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not create feed' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const data = feedSchema.partial().parse(req.body);
    const prepared = data.type === 'scraped' ? ensureScrapeConfig(data) : data;
    if (prepared.type === 'youtube' && prepared.rssUrl) {
      const resolved = await resolveYoutubeFeedUrl(prepared.rssUrl);
      if (!resolved) return res.status(400).json({ error: 'Could not resolve YouTube channel or playlist.' });
      prepared.rssUrl = resolved;
    }
    const feed = await updateFeed(req.params.id, prepared, req.user);
    queueRefreshForUser(req.user, [feed._id]);
    res.json({ feed });
  } catch (err) {
    const status = err.statusCode || 400;
    res.status(status).json({ error: err.message || 'Could not update feed' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await deleteFeed(req.params.id, req.user);
    res.json({ success: true });
  } catch (err) {
    const status = err.statusCode || 400;
    res.status(status).json({ error: err.message || 'Could not delete feed' });
  }
});

module.exports = router;

