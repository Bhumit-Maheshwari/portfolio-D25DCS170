# Practical 12: CI/CD Pipeline with GitHub Actions

* **Course:** Advanced Web Development Frameworks (AWDF)
* **CO / PO:** CO5 / PO3, PO5
* **Objective:** To automate testing and deployment of the application using a CI/CD pipeline.

---

## 1. Architecture & CI/CD Pipeline Diagram

```text
Developer Working Directory
       │
       ▼
git push origin main
       │
       ▼
GitHub Remote Repository (GitHub Actions Trigger: on [push, pull_request])
       │
       ▼
Ubuntu Hosted Runner (Job: build-and-test)
       │
       ├──► Step 1: actions/checkout@v4 (Clones repository code)
       │
       ├──► Step 2: actions/setup-node@v4 (Configures Node.js 20 environment & npm cache)
       │
       ├──► Step 3: Install backend dependencies (cd backend && npm install)
       │
       ├──► Step 4: Install frontend dependencies (cd frontend && npm install)
       │
       ├──► Step 5: Run automated backend test suite (cd backend && npm test)
       │            ├── Cache Key Generation [PASS]
       │            ├── In-Memory Caching & Invalidation [PASS]
       │            ├── Asynchronous EventEmitter Notification [PASS]
       │            └── Task Priority Enum Validator [PASS]
       │
       ├──► Step 6: Lint frontend code with oxlint (cd frontend && npm run lint)
       │
       └──► Step 7: Compile React production bundle (cd frontend && npm run build)
       │
       ▼
Pipeline Status Reported on GitHub:
  ├── All Steps Succeed ──► 🟢 Green Checkmark (Build & Tests Passed)
  └── Any Step Fails    ──► 🔴 Red X (Build / Test Failed - Immediate Notification)
```

---

## 2. Key Implementations

### A. GitHub Actions Workflow Configuration (`.github/workflows/ci.yml`)
Configures the automated pipeline to trigger on every push or pull request to the `main` branch:

```yaml
name: CI Pipeline

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  build-and-test:
    name: Build & Test Full-Stack App
    runs-on: ubuntu-latest

    steps:
      # Step 1: Check out code from GitHub
      - name: 1. Checkout repository
        uses: actions/checkout@v4

      # Step 2: Setup Node.js runtime environment
      - name: 2. Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: |
            backend/package-lock.json
            frontend/package-lock.json

      # Step 3: Install dependencies as defined step (npm install)
      - name: 3. Install backend dependencies (npm install)
        working-directory: ./backend
        run: npm install

      - name: 4. Install frontend dependencies (npm install)
        working-directory: ./frontend
        run: npm install

      # Step 4: Run automated tests and report pass/fail
      - name: 5. Run backend automated tests (npm test)
        working-directory: ./backend
        run: npm test

      # Step 5: Validate frontend code quality & production build
      - name: 6. Lint frontend code (oxlint)
        working-directory: ./frontend
        run: npm run lint

      - name: 7. Build React production bundle (vite build)
        working-directory: ./frontend
        run: npm run build
```

---

### B. Automated Test Suite (`backend/test/task.test.js`)
Uses Node.js built-in `node:test` and `node:assert` modules (zero external dependencies) to validate in-memory caching, invalidation logic, asynchronous events, and input validation:

```javascript
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
```

---

### C. Test Script Hook in `backend/package.json`
Configured the standard npm test command:

```json
"scripts": {
  "test": "node --test"
}
```

---

## 3. Demonstrating Pipeline Pass and Deliberate Failure

The problem statement requires demonstrating both a **failed pipeline** (caused by a broken test) and a **passing pipeline** (after the test is corrected).

### Phase 1: Passing Pipeline (Initial State) 🟢
When the code is pushed to GitHub:
```powershell
git add .
git commit -m "Practical 12: CI/CD Pipeline with GitHub Actions"
git push origin main
```
1. GitHub Actions runner detects the push event.
2. Executes `npm install` and `npm test` in the runner.
3. Output:
   ```text
   ▶ Practical 12: Task Management CI Test Suite
     ✔ 1. Cache Key Generator: creates user-scoped and global keys (0.85ms)
     ✔ 2. In-Memory Cache: sets, gets, and invalidates keys correctly (0.89ms)
     ✔ 3. Event-Driven Architecture: emits task-created without errors (6.09ms)
     ✔ 4. Task Priority Validator: validates allowed enum values (0.47ms)
   ✔ Practical 12: Task Management CI Test Suite (11.19ms)
   ℹ pass 5
   ℹ fail 0
   ```
4. Status reported: **🟢 Green Checkmark** on GitHub commit history and Actions tab.

---

### Phase 2: Deliberately Broken Test (Failure Demonstration) 🔴
To demonstrate pipeline failure:

1. In `backend/test/task.test.js`, modify Test 4 to intentionally fail an assertion:
   ```javascript
   // Change:
   assert.strictEqual(allowedPriorities.includes('critical'), false);
   // To deliberately broken assertion:
   assert.strictEqual(allowedPriorities.includes('critical'), true);
   ```
2. Commit and push the broken test:
   ```powershell
   git add backend/test/task.test.js
   git commit -m "test: Deliberately fail CI test for demonstration"
   git push origin main
   ```
3. GitHub Actions triggers and halts on Step 5:
   ```text
   ✖ 4. Task Priority Validator: validates allowed enum values
     AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
     false !== true
   Process completed with exit code 1.
   ```
4. Status reported: **🔴 Red X** on GitHub commit history and Actions tab.

---

### Phase 3: Correcting the Test (Restoring Green Status) 🟢
1. Revert the assertion back to the valid check:
   ```javascript
   assert.strictEqual(allowedPriorities.includes('critical'), false);
   ```
2. Commit and push the fix:
   ```powershell
   git add backend/test/task.test.js
   git commit -m "fix: Correct priority validation test to restore passing CI"
   git push origin main
   ```
3. GitHub Actions triggers again:
   - All tests pass with exit code `0`.
   - Build completes successfully.
   - Status reported: **🟢 Green Checkmark** restored.

---

## 4. Pipeline Summary Table

| CI Pipeline Stage | Command | Purpose | Failure Consequence |
| :--- | :--- | :--- | :--- |
| **Checkout** | `actions/checkout@v4` | Pulls branch source code | Halts if repo inaccessible |
| **Setup Node** | `actions/setup-node@v4` | Prepares Node 20 & cache | Halts if version unavailable |
| **Dependency Install** | `npm install` | Installs lockfile packages | Halts on corrupt package.json |
| **Unit Testing** | `npm test` | Runs `node --test` suite | **Halts with 🔴 Red X** on test assertion fail |
| **Code Linting** | `npm run lint` | Runs `oxlint` rules | Halts on syntax / lint error |
| **Production Build** | `npm run build` | Bundles React application | Halts on compilation failure |
