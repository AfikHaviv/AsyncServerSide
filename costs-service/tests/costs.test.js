const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const costsRouter = require('../routes/costs.routes'); // Adjust path
const Cost = require('../models/cost.model');
const Report = require('../models/report.model');

// Mock Models
jest.mock('../models/cost.model');
jest.mock('../models/report.model');

const app = express();
app.use(bodyParser.json());
app.use('/api', costsRouter); // Mount the router

describe('Costs Service Tests', () => {

    test('POST /api/add should fail if parameters are missing', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: "milk" }); // Missing userid, sum, category

        expect(res.statusCode).toBe(400);
    });

    test('GET /api/report should return report', async () => {
        // Mock Report.findOne to return null (force computation)
        Report.findOne = jest.fn().mockResolvedValue(null);

        // Mock Cost.find to return some costs
        Cost.find = jest.fn().mockResolvedValue([
            { category: 'food', sum: 10, description: 'milk', created_at: new Date() }
        ]);

        const res = await request(app).get('/api/report?id=123&year=2025&month=1');

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('costs');
        expect(res.body.costs).toHaveLength(5); // 5 categories
    });
});