const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { loadProject, requireProjectRole } = require('../middleware/projectAuthorization');
const { getAnalytics } = require('../controllers/analyticsController');

const router = express.Router();

router.get('/:projectId/analytics', protect, loadProject('projectId'), requireProjectRole('owner', 'developer', 'viewer'), getAnalytics);

module.exports = router;
