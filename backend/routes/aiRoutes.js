const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Practical 13: AI Integration Route
// POST /api/ai/generate-description (or /ai/generate-description)
router.post('/generate-description', aiController.generateTaskDescription);

module.exports = router;
