// Reset database collections and seed default feeds (Hacker News + Economy Media).
// Usage: from backend/, ensure MONGODB_URI is set, then run:
//   node scripts/reset-and-seed.js

const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Set MONGODB_URI before running this script.');
  process.exit(1);
}

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('Connected. Clearing collections...');
  await Promise.all([
    db.collection('users').deleteMany({}),
    db.collection('sessions').deleteMany({}),
    db.collection('posts').deleteMany({}),
    db.collection('guestaccesses').deleteMany({}),
    db.collection('feeds').deleteMany({})
  ]);

  console.log('Seeding default feeds...');
  const now = new Date();
  await db.collection('feeds').insertMany([
    {
      slug: 'hackernews',
      title: 'Hacker News',
      type: 'native_rss',
      rssUrl: 'https://hnrss.org/frontpage',
      config: null,
      enabled: true,
      displayOrder: 1,
      userId: null,
      createdAt: now,
      updatedAt: now
    },
    {
      slug: 'economymedia',
      title: 'Economy Media',
      type: 'youtube',
      rssUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCc8q4B1bj-668LMHyNXnTxQ',
      config: null,
      enabled: true,
      displayOrder: 2,
      userId: null,
      createdAt: now,
      updatedAt: now
    }
  ]);

  console.log('Reset complete; seeded hackernews + economymedia.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

