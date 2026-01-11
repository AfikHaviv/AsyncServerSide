const mongoose = require('mongoose');

// Define the Report schema
const ReportSchema = new mongoose.Schema({
  userid: { type: Number, required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true }, // 1-12
  data: { type: Object, required: true },  // saved report data
  created_at: { type: Date, default: Date.now },
});

// Ensure one report per (userid, year, month)
ReportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Report', ReportSchema);
