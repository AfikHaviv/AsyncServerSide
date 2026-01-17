// tests/admin.test.js

// Import supertest to simulate HTTP requests against an Express app
const request = require('supertest');

// Import the router that defines the /about endpoint
const aboutRouter = require('../routes/about.routes');

// Import Express and create a lightweight app instance for testing
const express = require('express');
const app = express();

// Mount the router under the same base path used by the real service ("/api")
// This ensures the test URLs match the production URLs (e.g., GET /api/about)
app.use('/api', aboutRouter);

// Test suite for the Admin service "about" endpoint
describe('Admin Service Tests - /api/about', () => {

  // Verify the endpoint returns HTTP 200 and the response body is an array
  test('GET /api/about should return 200 and an array', async () => {
    const res = await request(app).get('/api/about');

    // Expect successful response
    expect(res.statusCode).toBe(200);

    // Expect the response to be a JSON array
    expect(Array.isArray(res.body)).toBe(true);
  });

  // Verify the endpoint returns at least one team member (non-empty array)
  test('GET /api/about should return at least 1 team member', async () => {
    const res = await request(app).get('/api/about');

    // Expect successful response
    expect(res.statusCode).toBe(200);

    // Ensure the array is not empty
    expect(res.body.length).toBeGreaterThan(0);
  });

  // Verify each team member object includes the required fields and correct types
  test('GET /api/about each member should include first_name and last_name', async () => {
    const res = await request(app).get('/api/about');

    // Expect successful response
    expect(res.statusCode).toBe(200);

    // Validate each returned object
    for (const member of res.body) {
      // Required fields
      expect(member).toHaveProperty('first_name');
      expect(member).toHaveProperty('last_name');

      // Field types should be strings
      expect(typeof member.first_name).toBe('string');
      expect(typeof member.last_name).toBe('string');
    }
  });

  // Verify no extra properties exist in each team member object
  // The project requirements specify returning only first_name and last_name
  test('GET /api/about should NOT include extra fields per member (only first_name + last_name)', async () => {
    const res = await request(app).get('/api/about');

    // Expect successful response
    expect(res.statusCode).toBe(200);

    // Ensure each object has exactly two keys: first_name and last_name
    for (const member of res.body) {
      const keys = Object.keys(member).sort();
      expect(keys).toEqual(['first_name', 'last_name']);
    }
  });

  // Verify first_name and last_name are not empty/whitespace-only strings
  test('GET /api/about should not return empty strings for names', async () => {
    const res = await request(app).get('/api/about');

    // Expect successful response
    expect(res.statusCode).toBe(200);

    // Validate each name string is non-empty after trimming whitespace
    for (const member of res.body) {
      expect(member.first_name.trim().length).toBeGreaterThan(0);
      expect(member.last_name.trim().length).toBeGreaterThan(0);
    }
  });

});
