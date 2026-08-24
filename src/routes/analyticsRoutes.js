const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getAnalytics } = require('../controllers/analyticsController');

const router = express.Router();

router.get('/:projectId/analytics', protect, getAnalytics);

module.exports = router;
