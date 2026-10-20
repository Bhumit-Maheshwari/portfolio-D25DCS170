const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/config');

// Helper to sign JWT token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
};

// @desc    Register a new user
// @route   POST /auth/register (or /register)
// @access  Public
const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        // Check if user with same email or username already exists
        const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingEmail) {
            return res.status(400).json({
                error: 'Registration failed',
                message: 'A user with this email address already exists',
            });
        }

        const existingUsername = await User.findOne({ username: username.trim() });
        if (existingUsername) {
            return res.status(400).json({
                error: 'Registration failed',
                message: 'This username is already taken',
            });
        }

        // Create user (password hashing handled by userSchema.pre('save'))
        const user = await User.create({
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password,
        });

        // Generate JWT token
        const token = generateToken(user._id);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt,
            },
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Authenticate user & get token
// @route   POST /auth/login (or /login)
// @access  Public
const login = async (req, res, next) => {
    try {
        const { email, username, password } = req.body;
        const identifier = (email || username || '').toLowerCase().trim();

        // Search by email or username
        const user = await User.findOne({
            $or: [
                { email: identifier },
                { username: identifier },
            ],
        });

        if (!user) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid credentials. User not found.',
            });
        }

        // Verify password with bcrypt.compare
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid credentials. Password does not match.',
            });
        }

        // Generate JWT token
        const token = generateToken(user._id);

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt,
            },
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get currently authenticated user
// @route   GET /auth/me
// @access  Private (Protected by authMiddleware)
const getMe = async (req, res) => {
    res.status(200).json({
        user: req.user,
    });
};

module.exports = { register, login, getMe };
