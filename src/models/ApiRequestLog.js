const mongoose = require('mongoose');

const apiRequestLogSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    apiKey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApiKey',
      required: true,
    },
    method: {
      type: String,
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    responseTime: {
      type: Number,
      required: true,
    },
    ipAddress: {
      type: String,
    },
  },
  { timestamps: true }
);

// Supports: "all requests for project X, newest first"
apiRequestLogSchema.index({ project: 1, createdAt: -1 });

// Supports: "all requests for API key Y, newest first"
apiRequestLogSchema.index({ apiKey: 1, createdAt: -1 });

module.exports = mongoose.model('ApiRequestLog', apiRequestLogSchema);
