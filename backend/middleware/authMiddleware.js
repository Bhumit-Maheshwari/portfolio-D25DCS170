const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');
const User = require('../models/userModel');

// ===== JWT Authentication Middleware =====
// Verifies Authorization: Bearer <token> header and attaches user to req.user
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authorization denied',
                message: 'No Bearer token provided in Authorization header',
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                error: 'Authorization denied',
                message: 'Token is missing',
            });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Token expired',
                    message: 'Your authentication token has expired. Please log in again.',
                });
            }
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Token verification failed. Please provide a valid token.',
            });
        }

        // Find user by id (exclude password)
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({
                error: 'User not found',
                message: 'The user belonging to this token no longer exists.',
            });
        }

        req.user = user;
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = authMiddleware;
