// logs-service/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); 
const logger = require('./logger');

// 1. Import the Logs Route
const logsRouter = require('./routes/logs');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      service: process.env.SERVICE_NAME,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTimeMs: Date.now() - start
    }, 'http request');
  });
  next();
});

// Connection to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(`✅ Connected to MongoDB Atlas! (Service: ${process.env.SERVICE_NAME})`);
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
  });

// 2. Use the Logs Route
// This creates the endpoint: http://localhost:3004/api/logs
app.use('/api', logsRouter);

// Simple health check route
app.get('/', (req, res) => {
  res.send(`Hello from ${process.env.SERVICE_NAME}`);
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  logger.info({ service: process.env.SERVICE_NAME }, 'Server started');
});