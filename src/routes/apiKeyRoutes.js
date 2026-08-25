const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createApiKey, getApiKeys, revokeApiKey, getApiKey, updateApiKey } = require('../controllers/apiKeyController');

const router = express.Router();

router.post('/projects/:projectId/keys', protect, createApiKey);
router.get('/projects/:projectId/keys', protect, getApiKeys);
router.patch('/keys/:id/revoke', protect, revokeApiKey);
router.get('/keys/:id', protect, getApiKey);
router.patch('/keys/:id', protect, updateApiKey);

module.exports = router;
