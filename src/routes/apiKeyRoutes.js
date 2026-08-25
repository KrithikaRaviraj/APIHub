const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { loadProject, loadApiKeyProject, requireProjectRole } = require('../middleware/projectAuthorization');
const { createApiKey, getApiKeys, revokeApiKey, getApiKey, updateApiKey } = require('../controllers/apiKeyController');

const router = express.Router();

router.post('/projects/:projectId/keys', protect, loadProject('projectId'), requireProjectRole('owner', 'developer'), createApiKey);
router.get('/projects/:projectId/keys', protect, loadProject('projectId'), requireProjectRole('owner', 'developer'), getApiKeys);
router.patch('/keys/:id/revoke', protect, loadApiKeyProject, requireProjectRole('owner', 'developer'), revokeApiKey);
router.get('/keys/:id', protect, loadApiKeyProject, requireProjectRole('owner', 'developer'), getApiKey);
router.patch('/keys/:id', protect, loadApiKeyProject, requireProjectRole('owner', 'developer'), updateApiKey);

module.exports = router;
