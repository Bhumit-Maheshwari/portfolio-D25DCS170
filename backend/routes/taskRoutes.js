const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');
const validateTaskId = require('../middleware/validateTaskId');
const {
    validateTaskCreate,
    validateTaskUpdate,
} = require('../middleware/validateTaskInput');

// ===== Protect ALL task routes with JWT Authentication Middleware =====
// Client Request (Authorization: Bearer <token>) -> [Auth Middleware] -> req.user set
router.use(authMiddleware);

// ===== Task Routes Pipeline =====
// [Auth Middleware] -> [Validation Middleware] -> Controller
router.get('/', taskController.getAllTasks);
router.get('/:id', validateTaskId, taskController.getTaskById);
router.post('/', validateTaskCreate, taskController.createTask);
router.put('/:id', validateTaskId, validateTaskUpdate, taskController.updateTask);
router.delete('/:id', validateTaskId, taskController.deleteTask);

module.exports = router;
