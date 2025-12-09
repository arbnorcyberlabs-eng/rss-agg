const { mongoose } = require('../db/mongo');

const feedSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    slug: { type: String, index: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['scraped', 'native_rss', 'youtube'], required: true },
    rssUrl: { type: String },
    config: { type: mongoose.Schema.Types.Mixed },
    enabled: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

feedSchema.index({ userId: 1, displayOrder: 1 });
feedSchema.index({ slug: 1, userId: 1 }, { unique: false });

module.exports = mongoose.model('Feed', feedSchema);

