const Post = require('../models/post');
const Feed = require('../models/feed');

async function listAccessibleFeedIds(user, { scope = 'mixed' } = {}) {
  let query = { enabled: true };

  if (scope === 'global') {
    query.userId = null;
  } else if (scope === 'personal') {
    if (!user) return [];
    query.userId = user._id;
  } else {
    // mixed: shared + personal
    const conditions = [{ userId: null }];
    if (user) conditions.push({ userId: user._id });
    query = { $or: conditions, enabled: true };
  }

  const feeds = await Feed.find(query).select('_id slug userId');

  const preferred = user?.settings?.preferredFeeds;
  if (Array.isArray(preferred) && preferred.length) {
    const preferredSet = new Set(preferred);
    const filtered = feeds.filter(feed => feed.slug && preferredSet.has(feed.slug));
    if (filtered.length) {
      return filtered.map(f => f._id);
    }
  }

  return feeds.map(f => f._id);
}

async function listPosts({ user, page = 1, limit = 20, search, feedSlug }) {
  let scope = 'mixed';
  if (feedSlug === 'global') scope = 'global';
  if (feedSlug === 'all') scope = 'personal';

  let feedIds = await listAccessibleFeedIds(user, { scope });

  if (feedSlug && feedSlug !== 'global' && feedSlug !== 'all') {
    const feed = await Feed.findOne({ slug: feedSlug, enabled: true });
    if (feed && feedIds.some(id => id.toString() === feed._id.toString())) {
      feedIds = [feed._id];
    } else {
      feedIds = [];
    }
  }

  const query = { feedId: { $in: feedIds } };
  if (search) {
    query.$text = { $search: search };
  }
  const skip = (page - 1) * limit;
  const projection = {
    title: 1,
    link: 1,
    summary: 1,
    source: 1,
    publishedAt: 1,
    media: 1,
    feedId: 1,
    userId: 1
  };
  if (search) {
    projection.score = { $meta: 'textScore' };
  }
  const sort = search
    ? { score: { $meta: 'textScore' }, publishedAt: -1, createdAt: -1 }
    : { publishedAt: -1, createdAt: -1 };
  const [items, total] = await Promise.all([
    Post.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(projection)
      .lean(),
    Post.countDocuments(query)
  ]);
  const trimmed = items.map(post => ({
    ...post,
    summary: post.summary ? post.summary.slice(0, 280) : ''
  }));
  return { items: trimmed, total };
}

async function upsertPostFromFeedItem(feed, item) {
  const link = item.link || item.id;
  if (!link) return null;
  if (feed.type === 'youtube' && /\/shorts\//i.test(link)) {
    return null; // skip YouTube Shorts
  }
  const payload = {
    feedId: feed._id,
    userId: feed.userId,
    title: item.title || 'Untitled',
    link,
    summary: item.summary || item.contentSnippet || '',
    content: item['content:encoded'] || item.content || '',
    source: feed.title,
    publishedAt: item.isoDate ? new Date(item.isoDate) : new Date()
  };
  return Post.findOneAndUpdate(
    { feedId: feed._id, link },
    payload,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

module.exports = {
  listPosts,
  upsertPostFromFeedItem,
  listAccessibleFeedIds
};

