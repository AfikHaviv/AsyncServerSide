// tests/logs.test.js
const request = require('supertest');
const express = require('express');

const logsRouter = require('../routes/logs.routes');

// Mock mongoose so tests do not touch real MongoDB
jest.mock('mongoose', () => ({
  connection: {
    db: {
      collection: jest.fn()
    }
  }
}));

const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Mount routes exactly like server.js (base "/api")
app.use('/api', logsRouter);

describe('Logs Service Tests - GET /api/logs', () => {

  // Reset mocks before each test to keep them independent
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/logs should return 200 and an array', async () => {
    // Prepare a fake logs list from DB
    const fakeLogs = [
      { _id: '1', service: 'costs-service', msg: 'hello' },
      { _id: '2', service: 'users-service', msg: 'world' }
    ];

    // Mock collection.find().toArray() chain
    const toArrayMock = jest.fn().mockResolvedValue(fakeLogs);
    const findMock = jest.fn().mockReturnValue({ toArray: toArrayMock });

    mongoose.connection.db.collection.mockReturnValue({ find: findMock });

    const res = await request(app).get('/api/logs');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  test('GET /api/logs should return 200 and empty array when no logs exist', async () => {
    // Mock DB returning empty list
    const toArrayMock = jest.fn().mockResolvedValue([]);
    const findMock = jest.fn().mockReturnValue({ toArray: toArrayMock });

    mongoose.connection.db.collection.mockReturnValue({ find: findMock });

    const res = await request(app).get('/api/logs');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual([]);
  });

  test('GET /api/logs should return 500 with id and message on DB error', async () => {
    // Mock DB failure
    const toArrayMock = jest.fn().mockRejectedValue(new Error('DB fail'));
    const findMock = jest.fn().mockReturnValue({ toArray: toArrayMock });

    mongoose.connection.db.collection.mockReturnValue({ find: findMock });

    const res = await request(app).get('/api/logs');

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('id', 'LOGS_FETCH_ERROR');
    expect(res.body).toHaveProperty('message');
  });

});
