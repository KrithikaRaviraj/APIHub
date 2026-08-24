const express = require('express');
const { requireApiKey } = require('../middleware/apiKeyMiddleware');
const { requestLogger } = require('../middleware/requestLogger');
const { testApiKey } = require('../controllers/apiTestController');

const router = express.Router();

router.get('/test', requireApiKey, requestLogger, testApiKey);

module.exports = router;
