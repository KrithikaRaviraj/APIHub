const express = require('express');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);

app.use(errorHandler);

module.exports = app;
