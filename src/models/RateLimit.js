const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema({
  apiKey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApiKey',
    required: true,
  },
  windowStart: {
    type: Date,
    required: true,
  },
  count: {
    type: Number,
    required: true,
    default: 0,
  },
});

// Atomic upsert target — must be unique per key per window
rateLimitSchema.index({ apiKey: 1, windowStart: 1 }, { unique: true });

// Auto-remove stale documents after 2 windows have elapsed.
// RATE_LIMIT_WINDOW_SECONDS is read at startup; fall back to 60.
// expireAfterSeconds is set to 2× the window so the current window
// and the immediately preceding window are always retained.
const windowSeconds = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS, 10) || 60;
rateLimitSchema.index({ windowStart: 1 }, { expireAfterSeconds: windowSeconds * 2 });

module.exports = mongoose.model('RateLimit', rateLimitSchema);
