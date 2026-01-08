const pino = require('pino');

const transport = pino.transport({
  target: 'pino-mongodb',
  level: 'info',
  options: {
    uri: process.env.MONGODB_URI,
    database: 'cost-manager-db',
    collection: 'logs'
  }
});

const logger = pino(
  {
    timestamp: () => `,"time":"${new Date().toISOString()}"`
  },
  transport
);

module.exports = logger;