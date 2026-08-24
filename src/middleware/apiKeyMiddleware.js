const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
const { isUsable } = require('../utils/apiKeyUtils');

// Expected format: aph_live_ followed by exactly 64 lowercase hex characters
const API_KEY_REGEX = /^aph_live_[a-f0-9]{64}$/;

// Generic message used for every failure — never reveals whether a key exists
const INVALID = { status: 'error', message: 'Invalid API key' };

const requireApiKey = async (req, res, next) => {
  try {
    const rawKey = req.headers['x-api-key'];

    if (!rawKey) {
      return res.status(401).json(INVALID);
    }

    if (!API_KEY_REGEX.test(rawKey)) {
      return res.status(401).json(INVALID);
    }

    // prefix = "aph_live_" (9 chars) + first 8 chars of the 64-char hex secret
    const prefix = rawKey.slice(0, 17);

    // Single O(log n) indexed lookup — no full collection scan
    const apiKeyDoc = await ApiKey.findOne({ prefix });
    if (!apiKeyDoc) {
      return res.status(401).json(INVALID);
    }

    // Hash the incoming key and compare using timing-safe equality
    const incomingHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const storedHash = apiKeyDoc.keyHash;

    const a = Buffer.from(incomingHash, 'hex');
    const b = Buffer.from(storedHash, 'hex');

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json(INVALID);
    }

    // Reject revoked or expired keys
    if (!isUsable(apiKeyDoc)) {
      return res.status(401).json(INVALID);
    }

    // Attach only safe metadata — never the raw key or keyHash
    req.apiKey = {
      id:        apiKeyDoc._id,
      projectId: apiKeyDoc.project,
      createdBy: apiKeyDoc.createdBy,
      rateLimit: apiKeyDoc.rateLimit,
    };

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireApiKey };
