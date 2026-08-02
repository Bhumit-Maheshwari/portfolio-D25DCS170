const express = require('express');
const { PORT } = require('./config/config');
const logger = require('./middleware/logger');
const validateContentType = require('./middleware/validateContentType');
const errorHandler = require('./middleware/errorHandler');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

// ===== Global Middleware =====
app.use(express.json());
app.use(logger);
app.use(validateContentType);

// ===== Routes =====
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
