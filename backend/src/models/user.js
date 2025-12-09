const { mongoose } = require('../db/mongo');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String },
    roles: { type: [String], default: ['user'] },
    emailVerified: { type: Boolean, default: false },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

