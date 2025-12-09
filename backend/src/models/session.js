const { mongoose } = require('../db/mongo');

const sessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['session', 'refresh', 'verification'], default: 'session' },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String },
    ipHash: { type: String }
  },
  { timestamps: true }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);

