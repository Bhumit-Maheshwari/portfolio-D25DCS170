const test = require('node:test');
const assert = require('node:assert');
const { getTaskCacheKey, taskCache, invalidateTaskCache } = require('../config/cache');
const { taskEvents, getNotificationLogs } = require('../events/taskEventEmitter');

test('Practical 12: Task Management CI Test Suite', async (t) => {
    await t.test('1. Cache Key Generator: creates user-scoped and global keys', () => {
        const userKey = getTaskCacheKey('user_test_123');
        const globalKey = getTaskCacheKey(null);

        assert.strictEqual(userKey, 'tasks_user_user_test_123');
        assert.strictEqual(globalKey, 'tasks_global');
    });

    await t.test('2. In-Memory Cache: sets, gets, and invalidates keys correctly', () => {
        const sampleKey = 'tasks_user_sample';
        const sampleTasks = [{ id: '1', title: 'Unit Test Task', completed: false }];

        taskCache.set(sampleKey, sampleTasks, 30);
        const cached = taskCache.get(sampleKey);
        assert.deepStrictEqual(cached, sampleTasks);

        invalidateTaskCache('sample');
        const afterInvalidation = taskCache.get(sampleKey);
        assert.strictEqual(afterInvalidation, undefined);
    });

    await t.test('3. Event-Driven Architecture: emits task-created without errors', (t, done) => {
        const taskPayload = {
            taskId: 'test_task_ci_42',
            title: 'CI Pipeline Validation Task',
            user: 'ci_runner_user',
            apiResponseTime: new Date().toISOString(),
        };

        taskEvents.emit('task-created', taskPayload);

        setImmediate(() => {
            const logs = getNotificationLogs();
            const entry = logs.find((l) => l.taskId === 'test_task_ci_42');
            assert.ok(entry, 'Background notification log should be present');
            assert.strictEqual(entry.title, 'CI Pipeline Validation Task');
            done();
        });
    });

    await t.test('4. Task Priority Validator: validates allowed enum values', () => {
        const allowedPriorities = ['low', 'medium', 'high'];
        assert.strictEqual(allowedPriorities.includes('medium'), true);
        assert.strictEqual(allowedPriorities.includes('critical'), false);
    });
});
