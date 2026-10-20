const Task = require('../models/taskModel');

// GET /tasks — Retrieve all tasks for the authenticated user from MongoDB
const getAllTasks = async (req, res, next) => {
    try {
        const query = req.user
            ? { $or: [{ user: req.user._id }, { user: { $exists: false } }, { user: null }] }
            : {};
        const tasks = await Task.find(query).sort({ createdAt: -1 });
        res.status(200).json(tasks);
    } catch (err) {
        next(err);
    }
};

// GET /tasks/:id — Retrieve a single task by ID
const getTaskById = async (req, res, next) => {
    try {
        const task = await Task.findById(req.taskId);

        if (!task) {
            return res.status(404).json({ error: `Task with ID ${req.taskId} not found` });
        }

        res.status(200).json(task);
    } catch (err) {
        next(err);
    }
};

// POST /tasks — Create a new task in MongoDB
const createTask = async (req, res, next) => {
    try {
        const taskData = {
            ...req.body,
            user: req.user ? req.user._id : undefined,
        };
        const newTask = await Task.create(taskData);
        res.status(201).json(newTask);
    } catch (err) {
        // Handle Mongoose validation errors with structured JSON
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ error: 'Validation failed', details: messages });
        }
        next(err);
    }
};

// PUT /tasks/:id — Update a task in MongoDB
const updateTask = async (req, res, next) => {
    try {
        const task = await Task.findByIdAndUpdate(req.taskId, req.body, {
            returnDocument: 'after', // Return updated document
            runValidators: true,     // Apply schema validation on update
        });

        if (!task) {
            return res.status(404).json({ error: `Task with ID ${req.taskId} not found` });
        }

        res.status(200).json(task);
    } catch (err) {
        // Handle Mongoose validation errors with structured JSON
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ error: 'Validation failed', details: messages });
        }
        next(err);
    }
};

// DELETE /tasks/:id — Delete a task from MongoDB
const deleteTask = async (req, res, next) => {
    try {
        const task = await Task.findByIdAndDelete(req.taskId);

        if (!task) {
            return res.status(404).json({ error: `Task with ID ${req.taskId} not found` });
        }

        res.status(200).json({ message: 'Task deleted', task });
    } catch (err) {
        next(err);
    }
};

module.exports = { getAllTasks, getTaskById, createTask, updateTask, deleteTask };
