const mongoose = require('mongoose');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const ApiKey = require('../models/ApiKey');

const accessDenied = (res) => res.status(403).json({ status: 'error', message: 'Access denied' });

const loadProject = (paramName) => async (req, res, next) => {
  try {
    const projectId = req.params[paramName];
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid project ID' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ status: 'error', message: 'Project not found' });

    req.project = project;
    next();
  } catch (err) {
    next(err);
  }
};

const loadApiKeyProject = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid API key ID' });
    }

    const apiKey = await ApiKey.findById(req.params.id);
    if (!apiKey) return res.status(404).json({ status: 'error', message: 'API key not found' });

    const project = await Project.findById(apiKey.project);
    if (!project) return res.status(404).json({ status: 'error', message: 'Project not found' });

    req.targetApiKey = apiKey;
    req.project = project;
    next();
  } catch (err) {
    next(err);
  }
};

const requireProjectRole = (...roles) => async (req, res, next) => {
  try {
    if (!req.project) return accessDenied(res);

    const userId = req.user.id;
    if (req.project.owner.toString() === userId) {
      req.projectRole = 'owner';
    } else {
      const membership = await ProjectMember.findOne({ project: req.project._id, user: userId });
      if (!membership) return accessDenied(res);
      req.projectRole = membership.role;
    }

    if (!roles.includes(req.projectRole)) return accessDenied(res);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { loadProject, loadApiKeyProject, requireProjectRole };
