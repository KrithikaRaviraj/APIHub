const RateLimit = require('../models/RateLimit');

const windowMs = () =>
  (parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS, 10) || 60) * 1000;

const currentWindowStart = (wMs) =>
  new Date(Math.floor(Date.now() / wMs) * wMs);

const atomicIncrement = async (apiKeyId, windowStart) => {
  return RateLimit.findOneAndUpdate(
    { apiKey: apiKeyId, windowStart },
    { $inc: { count: 1 }, $setOnInsert: { windowStart } },
    { upsert: true, new: true }
  );
};

const rateLimiter = async (req, res, next) => {
  try {
    const wMs       = windowMs();
    const winStart  = currentWindowStart(wMs);
    const resetAt   = new Date(winStart.getTime() + wMs);
    const limit     = req.apiKey.rateLimit;

    let doc;
    try {
      doc = await atomicIncrement(req.apiKey.id, winStart);
    } catch (err) {
      // Duplicate-key error: two concurrent requests raced to create the same
      // window document. Retry once — the document now exists so the upsert
      // will increment it atomically.
      if (err.code === 11000) {
        doc = await atomicIncrement(req.apiKey.id, winStart);
      } else {
        throw err;
      }
    }

    const count     = doc.count;
    const remaining = Math.max(0, limit - count);

    res.set('X-RateLimit-Limit',     String(limit));
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Reset',     String(Math.floor(resetAt.getTime() / 1000)));

    if (count > limit) {
      return res.status(429).json({
        status:  'error',
        message: `Rate limit exceeded. Try again after ${resetAt.toISOString()}.`,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { rateLimiter };
