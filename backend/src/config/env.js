const dotenv = require('dotenv');

dotenv.config();

const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: process.env.MONGODB_URI,
  sessionSecret: process.env.SESSION_SECRET,
  jwtSecret: process.env.JWT_SECRET,
  tokenTtlHours: parseInt(process.env.TOKEN_TTL_HOURS || '24', 10),
  refreshTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10),
  guestPostLimit: parseInt(process.env.GUEST_POST_LIMIT || '20', 10),
  guestWindowMinutes: parseInt(process.env.GUEST_WINDOW_MINUTES || '60', 10),
  frontendOrigin: process.env.FRONTEND_ORIGIN || '*',
  legacyFeedBase: process.env.LEGACY_FEED_BASE,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
  adminGoogleEmail: process.env.ADMIN_GOOGLE_EMAIL,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER,
  emailVerifyExpiryHours: parseInt(process.env.EMAIL_VERIFY_EXPIRY_HOURS || '24', 10)
};

function assertEnv() {
  if (!env.mongoUri) throw new Error('MONGODB_URI is required');
  if (!env.sessionSecret) throw new Error('SESSION_SECRET is required');
  if (!env.jwtSecret) throw new Error('JWT_SECRET is required');
  if (!env.googleClientId) throw new Error('GOOGLE_CLIENT_ID is required');
  if (!env.googleClientSecret) throw new Error('GOOGLE_CLIENT_SECRET is required');
  if (!env.googleRedirectUri) throw new Error('GOOGLE_REDIRECT_URI is required');
  if (!env.adminGoogleEmail) throw new Error('ADMIN_GOOGLE_EMAIL is required');
  if (!env.smtpHost) throw new Error('SMTP_HOST is required');
  if (!env.smtpUser) throw new Error('SMTP_USER is required');
  if (!env.smtpPass) throw new Error('SMTP_PASS is required');
}

module.exports = { env, assertEnv };

