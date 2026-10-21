const NodeCache = require('node-cache');

/**
 * Practical 9: In-Memory Caching and Query Optimization
 * Configures NodeCache with:
 * - stdTTL: 60 seconds (Time-to-Live for cached responses)
 * - checkperiod: 120 seconds (background expired keys cleanup)
 * - useClones: false (optimized memory & zero cloning overhead)
 */
const taskCache = new NodeCache({
    stdTTL: 60,
    checkperiod: 120,
    useClones: false,
});

/**
 * Generates user-scoped or global cache key
 * @param {string|mongoose.Types.ObjectId} [userId]
 * @returns {string} Cache key
 */
const getTaskCacheKey = (userId) => {
    return userId ? `tasks_user_${userId}` : 'tasks_global';
};

/**
 * Invalidates cache on write operations (POST, PUT, DELETE)
 * Guarantees stale data is never served to any client.
 * @param {string|mongoose.Types.ObjectId} [userId]
 */
const invalidateTaskCache = (userId) => {
    if (userId) {
        taskCache.del(`tasks_user_${userId}`);
    }
    taskCache.del('tasks_global');

    // Purge any remaining task keys to ensure total cache consistency
    const allKeys = taskCache.keys();
    const taskKeys = allKeys.filter((k) => k.startsWith('tasks_'));
    if (taskKeys.length > 0) {
        taskCache.del(taskKeys);
    }
};

module.exports = {
    taskCache,
    getTaskCacheKey,
    invalidateTaskCache,
};
