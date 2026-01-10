const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  userid: { type: Number, required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true }, // 1-12
  data: { type: Object, required: true },  // שומרים את הדוח המוכן
  created_at: { type: Date, default: Date.now },
});

// שיהיה דוח אחד לכל (userid,year,month)
ReportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Report', ReportSchema);
