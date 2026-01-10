const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userid: Number,
  year: Number,
  month: Number,
  data: Object // כאן נשמור את כל ה-JSON המוכן של הדוח
});

module.exports = mongoose.model('Report', reportSchema);