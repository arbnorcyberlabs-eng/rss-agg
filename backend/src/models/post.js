const { mongoose } = require('../db/mongo');

const mediaSchema = new mongoose.Schema(
  {
    thumbnail: String,
    views: Number,
    type: String
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    feedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Feed', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    title: { type: String, required: true },
    link: { type: String, required: true },
    summary: { type: String },
    content: { type: String },
    source: { type: String },
    publishedAt: { type: Date, index: true },
    media: mediaSchema,
    raw: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

postSchema.index({ feedId: 1, link: 1 }, { unique: true });
postSchema.index({ publishedAt: -1 });

module.exports = mongoose.model('Post', postSchema);

