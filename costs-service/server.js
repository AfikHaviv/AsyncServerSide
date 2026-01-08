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

// Middleware
app.use(cors());
app.use(express.json()); // כדי שנוכל לקרוא JSON שנשלח ב-Body
app.use(express.urlencoded({ extended: true }));

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
  logger.info({ service: process.env.SERVICE_NAME }, 'logger test from costs-service');
});