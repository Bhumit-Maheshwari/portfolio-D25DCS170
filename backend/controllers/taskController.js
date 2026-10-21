const Task = require('../models/taskModel');
const {
    taskCache,
    getTaskCacheKey,
    invalidateTaskCache,
} = require('../config/cache');
const {
    taskEvents,
    getNotificationLogs,
} = require('../events/taskEventEmitter');

// GET /tasks — Retrieve all tasks for the authenticated user from MongoDB (with node-cache)
const getAllTasks = async (req, res, next) => {
    try {
        const cacheKey = getTaskCacheKey(req.user ? req.user._id : null);

        // 1. Cache Check (node-cache)
        const cachedTasks = taskCache.get(cacheKey);
        if (cachedTasks) {
            // CACHE HIT: Return in-memory data immediately
            res.set('X-Cache', 'HIT');
            return res.status(200).json(cachedTasks);
        }

        // 2. CACHE MISS: Query MongoDB
        const query = req.user
            ? { $or: [{ user: req.user._id }, { user: { $exists: false } }, { user: null }] }
            : {};

        // Query Optimization: .lean() skips Mongoose document hydration for faster read performance
        const tasks = await Task.find(query).sort({ createdAt: -1 }).lean();

        // 3. Store in node-cache with 60 seconds TTL
        taskCache.set(cacheKey, tasks, 60);

        res.set('X-Cache', 'MISS');
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

// POST /tasks — Create a new task in MongoDB, invalidate cache, & emit 'task-created' asynchronously
const createTask = async (req, res, next) => {
    try {
        const taskData = {
            ...req.body,
            user: req.user ? req.user._id : undefined,
        };
        const newTask = await Task.create(taskData);

        // Invalidate cache so stale data is never served on subsequent reads (Practical 9)
        invalidateTaskCache(req.user ? req.user._id : null);
        res.set('X-Cache-Invalidated', 'true');

        // Check if synchronous mode was explicitly requested for demonstration
        const isSync = req.query.mode === 'sync' || req.headers['x-execution-mode'] === 'sync';

        if (isSync) {
            // Synchronous Demonstration: blocks before returning response
            const syncStartTime = new Date();
            const startMs = Date.now();
            // Simulate synchronous 100ms blocking work
            while (Date.now() - startMs < 100) {}
            const syncFinishTime = new Date().toISOString();

            console.log('\n[SYNCHRONOUS EXECUTION]');
            console.log(`   Task Title:          "${newTask.title}"`);
            console.log(`   Handler Started At:  ${syncStartTime.toISOString()}`);
            console.log(`   Handler Finished At: ${syncFinishTime}`);
            console.log('   API Response delayed until handler finished (~100ms delay)\n');

            res.set('X-Execution-Mode', 'synchronous');
            return res.status(201).json(newTask);
        }

        // Asynchronous Execution (Practical 10 Default):
        // 1. Record API response timestamp
        const apiResponseTimestamp = new Date().toISOString();
        console.log(`\n[API RESPONSE] (201 Created) Returned immediately to client at: ${apiResponseTimestamp}`);

        // 2. Emit 'task-created' event handled in background without blocking API
        taskEvents.emit('task-created', {
            taskId: newTask._id,
            title: newTask.title,
            user: req.user ? (req.user.username || req.user.email || req.user._id) : 'Unassigned',
            apiResponseTime: apiResponseTimestamp,
        });

        // 3. Return response immediately before event handler executes
        res.set('X-Execution-Mode', 'asynchronous');
        return res.status(201).json(newTask);
    } catch (err) {
        // Handle Mongoose validation errors with structured JSON
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ error: 'Validation failed', details: messages });
        }
        next(err);
    }
};

// PUT /tasks/:id — Update a task in MongoDB (and invalidate cache)
const updateTask = async (req, res, next) => {
    try {
        const task = await Task.findByIdAndUpdate(req.taskId, req.body, {
            returnDocument: 'after', // Return updated document
            runValidators: true,     // Apply schema validation on update
        });

        if (!task) {
            return res.status(404).json({ error: `Task with ID ${req.taskId} not found` });
        }

        // Invalidate cache so stale data is never served on subsequent reads
        invalidateTaskCache(req.user ? req.user._id : null);
        res.set('X-Cache-Invalidated', 'true');

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

// DELETE /tasks/:id — Delete a task from MongoDB (and invalidate cache)
const deleteTask = async (req, res, next) => {
    try {
        const task = await Task.findByIdAndDelete(req.taskId);

        if (!task) {
            return res.status(404).json({ error: `Task with ID ${req.taskId} not found` });
        }

        // Invalidate cache so stale data is never served on subsequent reads
        invalidateTaskCache(req.user ? req.user._id : null);
        res.set('X-Cache-Invalidated', 'true');

        res.status(200).json({ message: 'Task deleted', task });
    } catch (err) {
        next(err);
    }
};

// GET /tasks/cache/stats — Inspect cache statistics (hit/miss counters, active keys)
const getCacheStats = (req, res) => {
    const stats = taskCache.getStats();
    const keys = taskCache.keys();
    res.status(200).json({
        message: 'In-memory task cache status',
        ttlSeconds: 60,
        keys,
        stats,
    });
};

// GET /tasks/notifications — Inspect background event notifications (Practical 10)
const getNotifications = (req, res) => {
    const logs = getNotificationLogs();
    res.status(200).json({
        message: 'Background event-driven notification logs',
        count: logs.length,
        notifications: logs,
    });
};

module.exports = {
    getAllTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    getCacheStats,
    getNotifications,
};
