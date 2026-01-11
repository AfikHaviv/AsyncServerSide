// admin-service/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const logger = require('./logger');

// Import the About Route
const aboutRouter = require('./routes/about.routes');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    // This saves the log to MongoDB
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
    console.log(`Connected to MongoDB Atlas! (Service: ${process.env.SERVICE_NAME})`);
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });

// 3. Use the About Route
// creates the endpoint 
app.use('/api', aboutRouter);

// Simple health check route
app.get('/', (req, res) => {
  res.send(`Hello from ${process.env.SERVICE_NAME}`);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  logger.info({ service: process.env.SERVICE_NAME }, 'Server started');
});