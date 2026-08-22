const express = require('express');
const { requireApiKey } = require('../middleware/apiKeyMiddleware');
const { testApiKey } = require('../controllers/apiTestController');

const router = express.Router();

router.get('/test', requireApiKey, testApiKey);

module.exports = router;
