const express = require('express');
const User = require('../models/models');

const router = express.Router();

function sendError(res, httpStatus, id, message) {
  return res.status(httpStatus).json({ id, message });
}

/*
  POST /api/add
  Adds a new user
  Body: { id, first_name, last_name, birthday }
*/
router.post('/api/add', async (req, res) => {
  try {
    const { id, first_name, last_name, birthday } = req.body;

    // Validation (required)
    if (id === undefined || id === null) {
      return sendError(res, 400, 'MISSING_ID', 'id is required');
    }
    if (typeof id !== 'number' || Number.isNaN(id)) {
      return sendError(res, 400, 'INVALID_ID', 'id must be a number');
    }
    if (!first_name || typeof first_name !== 'string') {
      return sendError(res, 400, 'INVALID_FIRST_NAME', 'first_name is required');
    }
    if (!last_name || typeof last_name !== 'string') {
      return sendError(res, 400, 'INVALID_LAST_NAME', 'last_name is required');
    }

    const birthDate = new Date(birthday);
    if (!birthday || Number.isNaN(birthDate.getTime())) {
      return sendError(res, 400, 'INVALID_BIRTHDAY', 'birthday must be a valid date');
    }

    // Unique check
    const exists = await User.findOne({ id }).lean();
    if (exists) {
      return sendError(res, 409, 'USER_EXISTS', 'user with this id already exists');
    }

    const created = await User.create({
      id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      birthday: birthDate,
    });

    // Return created user (same field names)
    return res.status(201).json({
      id: created.id,
      first_name: created.first_name,
      last_name: created.last_name,
      birthday: created.birthday,
    });
  } catch (err) {
    return sendError(res, 500, 'SERVER_ERROR', err.message || 'unexpected error');
  }
});

/*
  GET /api/users
  Returns all users
*/
router.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, { _id: 0 }).lean();
    return res.json(users);
  } catch (err) {
    return sendError(res, 500, 'SERVER_ERROR', err.message || 'unexpected error');
  }
});

/*
  GET /api/users/:id
  Returns: { first_name, last_name, id, total }
  total = sum of all costs for this user
*/
router.get('/api/users/:id', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const mongoose = require('mongoose'); // חובה לייבא את מונגוס כדי לגשת לקולקשן הכללי

    if (Number.isNaN(userId)) {
      return sendError(res, 400, 'INVALID_ID', 'id must be a number');
    }

    const user = await User.findOne({ id: userId }, { _id: 0 }).lean();
    if (!user) {
      return sendError(res, 404, 'USER_NOT_FOUND', 'user not found');
    }

    // --- התיקון: חישוב הטוטאל האמיתי מקולקשן costs ---
    const result = await mongoose.connection.db.collection('costs').aggregate([
        { $match: { userid: userId } },
        { $group: { _id: null, total: { $sum: "$sum" } } }
    ]).toArray();

    const totalCosts = result.length > 0 ? result[0].total : 0;
    // ------------------------------------------------

    return res.json({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      total: totalCosts, // מחזירים את המספר שחושב
      birthday: user.birthday // כדאי להחזיר גם את יום ההולדת אם זה נדרש
    });
  } catch (err) {
    return sendError(res, 500, 'SERVER_ERROR', err.message || 'unexpected error');
  }
});



module.exports = router;
