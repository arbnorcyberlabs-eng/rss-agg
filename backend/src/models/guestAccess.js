const { mongoose } = require('../db/mongo');

const guestAccessSchema = new mongoose.Schema(
  {
    anonKey: { type: String, required: true, unique: true },
    windowStart: { type: Date, required: true },
    totalCount: { type: Number, default: 0 },
    feedCounts: { type: Map, of: Number, default: {} },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

guestAccessSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('GuestAccess', guestAccessSchema);

