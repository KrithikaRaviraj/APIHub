const express = require('express');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/healthRoutes');

const app = express();

app.use(express.json());

app.use('/api', healthRoutes);

app.use(errorHandler);

module.exports = app;
