// logger.js
const pino = require('pino');
// Load environment variables
require('dotenv').config();

let transport;

// Check if running in a test environment
if (process.env.NODE_ENV === 'test') {
  // In tests, log to console only to avoid MongoDB connection errors
  transport = pino.transport({
    target: 'pino/file',
    options: { destination: 1 } // 1 = stdout
  });
} else {
  // In normal mode (development/production), connect to MongoDB
  if (!process.env.MONGODB_URI) {
    console.error(' FATAL ERROR: MONGODB_URI is undefined in logger.js. Check your .env file!');
    process.exit(1);
  }

  transport = pino.transport({
    target: 'pino-mongodb',
    options: {
      uri: process.env.MONGODB_URI,
      collection: 'logs',
    }
  });
}

// Create and export the logger
module.exports = pino({
  level: 'info',
  timestamp: () => `,"time":"${new Date().toISOString()}"`
}, transport);