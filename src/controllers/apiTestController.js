const testApiKey = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API key authenticated',
    data: {
      apiKeyId: req.apiKey.id,
      projectId: req.apiKey.projectId,
    },
  });
};

module.exports = { testApiKey };
