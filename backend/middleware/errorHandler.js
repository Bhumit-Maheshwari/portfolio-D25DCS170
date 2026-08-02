// Global error handler — must be the LAST middleware
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ error: 'Something went wrong' });
};

module.exports = errorHandler;
