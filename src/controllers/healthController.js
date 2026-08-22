const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'APIHub is running',
    timestamp: new Date().toISOString(),
  });
};

module.exports = { healthCheck };
