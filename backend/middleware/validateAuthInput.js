// ===== Auth Input Validation Middleware =====
// Validates register and login request bodies before hitting controllers

const validateRegisterInput = (req, res, next) => {
    const { username, email, password } = req.body;
    const errors = [];

    // Username validation
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
        errors.push('Username is required');
    } else if (username.trim().length < 3) {
        errors.push('Username must be at least 3 characters long');
    }

    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
        errors.push('Email is required');
    } else if (!emailRegex.test(email.trim())) {
        errors.push('Please provide a valid email address');
    }

    // Password validation
    if (!password || typeof password !== 'string') {
        errors.push('Password is required');
    } else if (password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors,
        });
    }

    next();
};

const validateLoginInput = (req, res, next) => {
    const { email, username, password } = req.body;
    const errors = [];

    if ((!email || email.trim().length === 0) && (!username || username.trim().length === 0)) {
        errors.push('Email or username is required');
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
        errors.push('Password is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors,
        });
    }

    next();
};

module.exports = { validateRegisterInput, validateLoginInput };
