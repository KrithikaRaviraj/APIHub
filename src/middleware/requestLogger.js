const ApiRequestLog = require('../models/ApiRequestLog');

const requestLogger = (req, res, next) => {
  // Only log requests that have successfully passed API key authentication
  if (!req.apiKey) {
    return next();
  }

  const start = process.hrtime.bigint();

  res.on('finish', async () => {
    try {
      const end = process.hrtime.bigint();
      const responseTimeMs = Number(end - start) / 1_000_000;

      await ApiRequestLog.create({
        project: req.apiKey.projectId,
        apiKey: req.apiKey.id,
        method: req.method,
        endpoint: req.path,
        statusCode: res.statusCode,
        responseTime: responseTimeMs,
        ipAddress: req.ip,
      });
    } catch (err) {
      // Logging failure must never affect the completed API response
      console.error('Failed to save API request log:', err.message);
    }
  });

  next();
};

module.exports = { requestLogger };
