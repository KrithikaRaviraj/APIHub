const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');

const createProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Project name is required' });
    }

    const project = await Project.create({
      name,
      description,
      owner: req.user.id,
    });

    res.status(201).json({ status: 'ok', data: { project } });
  } catch (err) {
    next(err);
  }
};

const getProjects = async (req, res, next) => {
  try {
    const memberProjectIds = await ProjectMember.find({ user: req.user.id }).distinct('project');
    const projects = await Project.find({
      $or: [{ owner: req.user.id }, { _id: { $in: memberProjectIds } }],
    }).sort({ createdAt: -1 });
    res.status(200).json({ status: 'ok', data: { projects } });
  } catch (err) {
    next(err);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    res.status(200).json({ status: 'ok', data: { project: req.project } });
  } catch (err) {
    next(err);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const project = req.project;

    const { name, description } = req.body;
    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;

    await project.save();

    res.status(200).json({ status: 'ok', data: { project } });
  } catch (err) {
    next(err);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    await req.project.deleteOne();

    res.status(200).json({ status: 'ok', message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createProject, getProjects, getProjectById, updateProject, deleteProject };
