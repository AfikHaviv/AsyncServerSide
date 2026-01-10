const mongoose = require('mongoose');

const costSchema = new mongoose.Schema({
  userid: { 
    type: Number, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  sum: { 
    type: Number, 
    required: true 
  },
  category: { 
    type: String, 
    // אלו הקטגוריות שחובה לתמוך בהן לפי המסמך
    enum: ['food', 'health', 'housing', 'sport', 'education'], 
    required: true 
  },
  created_at: { 
    type: Date, 
    default: Date.now // ברירת מחדל: הזמן הנוכחי
  }
});

module.exports = mongoose.model('Cost', costSchema);