// tests/logs.test.js
const request = require('supertest');
const express = require('express');
const logsRouter = require('../routes/logs.routes'); // Make sure the path is correct based on your file structure

// Mock Mongoose connection and collection
// We simulate the chain: mongoose.connection.db.collection('logs').find({}).toArray()
jest.mock('mongoose', () => {
  return {
    connection: {
      db: {
        collection: jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([
              { level: 'info', message: 'Test log message 1', time: new Date() },
              { level: 'error', message: 'Test log message 2', time: new Date() }
            ])
          })
        })
      }
    }
  };
});

// Set up Express app for testing
const app = express();
app.use('/api', logsRouter);

// Tests
describe('Logs Service Tests', () => {

  test('GET /api/logs should return a list of logs', async () => {
    const res = await request(app).get('/api/logs');

    // Expect HTTP 200 OK
    expect(res.statusCode).toBe(200);

    // Expect the body to be an array
    expect(Array.isArray(res.body)).toBe(true);

    // Expect the array to contain the mocked data (length 2)
    expect(res.body.length).toBe(2);
    expect(res.body[0].message).toBe('Test log message 1');
  });
});