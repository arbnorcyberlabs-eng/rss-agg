const Feed = require('../models/feed');

async function listFeedsForUser(user, { includeShared = true } = {}) {
  const orConditions = [];
  if (includeShared) {
    orConditions.push({ userId: null });
  }
  if (user) orConditions.push({ userId: user._id });
  const query = orConditions.length ? { $or: orConditions } : { userId: user?._id ?? null };
  return Feed.find({ ...query, enabled: true }).sort({ displayOrder: 1, createdAt: -1 });
}

function inferSlug(data) {
  if (data.slug) return data.slug;
  if (data.id) return data.id;
  if (data.title) return data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return undefined;
}

async function createFeed(data, user) {
  const userId = user ? user._id : null;
  if (userId) {
    const count = await Feed.countDocuments({ userId });
    if (count >= 10) {
      const err = new Error('Feed limit reached (10)');
      err.statusCode = 400;
      throw err;
    }
  }
  return Feed.create({
    ...data,
    slug: inferSlug(data),
    userId
  });
}

async function updateFeed(feedId, data, user) {
  const feed = await Feed.findById(feedId);
  if (!feed) throw new Error('Feed not found');

  const isAdmin = !!user?.roles?.includes('admin');
  const isOwnedByUser = !!(feed.userId && user && feed.userId.toString() === user._id.toString());
  const isGlobalFeed = !feed.userId;

  // Admins can edit anything; owners can edit their own; otherwise forbidden.
  if (!isAdmin && !isOwnedByUser && !(isGlobalFeed && isAdmin)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  Object.assign(feed, data);
  if (!feed.slug) feed.slug = inferSlug(feed);
  await feed.save();
  return feed;
}

async function deleteFeed(feedId, user) {
  const feed = await Feed.findById(feedId);
  if (!feed) return;
  const isAdmin = !!user?.roles?.includes('admin');
  const isOwnedByUser = !!(feed.userId && user && feed.userId.toString() === user._id.toString());
  const isGlobalFeed = !feed.userId;
  if (!isAdmin && !isOwnedByUser && !(isGlobalFeed && isAdmin)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }
  await Feed.deleteOne({ _id: feedId });
}

async function listAllFeeds() {
  return Feed.find({})
    .populate('userId', 'email displayName')
    .sort({ createdAt: -1 });
}

module.exports = {
  listFeedsForUser,
  createFeed,
  updateFeed,
  deleteFeed,
  listAllFeeds
};

