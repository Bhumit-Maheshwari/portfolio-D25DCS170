# Practical 7: Authentication and Middleware Pipeline

* **Course:** Advanced Web Development Frameworks (AWDF)
* **CO / PO:** CO2, CO6 / PO3, PO5
* **Objective:** To implement JWT-based authentication and input validation as part of the Express middleware pipeline.

---

## 1. Architecture & Middleware Pipeline

```text
Registration & Login Flow:
  POST /auth/register ──> [validateRegisterInput] ──> hash password (bcrypt) ──> save User ──> 201 + JWT
  POST /auth/login    ──> [validateLoginInput]    ──> verify password        ──> sign JWT   ──> 200 + JWT

Protected Route Pipeline:
  Client Request (Headers: Authorization: Bearer <token>)
         │
         ▼
  [Global Middleware]   ──> CORS, express.json(), logger, validateContentType
         │
         ▼
  [Auth Middleware]     ──> verifies JWT token via jwt.verify() ──> attaches req.user
         │
         ▼
  [Validation Pipeline] ──> validateTaskCreate / validateTaskUpdate (rejects missing/invalid fields)
         │
         ▼
  Controller            ──> Task CRUD operations isolated to authenticated user
         │
         ▼
  MongoDB Database
```

---

## 2. Key Source Code Files

### A. User Model with Password Hashing (`backend/models/userModel.js`)
Uses `bcryptjs` in a Mongoose `pre('save')` hook to securely hash passwords before persisting to MongoDB, and provides `matchPassword()` for authentication:

```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address',
        ],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Pre-save hook: Hash password with bcrypt before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Instance method: Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Exclude password field from JSON outputs
userSchema.methods.toJSON = function () {
    const userObject = this.toObject();
    delete userObject.password;
    return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
```

---

### B. JWT Authentication Middleware (`backend/middleware/authMiddleware.js`)
Verifies incoming `Authorization: Bearer <token>` headers and attaches the decoded user document to `req.user`:

```javascript
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');
const User = require('../models/userModel');

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
```

---

### C. Server-Side Input Validation Middleware (`backend/middleware/validateTaskInput.js`)
Validates payload integrity before reaching controllers and the database:

```javascript
const validateTaskCreate = (req, res, next) => {
    const { title, priority, description } = req.body;
    const errors = [];

    if (title === undefined || title === null) {
        errors.push('Task title is required');
    } else if (typeof title !== 'string') {
        errors.push('Task title must be a string');
    } else if (title.trim().length === 0) {
        errors.push('Task title cannot be empty or only whitespace');
    } else if (title.trim().length > 150) {
        errors.push('Task title cannot exceed 150 characters');
    }

    if (priority !== undefined) {
        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(priority)) {
            errors.push('Priority must be one of: low, medium, high');
        }
    }

    if (description !== undefined && typeof description !== 'string') {
        errors.push('Task description must be a string');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Input validation failed',
            details: errors,
        });
    }

    next();
};

const validateTaskUpdate = (req, res, next) => {
    const { title, priority, completed, description } = req.body;
    const errors = [];

    if (title !== undefined) {
        if (typeof title !== 'string') {
            errors.push('Task title must be a string');
        } else if (title.trim().length === 0) {
            errors.push('Task title cannot be empty');
        } else if (title.trim().length > 150) {
            errors.push('Task title cannot exceed 150 characters');
        }
    }

    if (priority !== undefined) {
        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(priority)) {
            errors.push('Priority must be one of: low, medium, high');
        }
    }

    if (completed !== undefined && typeof completed !== 'boolean') {
        errors.push('Completed status must be a boolean');
    }

    if (description !== undefined && typeof description !== 'string') {
        errors.push('Task description must be a string');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Input validation failed',
            details: errors,
        });
    }

    next();
};

module.exports = { validateTaskCreate, validateTaskUpdate };
```

---

### D. Protected Task Routes Pipeline (`backend/routes/taskRoutes.js`)
Demonstrates the full pipeline: `[Auth Middleware]` → `[Validation Middleware]` → `Controller`:

```javascript
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');
const validateTaskId = require('../middleware/validateTaskId');
const {
    validateTaskCreate,
    validateTaskUpdate,
} = require('../middleware/validateTaskInput');

// Protect ALL task routes with JWT Authentication Middleware
router.use(authMiddleware);

// Middleware Pipeline: [Auth] -> [Validation] -> Controller
router.get('/', taskController.getAllTasks);
router.get('/:id', validateTaskId, taskController.getTaskById);
router.post('/', validateTaskCreate, taskController.createTask);
router.put('/:id', validateTaskId, validateTaskUpdate, taskController.updateTask);
router.delete('/:id', validateTaskId, taskController.deleteTask);

module.exports = router;
```

---

### E. Authentication Controller (`backend/controllers/authController.js`)
Issues signed JWT tokens with 1-hour expiration on registration and login:

```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/config');

const generateToken = (userId) => {
    return jwt.sign({ id: userId }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
};

const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

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

        const user = await User.create({
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password,
        });

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

const login = async (req, res, next) => {
    try {
        const { email, username, password } = req.body;
        const identifier = (email || username || '').toLowerCase().trim();

        const user = await User.findOne({
            $or: [{ email: identifier }, { username: identifier }],
        });

        if (!user) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid credentials. User not found.',
            });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid credentials. Password does not match.',
            });
        }

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

const getMe = async (req, res) => {
    res.status(200).json({ user: req.user });
};

module.exports = { register, login, getMe };
```

---

## 3. Step-by-Step Execution Guide

1. **Verify Backend Dependencies**:
   ```bash
   cd backend
   npm install
   ```
2. **Start Backend Server**:
   ```bash
   node server.js
   ```
   *Console Output:*
   ```text
   Server running on http://localhost:5000
   MongoDB connected: 127.0.0.1
   ```
3. **Start Frontend Client**:
   ```bash
   cd frontend
   npm run dev
   ```
   *Access in Browser:* `http://localhost:5173/tasks`

---

## 4. Expected Outputs & Screenshot Checklist for Submission

| # | Screenshot Title | Action to Perform | Expected Output / What to Capture |
|---|------------------|-------------------|-----------------------------------|
| **1** | **Protected Route Rejection (401)** | Send `GET http://localhost:5000/tasks` without token in Postman. | `401 Unauthorized` with message: *"No Bearer token provided in Authorization header"*. |
| **2** | **Registration Input Validation (400)** | Send `POST /auth/register` with short username or invalid email. | `400 Bad Request` with array of validation error messages. |
| **3** | **Successful User Registration (201)** | Send valid credentials to `POST /auth/register`. | `201 Created` returning generated JWT `token` and user object without password. |
| **4** | **Hashed Password in MongoDB Compass** | Inspect `users` collection in MongoDB Compass. | Document showing `password` stored as a bcrypt hash (e.g., `$2a$10$...`). |
| **5** | **Login Failure (401)** | Send invalid password to `POST /auth/login`. | `401 Unauthorized` with message: *"Invalid credentials. Password does not match."*. |
| **6** | **Successful Login & Token Generation (200)** | Send valid credentials to `POST /auth/login`. | `200 OK` returning signed JWT token and user info. |
| **7** | **Task Input Validation Rejection (400)** | Send `POST /tasks` with Bearer token but empty/missing `title`. | `400 Bad Request` with message: *"Task title is required"*, rejected before hitting MongoDB. |
| **8** | **Authenticated Task Creation (201)** | Send `POST /tasks` with valid title and Bearer token. | `201 Created` with task document associated with authenticated `user` ObjectId. |
| **9** | **React Frontend Auth Card** | Navigate to `http://localhost:5173/tasks` while logged out. | Clean authentication card with Login/Register tabs and form inputs. |
| **10** | **React Authenticated Banner & CRUD** | Log in via React frontend UI. | Green user banner showing *"🛡️ Authenticated (JWT) - Logged in as: username"*, along with active Task Manager CRUD interface and Logout button. |

---

## 5. Conclusion

### Short Conclusion
In this practical, we implemented a robust authentication and middleware pipeline for the Task Management application. Passwords were securely hashed using bcrypt prior to database storage, and stateless JWT tokens with 1-hour expiration were issued upon successful authentication. All task routes were protected using an authentication middleware that validates Bearer tokens, and server-side validation middleware was introduced to reject malformed requests prior to database access.

### Detailed Conclusion
In Practical 7, we advanced our full-stack web application by integrating industry-standard security and middleware design patterns.

Key competencies and learning outcomes achieved:
1. **Password Hashing & Data Security:** Utilized `bcryptjs` inside a Mongoose `pre('save')` hook with salt rounds to ensure plaintext passwords are never stored in the database.
2. **Stateless JWT Authentication:** Implemented JSON Web Token (JWT) generation during login and registration with a defined expiry (1 hour), eliminating server-side session state.
3. **Express Middleware Pipeline:** Designed a multi-stage request pipeline where incoming requests sequentially traverse global middleware (CORS, JSON parsing), authentication middleware (`Bearer <token>` verification), and input validation middleware prior to reaching controller logic.
4. **Input Validation & Sanitization:** Constructed dedicated validation middleware to inspect incoming request bodies and reject invalid or malformed data with structured HTTP 400 responses before any database interaction occurs.
5. **Full-Stack Security Integration:** Updated the frontend client to store JWT tokens in `localStorage`, attach `Authorization: Bearer <token>` headers to all protected requests, and provide an interactive Login/Register/Logout UI.
