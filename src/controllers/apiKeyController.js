const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
const { isExpired } = require('../utils/apiKeyUtils');

const KEY_PREFIX = 'aph_live_';

const hashKey = (rawKey) => crypto.createHash('sha256').update(rawKey).digest('hex');

const parseExpiresInDays = (value) => {
  if (value === undefined || value === null) return { days: null };
  if (!Number.isInteger(value) || value <= 0) {
    return { validationError: 'expiresInDays must be a positive integer' };
  }
  return { days: value };
};

const createApiKey = async (req, res, next) => {
  try {
    const { name, expiresInDays } = req.body;
    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Key name is required' });
    }

    const { days, validationError } = parseExpiresInDays(expiresInDays);
    if (validationError) {
      return res.status(400).json({ status: 'error', message: validationError });
    }

    const secret = crypto.randomBytes(32).toString('hex');
    const rawKey = KEY_PREFIX + secret;
    const prefix = KEY_PREFIX + secret.slice(0, 8);
    const keyHash = hashKey(rawKey);

    const expiresAt = days !== null
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await ApiKey.create({
      name,
      prefix,
      keyHash,
      project: req.project._id,
      createdBy: req.user.id,
      expiresAt,
    });

    res.status(201).json({
      status: 'ok',
      data: {
        key: rawKey,
        id: apiKey._id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        project: apiKey.project,
        status: apiKey.status,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getApiKeys = async (req, res, next) => {
  try {
    const keys = await ApiKey.find({ project: req.project._id })
      .select('name prefix project createdBy status expiresAt rateLimit createdAt')
      .sort({ createdAt: -1 });

    const keysWithState = keys.map((k) => ({
      id: k._id,
      name: k.name,
      prefix: k.prefix,
      project: k.project,
      createdBy: k.createdBy,
      status: k.status,
      rateLimit: k.rateLimit,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
      expired: isExpired(k),
    }));

    res.status(200).json({ status: 'ok', data: { keys: keysWithState } });
  } catch (err) {
    next(err);
  }
};

const revokeApiKey = async (req, res, next) => {
  try {
    const apiKey = req.targetApiKey;

    if (apiKey.status === 'revoked') {
      return res.status(400).json({ status: 'error', message: 'API key is already revoked' });
    }

    apiKey.status = 'revoked';
    await apiKey.save();

    res.status(200).json({
      status: 'ok',
      data: {
        id: apiKey._id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        project: apiKey.project,
        status: apiKey.status,
        updatedAt: apiKey.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

const safeKeyObject = (k) => ({
  id:        k._id,
  name:      k.name,
  prefix:    k.prefix,
  project:   k.project,
  createdBy: k.createdBy,
  status:    k.status,
  rateLimit: k.rateLimit,
  expiresAt: k.expiresAt,
  expired:   isExpired(k),
  createdAt: k.createdAt,
  updatedAt: k.updatedAt,
});

const getApiKey = async (req, res, next) => {
  try {
    res.status(200).json({ status: 'ok', data: { apiKey: safeKeyObject(req.targetApiKey) } });
  } catch (err) {
    next(err);
  }
};

const updateApiKey = async (req, res, next) => {
  try {
    const { name, rateLimit, expiresInDays } = req.body;
    const hasName          = name          !== undefined;
    const hasRateLimit     = rateLimit     !== undefined;
    const hasExpiresInDays = 'expiresInDays' in req.body;

    if (!hasName && !hasRateLimit && !hasExpiresInDays) {
      return res.status(400).json({ status: 'error', message: 'No valid fields provided for update' });
    }

    if (hasName) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ status: 'error', message: 'Name must be a non-empty string' });
      }
    }

    if (hasRateLimit) {
      if (!Number.isInteger(rateLimit) || rateLimit < 1) {
        return res.status(400).json({ status: 'error', message: 'rateLimit must be a positive integer' });
      }
    }

    let newExpiresAt;
    if (hasExpiresInDays) {
      const { days, validationError } = parseExpiresInDays(expiresInDays);
      if (validationError) {
        return res.status(400).json({ status: 'error', message: validationError });
      }
      newExpiresAt = days !== null ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
    }

    const apiKey = req.targetApiKey;

    if (hasName)          apiKey.name      = name.trim();
    if (hasRateLimit)     apiKey.rateLimit  = rateLimit;
    if (hasExpiresInDays) apiKey.expiresAt  = newExpiresAt;

    await apiKey.save();

    res.status(200).json({ status: 'ok', data: { apiKey: safeKeyObject(apiKey) } });
  } catch (err) {
    next(err);
  }
};

module.exports = { createApiKey, getApiKeys, revokeApiKey, getApiKey, updateApiKey };
