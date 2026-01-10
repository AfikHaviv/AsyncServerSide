const express = require('express');
const router = express.Router();
const Cost = require('../models/cost.model');
const Report = require('../models/report.model');
const logger = require('../logger');

// רשימת הקטגוריות המורשות
const categories = ['food', 'health', 'housing', 'sport', 'education'];

// ---------------------------------------------------------
// POST /api/add -> הוספת פריט עלות חדש
// ---------------------------------------------------------
router.post('/add', async (req, res) => {
    try {
        const { userid, description, sum, category, created_at } = req.body;

        // בדיקה שכל השדות קיימים
        if (!userid || !description || !sum || !category) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // בדיקה שהקטגוריה חוקית
        if (!categories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        // יצירת העלות ושמירה ב-DB
        // אם נשלח תאריך - נשתמש בו, אחרת נשתמש בעכשיו
        const costData = { userid, description, sum, category };
        if (created_at) costData.created_at = created_at;

        const newCost = new Cost(costData);
        await newCost.save();

        logger.info({ message: 'Cost added successfully', costId: newCost._id });
        
        // החזרת הפריט שנוצר
        res.status(201).json(newCost);

    } catch (error) {
        logger.error({ message: 'Error adding cost', error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------
// GET /api/report -> הפקת דוח חודשי (כולל Computed Pattern)
// ---------------------------------------------------------
router.get('/report', async (req, res) => {
    // שליפת הפרמטרים מה-URL
    const { id, year, month } = req.query;
    const userid = parseInt(id);
    const reportYear = parseInt(year);
    const reportMonth = parseInt(month);

    if (!userid || !reportYear || !reportMonth) {
        return res.status(400).json({ error: 'Missing parameters (id, year, month)' });
    }

    try {
        // --- שלב 1: בדיקה אם הדוח כבר קיים (Computed Pattern) ---
        const existingReport = await Report.findOne({ userid, year: reportYear, month: reportMonth });
        if (existingReport) {
            logger.info({ message: 'Returning cached report', userid, year, month });
            return res.json(existingReport.data); // מחזירים את הדוח המוכן
        }

        // --- שלב 2: אם לא קיים - חישוב הדוח מאפס ---
        
        // חישוב טווח התאריכים של החודש המבוקש
        // הערה: חודשים ב-JS מתחילים מ-0, לכן מחסירים 1
        const startDate = new Date(reportYear, reportMonth - 1, 1);
        const endDate = new Date(reportYear, reportMonth, 0, 23, 59, 59);

        // שליפת כל ההוצאות של היוזר בחודש הזה
        const costs = await Cost.find({
            userid: userid,
            created_at: { $gte: startDate, $lte: endDate }
        });

        // ארגון המידע לפי המבנה שנדרש במטלה
        const reportResult = {
            userid,
            year: reportYear,
            month: reportMonth,
            costs: [] // מערך של אובייקטים לפי קטגוריות
        };

        // לולאה שמסדרת את ההוצאות לפי קטגוריות
        categories.forEach(cat => {
            const items = costs
                .filter(c => c.category === cat)
                .map(c => ({
                    sum: c.sum,
                    description: c.description,
                    day: c.created_at.getDate() // שליפת היום בחודש
                }));
            
            // הוספה למבנה הסופי רק את הקטגוריה הנוכחית
            reportResult.costs.push({ [cat]: items });
        });

        // --- שלב 3: שמירה ב-DB (רק אם החודש כבר עבר) ---
        // המטרה: לשמור רק דוחות היסטוריים שלא ישתנו יותר
        const now = new Date();
        // בדיקה: האם התאריך של החודש המבוקש הוא בעבר?
        const requestDate = new Date(reportYear, reportMonth); 
        
        if (requestDate < now) {
            const newReport = new Report({ 
                userid, 
                year: reportYear, 
                month: reportMonth, 
                data: reportResult 
            });
            await newReport.save();
            logger.info({ message: 'Report computed and cached', userid, year, month });
        }

        // החזרת הדוח ללקוח
        res.json(reportResult);

    } catch (error) {
        logger.error({ message: 'Error generating report', error: error.message });
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;