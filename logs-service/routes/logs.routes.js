// logs-service/routes/logs.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// GET /logs - Fetch all log entries
router.get('/logs', async (req, res) => {
    try {
        // directly access the 'logs' collection
        const collection = mongoose.connection.db.collection('logs');

        // fetch all documents and convert to array
        const logs = await collection.find({}).toArray();

        res.json(logs);
    } catch (error) {
        // use the built-in logger in the request to log the error
        req.log.error(error, 'Failed to fetch logs');
        res.status(500).json({ message: 'Error fetching logs', error: error.message });
    }
});

// Export the router
module.exports = router;