// users-service/usres_server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
require('dotenv').config();
const logger = require('./logger');

const usersRoutes = require('./routes/users.routes');

// Loading settings from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // To be able to read JSON sent in the Body
app.use(express.urlencoded({ extended: true }));

// Connecting to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(`Connected to MongoDB Atlas! (Service: ${process.env.SERVICE_NAME})`);
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });

// Logging middleware for all requests
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      service: process.env.SERVICE_NAME, // log the service name
      method: req.method,
      url: req.originalUrl, // originalUrl to get the full path
      statusCode: res.statusCode, // HTTP status code of the response
      responseTimeMs: Date.now() - start,
    }, 'http request');
  });
  next();
});

app.use(usersRoutes);

// simple route to test the server
app.get('/', (req, res) => {
  res.send(`Hello from ${process.env.SERVICE_NAME} on port ${PORT}`);
});

// run the server 
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  logger.info({ service: process.env.SERVICE_NAME }, 'logger test from users-service');
});