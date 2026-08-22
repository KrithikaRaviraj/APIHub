const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Key name is required'],
      trim: true,
    },
    prefix: {
      type: String,
      required: true,
    },
    keyHash: {
      type: String,
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active',
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

apiKeySchema.index({ prefix: 1 }, { unique: true });

module.exports = mongoose.model('ApiKey', apiKeySchema);
