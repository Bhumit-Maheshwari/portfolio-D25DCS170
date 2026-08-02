const Task = require('../models/taskModel');

// GET /tasks
const getAllTasks = (req, res) => {
    const tasks = Task.getAllTasks();
    res.status(200).json(tasks);
};

// POST /tasks
const createTask = (req, res) => {
    const { title } = req.body;

    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Task title is required' });
    }

    const newTask = Task.createTask(title);
    res.status(201).json(newTask);
};

// PUT /tasks/:id
const updateTask = (req, res) => {
    const task = Task.updateTask(req.taskId, req.body);

    if (!task) {
        return res.status(404).json({ error: `Task with ID ${req.taskId} not found` });
    }

    res.status(200).json(task);
};

// DELETE /tasks/:id
const deleteTask = (req, res) => {
    const task = Task.deleteTask(req.taskId);

    if (!task) {
        return res.status(404).json({ error: `Task with ID ${req.taskId} not found` });
    }

    res.status(200).json({ message: 'Task deleted', task });
};

module.exports = { getAllTasks, createTask, updateTask, deleteTask };
