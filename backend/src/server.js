const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { env, assertEnv } = require('./config/env');
const { connectMongo } = require('./db/mongo');
const { attachUser } = require('./middleware/auth');
const { refreshAllFeeds } = require('./services/feedRefreshService');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const feedRoutes = require('./routes/feeds');
const postRoutes = require('./routes/posts');
const healthRoutes = require('./routes/health');

async function bootstrap() {
  assertEnv();
  await connectMongo();

  const app = express();
  // Respect proxy headers (e.g., x-forwarded-proto) so req.secure is accurate on Render/other proxies.
  app.set('trust proxy', 1);
  // Normalize CORS origin to avoid trailing-slash mismatches
  const frontendOrigin = (env.frontendOrigin || '*').replace(/\/$/, '');
  app.use(helmet());
  app.use(cors({ origin: frontendOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan('dev'));

  app.use(attachUser);

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/feeds', feedRoutes);
  app.use('/api/posts', postRoutes);
  // Also expose routes without the /api prefix for environments where the
  // frontend or reverse proxy calls the root path directly.
  app.use('/health', healthRoutes);
  app.use('/auth', authRoutes);
  app.use('/admin', adminRoutes);
  app.use('/feeds', feedRoutes);
  app.use('/posts', postRoutes);

  // Fallback error handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  });

  app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
  });

  // Twice-daily background refresh for all enabled feeds.
  const twelveHoursMs = 12 * 60 * 60 * 1000;
  setTimeout(() => {
    refreshAllFeeds().catch(err => console.error('Initial refresh failed', err));
  }, 5_000);
  setInterval(() => {
    refreshAllFeeds().catch(err => console.error('Scheduled refresh failed', err));
  }, twelveHoursMs);
}

bootstrap().catch(err => {
  console.error('Failed to start server', err);
  process.exit(1);
});

