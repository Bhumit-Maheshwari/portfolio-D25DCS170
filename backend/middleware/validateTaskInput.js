// ===== Task Input Validation Middleware =====
// Rejects malformed requests before they reach the database layer

const validateTaskCreate = (req, res, next) => {
    const { title, priority, description } = req.body;
    const errors = [];

    // Check title presence and type
    if (title === undefined || title === null) {
        errors.push('Task title is required');
    } else if (typeof title !== 'string') {
        errors.push('Task title must be a string');
    } else if (title.trim().length === 0) {
        errors.push('Task title cannot be empty or only whitespace');
    } else if (title.trim().length > 150) {
        errors.push('Task title cannot exceed 150 characters');
    }

    // Check priority if supplied
    if (priority !== undefined) {
        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(priority)) {
            errors.push('Priority must be one of: low, medium, high');
        }
    }

    // Check description type if supplied
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

    // If title is being updated, it must not be empty
    if (title !== undefined) {
        if (typeof title !== 'string') {
            errors.push('Task title must be a string');
        } else if (title.trim().length === 0) {
            errors.push('Task title cannot be empty');
        } else if (title.trim().length > 150) {
            errors.push('Task title cannot exceed 150 characters');
        }
    }

    // If priority is being updated
    if (priority !== undefined) {
        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(priority)) {
            errors.push('Priority must be one of: low, medium, high');
        }
    }

    // If completed is being updated
    if (completed !== undefined && typeof completed !== 'boolean') {
        errors.push('Completed status must be a boolean');
    }

    // If description is being updated
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
