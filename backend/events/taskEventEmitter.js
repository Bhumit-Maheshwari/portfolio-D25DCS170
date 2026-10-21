const EventEmitter = require('events');

/**
 * Practical 10: Asynchronous Processing with Event-Driven Architecture
 * Using Node.js native EventEmitter without external dependencies.
 */
class TaskEventEmitter extends EventEmitter {}

const taskEvents = new TaskEventEmitter();

// In-memory audit log of background notifications
const notificationLogs = [];

/**
 * Event Listener: 'task-created'
 * Handled asynchronously using setImmediate() so the main API response
 * is returned to the client immediately without waiting for the notification
 * processing or logging to complete.
 */
taskEvents.on('task-created', (taskData) => {
    // Asynchronous background execution: deferred to the event loop's check phase
    setImmediate(() => {
        const handlerTime = new Date();
        const handlerIso = handlerTime.toISOString();
        const apiTime = new Date(taskData.apiResponseTime);
        const delayMs = handlerTime.getTime() - apiTime.getTime();

        const notification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            event: 'task-created',
            taskId: taskData.taskId,
            title: taskData.title,
            assignedUser: taskData.user || 'Unassigned',
            apiResponseTimestamp: taskData.apiResponseTime,
            handlerExecutionTimestamp: handlerIso,
            executionDelayMs: Math.max(0, delayMs),
            message: `Background notification dispatched for task: "${taskData.title}" assigned to ${taskData.user || 'Unassigned'}`,
        };

        notificationLogs.unshift(notification);
        if (notificationLogs.length > 50) {
            notificationLogs.pop();
        }

        console.log('\n============================================================');
        console.log('🔔 [EVENT HANDLER - ASYNCHRONOUS NOTIFICATION]');
        console.log(`   Task Title:          "${taskData.title}"`);
        console.log(`   Assigned User:       ${taskData.user || 'Unassigned'}`);
        console.log(`   API Responded At:    ${taskData.apiResponseTime}`);
        console.log(`   Handler Executed At: ${handlerIso} (+${delayMs}ms after API response)`);
        console.log('   Execution Mode:      Non-blocking background processing');
        console.log('============================================================\n');
    });
});

/**
 * Helper to fetch all recorded notification logs
 */
const getNotificationLogs = () => {
    return notificationLogs;
};

/**
 * Helper to clear notification logs (useful for benchmarking)
 */
const clearNotificationLogs = () => {
    notificationLogs.length = 0;
};

module.exports = {
    taskEvents,
    getNotificationLogs,
    clearNotificationLogs,
};
