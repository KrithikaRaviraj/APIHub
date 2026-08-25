const mongoose = require('mongoose');
const User = require('../models/User');
const ProjectMember = require('../models/ProjectMember');

const MEMBER_ROLES = ['developer', 'viewer'];

const safeUser = (user) => ({ id: user._id, name: user.name, email: user.email });
const safeMember = (member) => ({
  id: member._id,
  project: member.project,
  user: safeUser(member.user),
  role: member.role,
  createdAt: member.createdAt,
  updatedAt: member.updatedAt,
});

const ownerMember = (project, user) => ({
  id: null,
  project: project._id,
  user: safeUser(user),
  role: 'owner',
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
});

const validMemberRole = (role) => MEMBER_ROLES.includes(role);

const addMember = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid user ID' });
    }
    if (!validMemberRole(role)) {
      return res.status(400).json({ status: 'error', message: 'Role must be developer or viewer' });
    }
    if (req.project.owner.toString() === userId) {
      return res.status(400).json({ status: 'error', message: 'Project owner cannot be added as a member' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

    const existing = await ProjectMember.exists({ project: req.project._id, user: user._id });
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'User is already a project member' });
    }

    try {
      const member = await ProjectMember.create({ project: req.project._id, user: user._id, role });
      await member.populate('user', 'name email');
      return res.status(201).json({ status: 'ok', data: { member: safeMember(member) } });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ status: 'error', message: 'User is already a project member' });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

const listMembers = async (req, res, next) => {
  try {
    const [owner, members] = await Promise.all([
      User.findById(req.project.owner),
      ProjectMember.find({ project: req.project._id }).populate('user', 'name email').sort({ createdAt: 1 }),
    ]);
    const safeMembers = members.filter((member) => member.user).map(safeMember);
    if (owner) safeMembers.unshift(ownerMember(req.project, owner));
    res.status(200).json({ status: 'ok', data: { members: safeMembers } });
  } catch (err) {
    next(err);
  }
};

const getMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid user ID' });
    }
    if (req.project.owner.toString() === userId) {
      const owner = await User.findById(userId);
      if (!owner) return res.status(404).json({ status: 'error', message: 'User not found' });
      return res.status(200).json({ status: 'ok', data: { member: ownerMember(req.project, owner) } });
    }

    const member = await ProjectMember.findOne({ project: req.project._id, user: userId }).populate('user', 'name email');
    if (!member || !member.user) return res.status(404).json({ status: 'error', message: 'Project member not found' });
    res.status(200).json({ status: 'ok', data: { member: safeMember(member) } });
  } catch (err) {
    next(err);
  }
};

const updateMemberRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid user ID' });
    }
    if (!validMemberRole(role)) {
      return res.status(400).json({ status: 'error', message: 'Role must be developer or viewer' });
    }
    if (req.project.owner.toString() === userId) {
      return res.status(400).json({ status: 'error', message: 'Project owner role cannot be changed' });
    }

    const member = await ProjectMember.findOne({ project: req.project._id, user: userId });
    if (!member) return res.status(404).json({ status: 'error', message: 'Project member not found' });
    member.role = role;
    await member.save();
    await member.populate('user', 'name email');
    res.status(200).json({ status: 'ok', data: { member: safeMember(member) } });
  } catch (err) {
    next(err);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid user ID' });
    }
    if (req.project.owner.toString() === userId) {
      return res.status(400).json({ status: 'error', message: 'Project owner cannot be removed' });
    }

    const member = await ProjectMember.findOneAndDelete({ project: req.project._id, user: userId });
    if (!member) return res.status(404).json({ status: 'error', message: 'Project member not found' });
    res.status(200).json({ status: 'ok', message: 'Project member removed' });
  } catch (err) {
    next(err);
  }
};

module.exports = { addMember, listMembers, getMember, updateMemberRole, removeMember };
