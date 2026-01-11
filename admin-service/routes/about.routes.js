// admin-service/routes/about.js
const express = require('express');
const router = express.Router();

router.get('/about', (req, res) => {
    // list of team members
    const team = [
        { first_name: "Afik", last_name: "Haviv" },
        { first_name: "Eden", last_name: "Shmatman" },
        { first_name: "Mor", last_name: "Sigman" }
    ];
    res.json(team);
});

module.exports = router;