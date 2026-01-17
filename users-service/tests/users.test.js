// tests/users.test.js
const request = require('supertest');
const express = require('express');

const usersRouter = require('../routes/users.routes');
const User = require('../models/users.models');

/*
  Mock the User model and mongoose aggregation so tests are isolated
  and do not require a real MongoDB connection.
*/
jest.mock('../models/users.models', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn()
}));

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

// The router already contains "/api/..." paths inside it
app.use(usersRouter);

describe('Users Service Tests (minimal but detailed)', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/add returns 400 with {id,message} when id is missing', async () => {
    const res = await request(app).post('/api/add').send({
      first_name: 'A',
      last_name: 'B',
      birthday: '1990-01-01'
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('message');
  });

  test('POST /api/add returns 400 when birthday is invalid', async () => {
    const res = await request(app).post('/api/add').send({
      id: 123,
      first_name: 'A',
      last_name: 'B',
      birthday: 'not-a-date'
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('INVALID_BIRTHDAY');
  });

  test('POST /api/add returns 409 when user already exists', async () => {
    User.findOne.mockReturnValue({ lean: () => ({ id: 123 }) });

    const res = await request(app).post('/api/add').send({
      id: 123,
      first_name: 'A',
      last_name: 'B',
      birthday: '1990-01-01'
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.id).toBe('USER_EXISTS');
  });

  test('POST /api/add returns 201 and created user when valid', async () => {
    // No existing user
    User.findOne.mockReturnValue({ lean: () => null });

    // Create success
    User.create.mockResolvedValue({
      id: 123,
      first_name: 'A',
      last_name: 'B',
      birthday: new Date('1990-01-01')
    });

    const res = await request(app).post('/api/add').send({
      id: 123,
      first_name: '  A ',
      last_name: ' B  ',
      birthday: '1990-01-01'
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id', 123);
    expect(res.body).toHaveProperty('first_name');
    expect(res.body).toHaveProperty('last_name');
    expect(res.body).toHaveProperty('birthday');
  });

  test('GET /api/users returns 200 and an array', async () => {
    User.find.mockReturnValue({
      lean: () => [
        { id: 1, first_name: 'A', last_name: 'B', birthday: new Date() }
      ]
    });

    const res = await request(app).get('/api/users');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  test('GET /api/users/:id returns 200 and total from aggregation', async () => {
    // User exists
    User.findOne.mockReturnValue({
      lean: () => ({ id: 123, first_name: 'Mosh', last_name: 'Israeli' })
    });

    // Mock aggregation returning total=100
    const toArrayMock = jest.fn().mockResolvedValue([{ total: 100 }]);
    const aggregateMock = jest.fn().mockReturnValue({ toArray: toArrayMock });

    mongoose.connection.db.collection.mockReturnValue({ aggregate: aggregateMock });

    const res = await request(app).get('/api/users/123');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', 123);
    expect(res.body).toHaveProperty('total', 100);
  });

  test('GET /api/users/:id returns 500 with {id,message} when aggregation fails', async () => {
    // User exists
    User.findOne.mockReturnValue({
      lean: () => ({ id: 123, first_name: 'Mosh', last_name: 'Israeli' })
    });

    // Aggregation fails
    const toArrayMock = jest.fn().mockRejectedValue(new Error('DB fail'));
    const aggregateMock = jest.fn().mockReturnValue({ toArray: toArrayMock });

    mongoose.connection.db.collection.mockReturnValue({ aggregate: aggregateMock });

    const res = await request(app).get('/api/users/123');

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('message');
  });

});
