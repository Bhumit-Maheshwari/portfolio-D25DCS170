const express = require('express');
const cors = require('cors');
const { PORT } = require('./config/config');
const connectDB = require('./config/db');
const logger = require('./middleware/logger');
const validateContentType = require('./middleware/validateContentType');
const errorHandler = require('./middleware/errorHandler');
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// ===== Connect to MongoDB =====
connectDB();

// ===== Global Middleware =====
app.use(cors());
app.use(express.json());

// Practical 9: Response-time tracking header middleware for performance benchmarking
app.use((req, res, next) => {
    const start = process.hrtime();
    const originalSend = res.send;
    res.send = function (body) {
        const diff = process.hrtime(start);
        const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
        res.set('X-Response-Time', `${timeInMs}ms`);
        return originalSend.call(this, body);
    };
    next();
});

app.use(logger);
app.use(validateContentType);

// ===== Auth Routes (Public: /register, /login; Protected: /me) =====
app.use('/auth', authRoutes);
app.use('/', authRoutes); // Supports POST /register and POST /login directly

// ===== Protected Task Routes =====
app.use('/tasks', taskRoutes);

// ===== 404 Handler =====
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// ===== Global Error Handler (must be last) =====
app.use(errorHandler);

// ===== Start Server =====
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
