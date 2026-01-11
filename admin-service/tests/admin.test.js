const request = require('supertest');
const express = require('express');
const aboutRouter = require('../routes/about.routes'); // Update path if needed

const app = express();
app.use('/api', aboutRouter);

// Tests for the About Route
describe('Admin Service Tests', () => {
  test('GET /api/about returns team members', async () => {
    const res = await request(app).get('/api/about');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Verify one of your names exists
    expect(res.body[0]).toHaveProperty('first_name');
    expect(res.body[0]).toHaveProperty('last_name');
  });
});