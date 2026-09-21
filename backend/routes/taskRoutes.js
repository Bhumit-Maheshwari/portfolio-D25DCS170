const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const validateTaskId = require('../middleware/validateTaskId');

router.get('/', taskController.getAllTasks);
router.get('/:id', validateTaskId, taskController.getTaskById);
router.post('/', taskController.createTask);
router.put('/:id', validateTaskId, taskController.updateTask);
router.delete('/:id', validateTaskId, taskController.deleteTask);

module.exports = router;
