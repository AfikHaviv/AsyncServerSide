// tests/costs.test.js
const request = require('supertest');
const express = require('express');

const costsRouter = require('../routes/costs.routes');
const Cost = require('../models/cost.model');
const Report = require('../models/report.model');

jest.mock('../models/cost.model');
jest.mock('../models/report.model');

// Mock node-fetch (since costs.routes.js uses: const fetch = require('node-fetch');)
jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// Mount the router the same way as in the real service (base "/api")
app.use('/api', costsRouter);

describe('Costs Service Tests', () => {

  // Reset all mocks before each test to keep tests independent
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockReset();
  });

  // -------------------- POST /api/add --------------------

  test('POST /api/add returns 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/add')
      .send({ description: 'milk' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('message');
  });

  // userid validation
  test('POST /api/add returns 400 if userid is invalid', async () => {
    const res = await request(app)
      .post('/api/add')
      .send({ userid: 'abc', description: 'milk', category: 'food', sum: 8 });

    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('INVALID_USERID');
  });

  // description validation
  test('POST /api/add returns 400 if description is empty', async () => {
    const res = await request(app)
      .post('/api/add')
      .send({ userid: 123, description: '   ', category: 'food', sum: 8 });

    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('INVALID_DESCRIPTION');
  });

  // sum validation
  test('POST /api/add returns 400 if sum is invalid', async () => {
    const res = await request(app)
      .post('/api/add')
      .send({ userid: 123, description: 'milk', category: 'food', sum: 0 });

    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('INVALID_SUM');
  });

  // category validation
  test('POST /api/add returns 400 if category is invalid', async () => {
    const res = await request(app)
      .post('/api/add')
      .send({ userid: 123, description: 'milk', category: 'travel', sum: 8 });

    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('INVALID_CATEGORY');
  });

  // For date validation tests, we still mock fetch so userExists does not crash
  test('POST /api/add returns 400 if created_at is invalid date', async () => {
    fetch.mockResolvedValue({ ok: true });

    const res = await request(app)
      .post('/api/add')
      .send({ userid: 123, description: 'milk', category: 'food', sum: 8, created_at: 'not-a-date' });

    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('INVALID_DATE');
  });

  // date in the past validation
  test('POST /api/add returns 400 if created_at is in the past', async () => {
    fetch.mockResolvedValue({ ok: true });

    const past = new Date(Date.now() - 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/add')
      .send({ userid: 123, description: 'milk', category: 'food', sum: 8, created_at: past });

    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('PAST_DATE_NOT_ALLOWED');
  });

  // user existence check
  test('POST /api/add returns 404 if user does not exist', async () => {
    fetch.mockResolvedValue({ ok: false });

    const res = await request(app)
      .post('/api/add')
      .send({ userid: 999, description: 'milk', category: 'food', sum: 8 });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('message');
    expect(res.body.id).toBe('USER_NOT_FOUND');
  });

  // successful addition
  test('POST /api/add returns 201 and the new cost item when valid', async () => {
    fetch.mockResolvedValue({ ok: true });

    // Mock Cost constructor instance + its save() method
    Cost.mockImplementation(() => ({
      _id: 'fakeid',
      userid: 123,
      description: 'milk',
      category: 'food',
      sum: 8,
      created_at: new Date(),
      save: jest.fn().mockResolvedValue(true)
    }));


    // Make the request
    const res = await request(app)
      .post('/api/add')
      .send({ userid: 123, description: 'milk', category: 'food', sum: 8 });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('userid', 123);
    expect(res.body).toHaveProperty('description');
    expect(res.body).toHaveProperty('category', 'food');
    expect(res.body).toHaveProperty('sum');
  });

  // DB save failure
  test('POST /api/add returns 500 if DB save fails', async () => {
    fetch.mockResolvedValue({ ok: true });

    Cost.mockImplementation(() => ({
      save: jest.fn().mockRejectedValue(new Error('DB fail'))
    }));

    const res = await request(app)
      .post('/api/add')
      .send({ userid: 123, description: 'milk', category: 'food', sum: 8 });

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('id', 'INTERNAL_ERROR');
    expect(res.body).toHaveProperty('message');
  });

  // -------------------- GET /api/report --------------------

  // missing parameters
  test('GET /api/report returns 400 if parameters are missing', async () => {
    const res = await request(app).get('/api/report?id=1&year=2025');
    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('MISSING_PARAMS');
  });

  // userid validation
  test('GET /api/report returns 400 if month is invalid', async () => {
    const res = await request(app).get('/api/report?id=1&year=2025&month=13');
    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('INVALID_MONTH');
  });

  // year validation
  test('GET /api/report returns cached report if it exists', async () => {
    const cached = { userid: 1, year: 2025, month: 1, costs: [] };
    Report.findOne.mockResolvedValue({ data: cached });

    const res = await request(app).get('/api/report?id=1&year=2025&month=1');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(cached);
    expect(Cost.find).not.toHaveBeenCalled();
  });

  // compute report when not cached
  test('GET /api/report computes report and returns 5 categories when not cached', async () => {
    Report.findOne.mockResolvedValue(null);
    Cost.find.mockResolvedValue([]);

    const res = await request(app).get('/api/report?id=1&year=2025&month=1');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('userid', 1);
    expect(res.body).toHaveProperty('year', 2025);
    expect(res.body).toHaveProperty('month', 1);
    expect(res.body).toHaveProperty('costs');
    expect(res.body.costs).toHaveLength(5);
  });

  // DB failure during report generation
  test('GET /api/report returns 500 if DB fails', async () => {
    Report.findOne.mockResolvedValue(null);
    Cost.find.mockRejectedValue(new Error('DB fail'));

    const res = await request(app).get('/api/report?id=1&year=2025&month=1');

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('id', 'INTERNAL_ERROR');
    expect(res.body).toHaveProperty('message');
  });

});