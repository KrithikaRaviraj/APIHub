const crypto = require('crypto');
const Project = require('../models/Project');
const ApiKey = require('../models/ApiKey');
const { isExpired } = require('../utils/apiKeyUtils');

const KEY_PREFIX = 'aph_live_';

const hashKey = (rawKey) => crypto.createHash('sha256').update(rawKey).digest('hex');

const verifyProjectOwnership = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { error: 'Project not found', status: 404 };
  if (project.owner.toString() !== userId) return { error: 'Access denied', status: 403 };
  return { project };
};

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

    const { project, error, status } = await verifyProjectOwnership(
      req.params.projectId,
      req.user.id
    );
    if (error) return res.status(status).json({ status: 'error', message: error });

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
      project: project._id,
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
    const { error, status } = await verifyProjectOwnership(req.params.projectId, req.user.id);
    if (error) return res.status(status).json({ status: 'error', message: error });

    const keys = await ApiKey.find({ project: req.params.projectId })
      .select('name prefix project createdBy status expiresAt createdAt')
      .sort({ createdAt: -1 });

    const keysWithState = keys.map((k) => ({
      id: k._id,
      name: k.name,
      prefix: k.prefix,
      project: k.project,
      createdBy: k.createdBy,
      status: k.status,
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
    const apiKey = await ApiKey.findById(req.params.id);
    if (!apiKey) {
      return res.status(404).json({ status: 'error', message: 'API key not found' });
    }

    const { error, status } = await verifyProjectOwnership(
      apiKey.project.toString(),
      req.user.id
    );
    if (error) return res.status(status).json({ status: 'error', message: error });

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

module.exports = { createApiKey, getApiKeys, revokeApiKey };
