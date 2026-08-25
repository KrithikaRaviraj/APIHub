const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { loadProject, requireProjectRole } = require('../middleware/projectAuthorization');
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const {
  addMember,
  listMembers,
  getMember,
  updateMemberRole,
  removeMember,
} = require('../controllers/projectMemberController');

const router = express.Router();

router.use(protect);

router.post('/', createProject);
router.get('/', getProjects);
router.post('/:projectId/members', loadProject('projectId'), requireProjectRole('owner'), addMember);
router.get('/:projectId/members', loadProject('projectId'), requireProjectRole('owner', 'developer', 'viewer'), listMembers);
router.get('/:projectId/members/:userId', loadProject('projectId'), requireProjectRole('owner', 'developer', 'viewer'), getMember);
router.patch('/:projectId/members/:userId', loadProject('projectId'), requireProjectRole('owner'), updateMemberRole);
router.delete('/:projectId/members/:userId', loadProject('projectId'), requireProjectRole('owner'), removeMember);
router.get('/:id', loadProject('id'), requireProjectRole('owner', 'developer', 'viewer'), getProjectById);
router.put('/:id', loadProject('id'), requireProjectRole('owner'), updateProject);
router.delete('/:id', loadProject('id'), requireProjectRole('owner'), deleteProject);

module.exports = router;
