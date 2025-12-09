const { connectMongo } = require('../db/mongo');
const { ensureFeedsSeeded, refreshAllFeeds } = require('../services/feedRefreshService');

async function ingestFeeds() {
  await connectMongo();
  await ensureFeedsSeeded();
  const result = await refreshAllFeeds();
  return result.totalUpserted;
}

if (require.main === module) {
  ingestFeeds()
    .then(total => {
      console.log(`Ingest complete. Upserted ${total} items.`);
      process.exit(0);
    })
    .catch(err => {
      console.error('Ingest failed', err);
      process.exit(1);
    });
}

module.exports = { ingestFeeds };

