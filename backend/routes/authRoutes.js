const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const {
    validateRegisterInput,
    validateLoginInput,
} = require('../middleware/validateAuthInput');

// Public routes
router.post('/register', validateRegisterInput, authController.register);
router.post('/login', validateLoginInput, authController.login);

// Protected routes
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
