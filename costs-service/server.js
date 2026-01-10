// costs-service/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // טעינת משתני סביבה
const logger = require('./logger'); // הלוגר שלנו

// --- השינוי החשוב: ייבוא קובץ הנתיבים שיצרת ---
const costsRouter = require('./routes/costs.routes'); 

const app = express();
const PORT = process.env.PORT || 3002; // ברירת מחדל לפורט של ה-costs

// Middleware
app.use(cors());
app.use(express.json()); // חובה כדי לקרוא JSON
app.use(express.urlencoded({ extended: true }));

// --- חיבור הנתיבים לשרת ---
// כל בקשה שתתחיל ב "/api" תעבור לקובץ costs.routes.js
// דוגמה: /api/add או /api/report
app.use('/api', costsRouter); 

// בדיקת "דופק" (Health Check) פשוטה
app.get('/', (req, res) => {
  res.send(`Costs Service is running on port ${PORT}`);
});

// התחברות ל-MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info(`✅ Costs-Service Connected to MongoDB Atlas!`);
  })
  .catch(err => {
    logger.error('❌ Database connection error:', err);
  });

// הרצת השרת
app.listen(PORT, () => {
  console.log(`🚀 Costs Service is running on port ${PORT}`);
  // שליחת לוג ראשוני כדי לוודא שהלוגר עובד
  logger.info({ service: 'Costs-Service', status: 'started' }, 'Costs Service started successfully');
});