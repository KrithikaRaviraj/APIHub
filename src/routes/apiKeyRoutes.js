const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createApiKey, getApiKeys, revokeApiKey } = require('../controllers/apiKeyController');

const router = express.Router();

router.use(protect);

router.post('/projects/:projectId/keys', createApiKey);
router.get('/projects/:projectId/keys', getApiKeys);
router.patch('/keys/:id/revoke', revokeApiKey);

module.exports = router;
