const express = require('express');
const router = express.Router();
const Cost = require('../models/cost.model');
const Report = require('../models/report.model');
const logger = require('../logger');

const categories = ['food', 'health', 'housing', 'sports', 'education'];

function badRequest(res, id, message) {
  return res.status(400).json({ id, message });
}

async function userExists(userid) {
  const usersBaseUrl = process.env.USERS_SERVICE_URL || 'http://localhost:3001';
  const resp = await fetch(`${usersBaseUrl}/api/users/${userid}`);
  return resp.ok;
}

// ---------------------------------------------------------
// POST /api/add
// ---------------------------------------------------------
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

    if (Number.isNaN(userIdNum) || userIdNum <= 0) {
      return badRequest(res, 'INVALID_USERID', 'userid must be a positive number');
    }
    if (typeof description !== 'string' || description.trim().length === 0) {
      return badRequest(res, 'INVALID_DESCRIPTION', 'description must be a non-empty string');
    }
    if (Number.isNaN(sumNum) || sumNum <= 0) {
      return badRequest(res, 'INVALID_SUM', 'sum must be a positive number');
    }

    // category validation
    if (!categories.includes(category)) {
      return badRequest(res, 'INVALID_CATEGORY', `category must be one of: ${categories.join(', ')}`);
    }

    // user exists (Q&A requirement)
    const exists = await userExists(userIdNum);
    if (!exists) {
      return res.status(404).json({
        id: 'USER_NOT_FOUND',
        message: `User with id ${userIdNum} does not exist`
      });
    }

    // date rule: cannot be in the past
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

    const newCost = new Cost({
      userid: userIdNum,
      description: description.trim(),
      sum: sumNum,
      category,
      created_at: dateToSave,
    });

    await newCost.save();

    logger.info({ message: 'Cost added successfully', costId: newCost._id }, 'cost added');
    return res.status(201).json(newCost);

  } catch (error) {
    logger.error({ message: 'Error adding cost', error: error.message }, 'add cost failed');
    return res.status(500).json({ id: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

// ---------------------------------------------------------
// GET /api/report?id=123&year=2025&month=1
// ---------------------------------------------------------
router.get('/report', async (req, res) => {
  const { id, year, month } = req.query;

  if (id === undefined || year === undefined || month === undefined) {
    return badRequest(res, 'MISSING_PARAMS', 'Missing parameters: id, year, month');
  }

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

    const reportResult = {
      userid,
      year: reportYear,
      month: reportMonth,
      costs: []
    };

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

    return res.json(reportResult);

  } catch (error) {
    logger.error({ message: 'Error generating report', error: error.message }, 'report failed');
    return res.status(500).json({ id: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

module.exports = router;
