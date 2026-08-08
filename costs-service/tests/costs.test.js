// costs-service/tests/costs.test.js
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// We mock axios because userExists() calls users-service over HTTP
jest.mock('axios', () => ({
  get: jest.fn()
}));
const axios = require('axios');

// Mock Cost model (both constructor usage and static find)
jest.mock('../models/cost.model', () => {
  const CostMock = jest.fn();
  CostMock.find = jest.fn();
  return CostMock;
});
const Cost = require('../models/cost.model');

// Mock Report model (static findOne + constructor for caching)
jest.mock('../models/report.model', () => {
  const ReportMock = jest.fn();
  ReportMock.findOne = jest.fn();
  return ReportMock;
});
const Report = require('../models/report.model');

// Import router after mocks so it will use the mocked modules
const costsRouter = require('../routes/costs.routes');

// Build an express app for testing the router
const app = express();
app.use(bodyParser.json());
app.use('/api', costsRouter);

// Helper: create a valid request body for /api/add
function validCostBody(overrides = {}) {
  return {
    userid: 123123,
    description: 'milk',
    category: 'food',
    sum: 8,
    ...overrides
  };
}

describe('Costs Service Tests - /api/add and /api/report (axios version)', () => {

  // Reset mocks before each test so they don't leak between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/add returns 400 if required fields are missing', async () => {
    // No need to mock axios/DB because validation fails first
    const res = await request(app).post('/api/add').send({ description: 'milk' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('message');
  });

  test('POST /api/add returns 400 if userid is invalid', async () => {
    const res = await request(app).post('/api/add').send(validCostBody({ userid: -5 }));

    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('INVALID_USERID');
  });

  test('POST /api/add returns 400 if description is empty', async () => {
    const res = await request(app).post('/api/add').send(validCostBody({ description: '   ' }));

    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('INVALID_DESCRIPTION');
  });

  test('POST /api/add returns 400 if sum is invalid', async () => {
    const res = await request(app).post('/api/add').send(validCostBody({ sum: 0 }));

    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('INVALID_SUM');
  });

  test('POST /api/add returns 400 if category is invalid', async () => {
    const res = await request(app).post('/api/add').send(validCostBody({ category: 'shopping' }));

    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('INVALID_CATEGORY');
  });

  test('POST /api/add returns 400 if created_at is invalid date', async () => {
    // Make userExists pass so we reach date validation
    axios.get.mockResolvedValue({ status: 200 });

    const res = await request(app)
      .post('/api/add')
      .send(validCostBody({ created_at: 'not-a-date' }));

    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('INVALID_DATE');
  });

  test('POST /api/add returns 400 if created_at is in the past', async () => {
    // Make userExists pass so we reach past-date validation
    axios.get.mockResolvedValue({ status: 200 });

    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/add')
      .send(validCostBody({ created_at: past }));

    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('PAST_DATE_NOT_ALLOWED');
  });

  test('POST /api/add returns 404 if user does not exist', async () => {
    // In our implementation, any axios error makes userExists() return false
    axios.get.mockRejectedValue(new Error('User not found'));

    const res = await request(app).post('/api/add').send(validCostBody());

    expect(res.statusCode).toBe(404);
    expect(res.body.id).toBe('USER_NOT_FOUND');
  });

  test('POST /api/add returns 201 and the new cost item when valid', async () => {
    // userExists => true
    axios.get.mockResolvedValue({ status: 200 });

    // Mock Cost constructor -> instance with save() success
    Cost.mockImplementation((doc) => {
      return {
        _id: 'mock_cost_id',
        ...doc,
        save: jest.fn().mockResolvedValue(true)
      };
    });

    const res = await request(app).post('/api/add').send(validCostBody());

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('userid', 123123);
    expect(res.body).toHaveProperty('description', 'milk');
    expect(res.body).toHaveProperty('category', 'food');
    expect(res.body).toHaveProperty('sum', 8);
  });

  test('POST /api/add returns 500 if DB save fails', async () => {
    // userExists => true
    axios.get.mockResolvedValue({ status: 200 });

    // Cost.save fails -> should return INTERNAL_ERROR
    Cost.mockImplementation((doc) => {
      return {
        _id: 'mock_cost_id',
        ...doc,
        save: jest.fn().mockRejectedValue(new Error('DB fail'))
      };
    });

    const res = await request(app).post('/api/add').send(validCostBody());

    expect(res.statusCode).toBe(500);
    expect(res.body.id).toBe('INTERNAL_ERROR');
    expect(res.body).toHaveProperty('message');
  });

  test('GET /api/report returns 400 if parameters are missing', async () => {
    const res = await request(app).get('/api/report?id=123123&year=2026');

    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('MISSING_PARAMS');
  });

  test('GET /api/report returns 400 if month is invalid', async () => {
    const res = await request(app).get('/api/report?id=123123&year=2026&month=13');

    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe('INVALID_MONTH');
  });

  test('GET /api/report returns cached report if it exists', async () => {
    // If cached report exists, route returns existingReport.data
    Report.findOne.mockResolvedValue({
      data: {
        userid: 1,
        year: 2025,
        month: 1,
        costs: [{ food: [] }, { health: [] }, { housing: [] }, { sports: [] }, { education: [] }]
      }
    });

    const res = await request(app).get('/api/report?id=1&year=2025&month=1');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('userid', 1);
    expect(res.body).toHaveProperty('costs');
    expect(Array.isArray(res.body.costs)).toBe(true);
  });

  test('GET /api/report computes report and returns 5 categories when not cached', async () => {
    // No cached report => compute from Cost.find
    Report.findOne.mockResolvedValue(null);

    // Return one cost in "food"
    Cost.find.mockResolvedValue([
      { category: 'food', sum: 10, description: 'milk', created_at: new Date('2026-01-10T10:00:00Z') }
    ]);

    // Mock Report constructor for caching (past months may be cached)
    Report.mockImplementation((doc) => {
      return {
        ...doc,
        save: jest.fn().mockResolvedValue(true)
      };
    });

    const res = await request(app).get('/api/report?id=123123&year=2026&month=1');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('costs');
    expect(res.body.costs).toHaveLength(5);

    // Verify "food" category exists and has items array
    const foodObj = res.body.costs.find((x) => Object.prototype.hasOwnProperty.call(x, 'food'));
    expect(foodObj).toBeTruthy();
    expect(Array.isArray(foodObj.food)).toBe(true);
  });

  test('GET /api/report returns 500 with {id,message} when DB fails', async () => {
    // No cached report, then Cost.find throws
    Report.findOne.mockResolvedValue(null);
    Cost.find.mockRejectedValue(new Error('DB fail'));

    const res = await request(app).get('/api/report?id=123123&year=2026&month=1');

    expect(res.statusCode).toBe(500);
    expect(res.body.id).toBe('INTERNAL_ERROR');
    expect(res.body).toHaveProperty('message');
  });

});
