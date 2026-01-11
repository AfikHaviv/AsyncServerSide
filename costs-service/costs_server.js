// costs-service/costs_server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const logger = require('./logger');

const costsRouter = require('./routes/costs.routes');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware for all requests
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      service: process.env.SERVICE_NAME,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTimeMs: Date.now() - start,
    }, 'http request');
  });
  next();
});

// Routes
app.use('/api', costsRouter);

// Health check endpoint
app.get('/', (req, res) => {
  res.send(`Hello from ${process.env.SERVICE_NAME} on port ${PORT}`);
});

// Connecting to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    logger.info({ service: process.env.SERVICE_NAME }, 'Connected to MongoDB Atlas');
  })
  .catch(err => {
    console.error('Database connection error:', err.message);
    logger.error({ err: err.message }, 'Database connection error');
  });

// Start the server
app.listen(PORT, () => {
  console.log(`Costs Service is running on port ${PORT}`);
  logger.info({ service: process.env.SERVICE_NAME, status: 'started' }, 'server started');
});
