// tests/users.test.js
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const usersRoutes = require('../routes/users.routes');
const User = require('../models/users.models');

// configure jest to use mocks
// when importing the User model, it will use the mock defined here
jest.mock('../models/users.models', () => {
  return {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn()
  };
});

// create a mock for mongoose to handle aggregate calls
jest.mock('mongoose', () => {
  return {
    connection: {
      db: {
        collection: () => ({
          aggregate: () => ({
            toArray: () => Promise.resolve([{ total: 100 }])
          })
        })
      }
    },
    Schema: function () { },
    model: jest.fn()
  };
});

const app = express();
app.use(bodyParser.json());
app.use(usersRoutes); // use the users routes

describe('Users Service Tests', () => {

  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/add should create a user', async () => {
    // Define the behavior of create and findOne for this test
    User.create.mockResolvedValue({
      id: 999,
      first_name: "Test",
      last_name: "User",
      birthday: new Date()
    });

    // Check that no user already exists (returns null)
    User.findOne.mockReturnValue({ lean: () => null });

    // Make the request
    const res = await request(app)
      .post('/api/add')
      .send({
        id: 999,
        first_name: "Test",
        last_name: "User",
        birthday: "1990-01-01"
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.first_name).toBe("Test");
  });


  // Test for getting a user by ID with total costs
  test('GET /api/users/:id should return user with total', async () => {
    // Define the behavior of findOne for this test
    User.findOne.mockReturnValue({
      lean: () => ({ id: 123, first_name: "Mosh", last_name: "Israeli", birthday: new Date() })
    });

    const res = await request(app).get('/api/users/123');

    expect(res.statusCode).toBe(200);
    // The total comes from the mock of mongoose above (we set it to return 100)
    expect(res.body.total).toBe(100);
    expect(res.body.first_name).toBe("Mosh");
  });
});

// Test for getting all users
  test('GET /api/users should return list of users', async () => {
    // Mock finding all users
    User.find = jest.fn().mockReturnValue({
      lean: () => [
        { id: 1, first_name: "A", last_name: "B" },
        { id: 2, first_name: "C", last_name: "D" }
      ]
    });

    // Make the request
    const res = await request(app).get('/api/users');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });