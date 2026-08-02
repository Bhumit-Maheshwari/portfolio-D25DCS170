// Validates that :id param is a positive number
const validateTaskId = (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid task ID. Must be a positive number.' });
    }
    req.taskId = id;
    next();
};

module.exports = validateTaskId;
