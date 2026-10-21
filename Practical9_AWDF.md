# Practical 9: In-Memory Caching and Query Optimization

* **Course:** Advanced Web Development Frameworks (AWDF)
* **CO / PO:** CO2, CO4 / PO3, PO5
* **Objective:** To implement server-side caching and measure its impact on API response time.

---

## 1. Architecture & Cache Flow Diagram

```text
GET /tasks (Read Pipeline)
         │
         ▼
[Auth Middleware] (verifies JWT token, attaches req.user)
         │
         ▼
[Cache Check: node-cache]
         ├───► HIT  ──► Return cached JSON immediately (Header: X-Cache: HIT, ~1-2 ms)
         │
         └───► MISS ──► Query MongoDB with .lean() and index { user: 1, createdAt: -1 }
                         │
                         ├──► Store query results in node-cache (TTL = 60s)
                         │
                         └──► Return fresh JSON (Header: X-Cache: MISS, ~15-20 ms)

POST / PUT / DELETE /tasks (Write Pipeline)
         │
         ▼
[Auth Middleware] ──► [Input Validation]
         │
         ▼
Execute Write on MongoDB (Task.create / findByIdAndUpdate / findByIdAndDelete)
         │
         ▼
[Cache Invalidation] ──► Invalidate cache key (tasks_user_<id> & tasks_global)
         │
         ▼
Return updated task (Header: X-Cache-Invalidated: true)
(Guarantees subsequent GET reads never serve stale data)
```

---

## 2. Key Implementations

### A. Cache Configuration & Helper Functions (`backend/config/cache.js`)
Configured `node-cache` with a 60-second Time-To-Live (TTL) and helper methods to generate user-scoped keys and handle cache invalidation:

```javascript
const NodeCache = require('node-cache');

// Practical 9: In-Memory Cache configuration
// stdTTL: 60 seconds (default Time-To-Live)
// checkperiod: 120 seconds (automatic background cleanup)
// useClones: false (optimized memory & zero cloning overhead)
const taskCache = new NodeCache({
    stdTTL: 60,
    checkperiod: 120,
    useClones: false,
});

// Helper function to generate user-scoped cache keys
const getTaskCacheKey = (userId) => {
    return userId ? `tasks_user_${userId}` : 'tasks_global';
};

// Helper function to invalidate cache on POST, PUT, DELETE write operations
const invalidateTaskCache = (userId) => {
    if (userId) {
        taskCache.del(`tasks_user_${userId}`);
    }
    taskCache.del('tasks_global');

    // Purge any remaining task keys to guarantee stale data is never served
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
```

---

### B. Controller Integration (`backend/controllers/taskController.js`)
1. **Cache-first Read (`getAllTasks`):**
   Checks `taskCache` first; on MISS, executes an indexed MongoDB query using `.lean()`, caches the result for 60 seconds, and tags the response header.
2. **Cache Invalidation on Writes (`createTask`, `updateTask`, `deleteTask`):**
   Immediately purges the user's cached dataset upon any modification to prevent stale reads.

```javascript
// GET /tasks — Cache check -> HIT return | MISS query DB & cache
const getAllTasks = async (req, res, next) => {
    try {
        const cacheKey = getTaskCacheKey(req.user ? req.user._id : null);

        // 1. In-Memory Cache Check
        const cachedTasks = taskCache.get(cacheKey);
        if (cachedTasks) {
            res.set('X-Cache', 'HIT');
            return res.status(200).json(cachedTasks);
        }

        // 2. Cache MISS: Query MongoDB
        const query = req.user
            ? { $or: [{ user: req.user._id }, { user: { $exists: false } }, { user: null }] }
            : {};

        // Query Optimization: .lean() returns plain JS objects, avoiding Mongoose document hydration overhead
        const tasks = await Task.find(query).sort({ createdAt: -1 }).lean();

        // 3. Store in cache for 60 seconds
        taskCache.set(cacheKey, tasks, 60);

        res.set('X-Cache', 'MISS');
        res.status(200).json(tasks);
    } catch (err) {
        next(err);
    }
};

// POST /tasks — Write to DB and invalidate cache
const createTask = async (req, res, next) => {
    try {
        const newTask = await Task.create({
            ...req.body,
            user: req.user ? req.user._id : undefined,
        });

        // Invalidate cache immediately
        invalidateTaskCache(req.user ? req.user._id : null);
        res.set('X-Cache-Invalidated', 'true');

        res.status(201).json(newTask);
    } catch (err) {
        next(err);
    }
};
```

---

### C. Database Query Optimization (`backend/models/taskModel.js`)
Created a compound index on `{ user: 1, createdAt: -1 }` to convert sorted read queries from full collection scans (`COLLSCAN`) to fast index scans (`IXSCAN`):

```javascript
// Practical 9: Query Optimization Indexing
// Compound index on user and createdAt speeds up sorted task queries
taskSchema.index({ user: 1, createdAt: -1 });
```

---

### D. Server Response-Time Tracking Header (`backend/server.js`)
Added a high-resolution time measurement middleware (`process.hrtime`) exposing exact execution durations via `X-Response-Time`:

```javascript
app.use((req, res, next) => {
    const start = process.hrtime();
    const originalSend = res.send;
    res.send = function (body) {
        const diff = process.hrtime(start);
        const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
        res.set('X-Response-Time', `${timeInMs}ms`);
        return originalSend.call(this, body);
    };
    next();
});
```

---

## 3. Performance Measurement: Cached vs Uncached

API response times were measured for `GET /tasks` using Postman / Thunder Client / HTTP benchmarking across 3 separate sample trials:

### Sample Readings Comparison Table

| Trial Sample | Uncached / Cache MISS (`X-Cache: MISS`) | Cached / Cache HIT (`X-Cache: HIT`) | Latency Reduction |
| :--- | :--- | :--- | :--- |
| **Reading 1** | **15.84 ms** (Cold Database Query) | **2.76 ms** (In-Memory NodeCache) | **82.5% faster** |
| **Reading 2** | **5.13 ms** (Indexed MongoDB Query) | **1.84 ms** (In-Memory NodeCache) | **64.1% faster** |
| **Reading 3** | **3.18 ms** (Indexed MongoDB Query) | **1.56 ms** (In-Memory NodeCache) | **50.9% faster** |
| **Average Response Time** | **8.05 ms** (Server Processing) | **2.05 ms** (Server Processing) | **~74.5% overall latency reduction** |

---

### Cache Invalidation Verification

When a write operation was performed (`POST /tasks`, `PUT /tasks/:id`, or `DELETE /tasks/:id`), the backend:
1. Committed changes directly to MongoDB.
2. Purged the user key (`tasks_user_<id>`) from `node-cache`.
3. Set the response header `X-Cache-Invalidated: true`.
4. The immediate subsequent `GET /tasks` registered `X-Cache: MISS`, re-queried MongoDB with fresh data, and re-cached the new state.

---

### Cache Statistics Endpoint (`GET /tasks/cache/stats`)

The dedicated stats route provides real-time verification of cache hits, misses, active keys, and memory consumption:

```json
{
  "message": "In-memory task cache status",
  "ttlSeconds": 60,
  "keys": [
    "tasks_user_6ad8ba5fe7dd5ee298cf1cd9"
  ],
  "stats": {
    "hits": 3,
    "misses": 4,
    "keys": 1,
    "ksize": 35,
    "vsize": 320
  }
}
```

---

## 4. Summary of Improvements
1. **Database Offloading:** Repetitive read queries are served directly from RAM without querying MongoDB or holding database connections.
2. **Zero Stale Data:** Immediate cache invalidation on write events ensures strong read-after-write consistency.
3. **Mongoose Optimization:** Usage of `.lean()` and compound index `{ user: 1, createdAt: -1 }` ensures that even cache-miss queries execute in minimal time.
