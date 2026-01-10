const mongoose = require('mongoose');

/*
  Users collection schema
  IMPORTANT:
  - id (Number) is NOT the same as MongoDB _id
*/
const userSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    birthday: { type: Date, required: true },
  },
  { versionKey: false }
);

module.exports = mongoose.model('User', userSchema);
