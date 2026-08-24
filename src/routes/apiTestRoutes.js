const express = require('express');
const { requireApiKey } = require('../middleware/apiKeyMiddleware');
const { rateLimiter } = require('../middleware/rateLimiter');
const { requestLogger } = require('../middleware/requestLogger');
const { testApiKey } = require('../controllers/apiTestController');

const router = express.Router();

router.get('/test', requireApiKey, requestLogger, rateLimiter, testApiKey);

module.exports = router;
