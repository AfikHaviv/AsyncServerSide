// server.js - Template for all services
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
require('dotenv').config();
const logger = require('./logger');


// טעינת הגדרות מקובץ .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  console.log('MIDDLEWARE HIT', req.method, req.originalUrl); // זמני לבדיקה
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


// התחברות ל-MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(`Connected to MongoDB Atlas! (Service: ${process.env.SERVICE_NAME})`);
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });

// ראוט בדיקה פשוט
app.get('/', (req, res) => {
  res.send(`Hello from ${process.env.SERVICE_NAME} on port ${PORT}`);
});

// הרצת השרת
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  logger.info({ service: process.env.SERVICE_NAME }, 'logger test from admin-service');
});

