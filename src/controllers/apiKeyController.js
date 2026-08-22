const crypto = require('crypto');
const Project = require('../models/Project');
const ApiKey = require('../models/ApiKey');

const KEY_PREFIX = 'aph_live_';

const hashKey = (rawKey) => crypto.createHash('sha256').update(rawKey).digest('hex');

const verifyProjectOwnership = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { error: 'Project not found', status: 404 };
  if (project.owner.toString() !== userId) return { error: 'Access denied', status: 403 };
  return { project };
};

const createApiKey = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Key name is required' });
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

    const apiKey = await ApiKey.create({
      name,
      prefix,
      keyHash,
      project: project._id,
      createdBy: req.user.id,
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
      .select('-keyHash')
      .sort({ createdAt: -1 });

    res.status(200).json({ status: 'ok', data: { keys } });
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
