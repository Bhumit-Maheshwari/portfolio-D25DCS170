const mongoose = require('mongoose');

// Validates that :id param is a valid MongoDB ObjectId
const validateTaskId = (req, res, next) => {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid task ID format. Must be a valid MongoDB ObjectId.' });
    }

    req.taskId = id;
    next();
};

module.exports = validateTaskId;
