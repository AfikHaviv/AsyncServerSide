const mongoose = require('mongoose');

const CostSchema = new mongoose.Schema({
  userid: { type: Number, required: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  sum: { type: Number, required: true, min: 0 },
  created_at: { type: Date, required: true, default: Date.now },
});

module.exports = mongoose.model('Cost', CostSchema);
