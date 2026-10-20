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
