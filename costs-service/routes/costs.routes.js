// costs-service/routes/costs.routes.js
const express = require('express');
const router = express.Router();
const Cost = require('../models/cost.model');
const Report = require('../models/report.model');
const logger = require('../logger');
const axios = require('axios');


// categories allowed
const categories = ['food', 'health', 'housing', 'sports', 'education'];

function badRequest(res, id, message) {
  return res.status(400).json({ id, message });
}

// Check if user exists in users service
async function userExists(userid) {
  const usersBaseUrl = process.env.USERS_SERVICE_URL || 'http://localhost:3001';

  // Axios throws on non-2xx, so we catch and treat as "not exists"
  try {
    const resp = await axios.get(`${usersBaseUrl}/api/users/${userid}`, {
      timeout: 5000,
    });
    return resp.status >= 200 && resp.status < 300;
  } catch (err) {
    // If the users service is down, you can decide policy.
    // Here: treat as not found OR service unavailable.
    // We'll return false and caller will return USER_NOT_FOUND.
    return false;
  }
}


// POST /api/add
router.post('/add', async (req, res) => {
  try {
    const { userid, description, sum, category, created_at } = req.body;

    // required fields
    if (userid === undefined || description === undefined || sum === undefined || category === undefined) {
      return badRequest(res, 'MISSING_FIELDS', 'Missing required fields: userid, description, sum, category');
    }

    // type validation
    const userIdNum = Number(userid);
    const sumNum = Number(sum);

    // userid validation
    if (Number.isNaN(userIdNum) || userIdNum <= 0) {
      return badRequest(res, 'INVALID_USERID', 'userid must be a positive number');
    }
    // description validation
    if (typeof description !== 'string' || description.trim().length === 0) {
      return badRequest(res, 'INVALID_DESCRIPTION', 'description must be a non-empty string');
    }
    // sum validation
    if (Number.isNaN(sumNum) || sumNum <= 0) {
      return badRequest(res, 'INVALID_SUM', 'sum must be a positive number');
    }

    // category validation
    if (!categories.includes(category)) {
      return badRequest(res, 'INVALID_CATEGORY', `category must be one of: ${categories.join(', ')}`);
    }

    // user existence check
    const exists = await userExists(userIdNum);
    if (!exists) {
      return res.status(404).json({
        id: 'USER_NOT_FOUND',
        message: `User with id ${userIdNum} does not exist`
      });
    }

    // date cannot be in the past
    let dateToSave = new Date();
    if (created_at !== undefined) {
      const parsed = new Date(created_at);

      if (Number.isNaN(parsed.getTime())) {
        return badRequest(res, 'INVALID_DATE', 'created_at is not a valid date');
      }
      if (parsed < new Date()) {
        return badRequest(res, 'PAST_DATE_NOT_ALLOWED', 'Cannot add costs in the past');
      }
      dateToSave = parsed;
    }

    // create and save cost
    const newCost = new Cost({
      userid: userIdNum,
      description: description.trim(),
      sum: sumNum,
      category,
      created_at: dateToSave,
    });

    // save to DB
    await newCost.save();

    logger.info({ message: 'Cost added successfully', costId: newCost._id }, 'cost added');
    return res.status(201).json(newCost);

  } catch (error) {
    logger.error({ message: 'Error adding cost', error: error.message }, 'add cost failed');
    return res.status(500).json({ id: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

/*
 * Computed Design Pattern Implementation:
 * 1. Check if a report for this user/year/month already exists in the 'reports' collection.
 * 2. If it exists, return the cached document to save processing power.
 * 3. If not, perform an aggregation on the 'costs' collection to calculate the report.
 * 4. If the requested month is in the past (not current month), save the result to 'reports' for future use.
 */

// GET /api/report?id=123&year=2025&month=1
router.get('/report', async (req, res) => {
  const { id, year, month } = req.query;

  if (id === undefined || year === undefined || month === undefined) {
    return badRequest(res, 'MISSING_PARAMS', 'Missing parameters: id, year, month');
  }

  // validate parameters
  const userid = Number(id);
  const reportYear = Number(year);
  const reportMonth = Number(month);

  if (Number.isNaN(userid) || userid <= 0) return badRequest(res, 'INVALID_ID', 'id must be a positive number');
  if (Number.isNaN(reportYear) || reportYear < 1970) return badRequest(res, 'INVALID_YEAR', 'year is invalid');
  if (Number.isNaN(reportMonth) || reportMonth < 1 || reportMonth > 12) return badRequest(res, 'INVALID_MONTH', 'month must be 1-12');

  try {
    // 1) Computed pattern: return cached report if exists
    const existingReport = await Report.findOne({ userid, year: reportYear, month: reportMonth });
    if (existingReport) {
      logger.info({ message: 'Returning cached report', userid, year: reportYear, month: reportMonth }, 'cached report');
      return res.json(existingReport.data);
    }

    // 2) compute from DB
    const startDate = new Date(reportYear, reportMonth - 1, 1, 0, 0, 0);
    const endDate = new Date(reportYear, reportMonth, 0, 23, 59, 59);

    const costs = await Cost.find({
      userid,
      created_at: { $gte: startDate, $lte: endDate }
    });

    // structure the report
    const reportResult = {
      userid,
      year: reportYear,
      month: reportMonth,
      costs: []
    };

    // group by category
    categories.forEach(cat => {
      const items = costs
        .filter(c => c.category === cat)
        .map(c => ({
          sum: c.sum,
          description: c.description,
          day: c.created_at.getDate()
        }));

      reportResult.costs.push({ [cat]: items });
    });

    // 3) cache ONLY if month already ended (before current month)
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfRequestedMonth = new Date(reportYear, reportMonth - 1, 1);

    // cache the report if the requested month is in the past
    if (startOfRequestedMonth < startOfCurrentMonth) {
      const newReport = new Report({
        userid,
        year: reportYear,
        month: reportMonth,
        data: reportResult
      });

      await newReport.save();
      logger.info({ message: 'Report computed and cached', userid, year: reportYear, month: reportMonth }, 'report cached');
    }

    // return the computed report
    return res.json(reportResult);

  } catch (error) {
    logger.error({ message: 'Error generating report', error: error.message }, 'report failed');
    return res.status(500).json({ id: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

// Export the router
module.exports = router;
