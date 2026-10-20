# Practical 6: Full Stack Integration (React + Node.js + Express + MongoDB)

* **Course:** Advanced Web Development Frameworks (AWDF)
* **CO / PO:** CO1, CO2 / PO3, PO5
* **Objective:** To wire the React frontend to the Node.js/Express/MongoDB backend into a fully functional full-stack web application with complete CRUD capability, optimistic UI updates, and error handling.

---

## 1. Architecture & Data Flow

```text
  React Frontend (Vite)               Express Backend                  MongoDB
 [http://localhost:5173]          [http://localhost:5000]      [mongodb://localhost:27017]
         │                                   │                              │
         │─── 1. fetch('/tasks') ───────────>│                              │
         │                                   │─── 2. Task.find() ──────────>│
         │                                   │<── 3. Return documents ──────│
         │<── 4. JSON Array ─────────────────│                              │
         │                                   │                              │
         │─── 5. POST /tasks (New Task) ────>│                              │
         │                                   │─── 6. Task.create() ────────>│
         │<── 7. 201 Created + New Task ─────│                              │
         │                                   │                              │
         │─── 8. PUT /tasks/:id (Toggle) ───>│                              │
         │                                   │─── 9. findByIdAndUpdate() ──>│
         │                                   │                              │
         │─── 10. DELETE /tasks/:id ────────>│                              │
         │                                   │─── 11. findByIdAndDelete() ─>│
```

---

## 2. Key Source Code Files

### A. Backend: CORS & Server Configuration (`backend/server.js`)
Enables Cross-Origin Resource Sharing (`cors`) so the Vite React frontend (`localhost:5173`) can communicate with the Express API (`localhost:5000`):

```javascript
const express = require('express');
const cors = require('cors');
const { PORT } = require('./config/config');
const connectDB = require('./config/db');
const logger = require('./middleware/logger');
const validateContentType = require('./middleware/validateContentType');
const errorHandler = require('./middleware/errorHandler');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

// ===== Connect to MongoDB =====
connectDB();

// ===== Global Middleware =====
app.use(cors()); // Enables cross-origin requests from React frontend
app.use(express.json());
app.use(logger);
app.use(validateContentType);

// ===== Routes =====
app.use('/tasks', taskRoutes);

// ===== 404 Handler =====
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// ===== Global Error Handler =====
app.use(errorHandler);

// ===== Start Server =====
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
```

---

### B. Frontend: Centralized API Client (`frontend/src/api.js`)
Encapsulates all asynchronous `fetch` calls to backend endpoints:

```javascript
// ===== Central API Helper for Backend Communication =====
const BASE_URL = 'http://localhost:5000';

// GET /tasks — Fetch all tasks
export const getTasks = async () => {
    const res = await fetch(`${BASE_URL}/tasks`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
};

// POST /tasks — Create a new task
export const createTask = async (taskData) => {
    const res = await fetch(`${BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create task');
    return data;
};

// PUT /tasks/:id — Update a task
export const updateTask = async (id, updates) => {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update task');
    return data;
};

// DELETE /tasks/:id — Delete a task
export const deleteTask = async (id) => {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
        method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete task');
    return data;
};
```

---

### C. Frontend: Tasks Component (`frontend/src/components/Tasks.jsx`)
Handles interactive CRUD actions, optimistic updates, rollback on failure, loading spinner, error retry, and toast notifications:

```jsx
import { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from '../api';

function Tasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [confirmDelete, setConfirmDelete] = useState(null);

    // ----- Form state -----
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [formLoading, setFormLoading] = useState(false);

    // ===== Toast helper =====
    const showToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    };

    // ===== Fetch all tasks =====
    const fetchTasks = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getTasks();
            setTasks(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    // ===== Create task (optimistic UI) =====
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        const tempId = 'temp-' + Date.now();
        const optimisticTask = {
            _id: tempId,
            title: title.trim(),
            description,
            priority,
            completed: false,
            createdAt: new Date().toISOString(),
        };

        // Optimistic: add to UI immediately
        setTasks((prev) => [optimisticTask, ...prev]);
        setTitle('');
        setDescription('');
        setPriority('medium');
        setFormLoading(true);

        try {
            const created = await createTask({
                title: optimisticTask.title,
                description: optimisticTask.description,
                priority: optimisticTask.priority,
            });
            // Replace temp task with real one from server
            setTasks((prev) =>
                prev.map((t) => (t._id === tempId ? created : t))
            );
            showToast('Task created successfully!');
        } catch (err) {
            // Rollback optimistic update
            setTasks((prev) => prev.filter((t) => t._id !== tempId));
            showToast(err.message, 'error');
        } finally {
            setFormLoading(false);
        }
    };

    // ===== Toggle completed =====
    const handleToggle = async (task) => {
        const prev = tasks;
        // Optimistic update
        setTasks((t) =>
            t.map((item) =>
                item._id === task._id
                    ? { ...item, completed: !item.completed }
                    : item
            )
        );

        try {
            await updateTask(task._id, { completed: !task.completed });
            showToast(
                task.completed ? 'Task marked as pending' : 'Task marked as completed!'
            );
        } catch (err) {
            setTasks(prev); // rollback
            showToast(err.message, 'error');
        }
    };

    // ===== Delete task =====
    const handleDelete = async (id) => {
        const prev = tasks;
        setConfirmDelete(null);

        // Optimistic removal
        setTasks((t) => t.filter((item) => item._id !== id));

        try {
            await deleteTask(id);
            showToast('Task deleted successfully!');
        } catch (err) {
            setTasks(prev); // rollback
            showToast(err.message, 'error');
        }
    };

    // ===== Loading state =====
    if (loading) {
        return (
            <div className="page spinner-container">
                <div className="spinner"></div>
                <p>Loading tasks...</p>
            </div>
        );
    }

    // ===== Error state =====
    if (error) {
        return (
            <div className="page error-container">
                <h2>⚠️ Something went wrong</h2>
                <p>{error}</p>
                <button className="retry-btn" onClick={fetchTasks}>
                    🔄 Retry
                </button>
            </div>
        );
    }

    return (
        <div className="page tasks-page">
            <h1>Task Manager</h1>
            <p className="page-subtitle">
                Full-stack CRUD — React + Express + MongoDB
            </p>

            {/* ===== Create Task Form ===== */}
            <form className="task-form" onSubmit={handleCreate}>
                <div className="task-form-row">
                    <input
                        type="text"
                        className="task-input"
                        placeholder="Task title *"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                    <select
                        className="task-select"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                    >
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🔴 High</option>
                    </select>
                </div>
                <input
                    type="text"
                    className="task-input task-desc-input"
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                <button
                    type="submit"
                    className="task-add-btn"
                    disabled={formLoading}
                >
                    {formLoading ? 'Adding...' : '➕ Add Task'}
                </button>
            </form>

            {/* ===== Task List ===== */}
            {tasks.length === 0 ? (
                <div className="tasks-empty">
                    <p>📋 No tasks yet. Create one above!</p>
                </div>
            ) : (
                <div className="tasks-list">
                    {tasks.map((task) => (
                        <div
                            key={task._id}
                            className={`task-card ${task.completed ? 'task-done' : ''}`}
                        >
                            <div className="task-card-left">
                                <button
                                    className="task-checkbox"
                                    onClick={() => handleToggle(task)}
                                    title={task.completed ? 'Mark as pending' : 'Mark as completed'}
                                >
                                    {task.completed ? '✅' : '⬜'}
                                </button>
                                <div className="task-info">
                                    <h3 className={task.completed ? 'task-title-done' : ''}>
                                        {task.title}
                                    </h3>
                                    {task.description && (
                                        <p className="task-description">{task.description}</p>
                                    )}
                                    <div className="task-meta">
                                        <span className={`priority-badge priority-${task.priority}`}>
                                            {task.priority}
                                        </span>
                                        <span className="task-date">
                                            {new Date(task.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                className="task-delete-btn"
                                onClick={() => setConfirmDelete(task._id)}
                                title="Delete task"
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ===== Confirmation Dialog ===== */}
            {confirmDelete && (
                <div className="confirm-overlay">
                    <div className="confirm-dialog">
                        <h3>Delete Task?</h3>
                        <p>This action cannot be undone.</p>
                        <div className="confirm-actions">
                            <button
                                className="confirm-cancel"
                                onClick={() => setConfirmDelete(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="confirm-delete"
                                onClick={() => handleDelete(confirmDelete)}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Toast Notifications ===== */}
            <div className="toast-container">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>
                        {toast.type === 'success' ? '✅' : '❌'} {toast.message}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Tasks;
```

---

### D. Routing Integration (`frontend/src/App.jsx` & `frontend/src/components/NavBar.jsx`)

**In `frontend/src/App.jsx`:**
```jsx
import Tasks from './components/Tasks';

// Inside <Routes>:
<Route path="/tasks" element={<Tasks />} />
```

**In `frontend/src/components/NavBar.jsx`:**
```jsx
<li>
    <Link to="/tasks" className={location.pathname === '/tasks' ? 'active' : ''}>
        Tasks
    </Link>
</li>
```

---

## 3. Step-by-Step Execution Guide

1. **Start the MongoDB Daemon** (if running locally):
   ```bash
   mongod
   ```
2. **Start the Backend Server**:
   ```bash
   cd backend
   node server.js
   ```
   *Expected Console Output:*
   ```text
   Server running on http://localhost:5000
   MongoDB connected: localhost
   ```
3. **Start the Frontend Application**:
   ```bash
   cd frontend
   npm run dev
   ```
   *Expected Output:* Access the application at `http://localhost:5173` and click on **Tasks** in the navigation bar.

---

## 4. Expected Outputs & Screenshot Checklist for Submission

| # | Screenshot Title | Action to Perform | Expected Output / What to Capture |
|---|------------------|-------------------|-----------------------------------|
| **1** | **Backend Server & MongoDB Init** | Run `node server.js` in the backend terminal. | Terminal displaying `Server running on http://localhost:5000` and `MongoDB connected: localhost`. |
| **2** | **Initial Loading State (Spinner)** | Refresh `http://localhost:5173/tasks` on throttled network. | Centered loading spinner with text *"Loading tasks..."* while GET request executes. |
| **3** | **Task Manager Interface** | Open `/tasks` in browser. | Task Manager header, task creation form (title, priority dropdown, description), and task list. |
| **4** | **Create Task (POST)** | Enter details and click **"➕ Add Task"**. | New task instantly displayed with priority badge and green toast notification: *"Task created successfully!"*. |
| **5** | **Update Task Status (PUT)** | Click on the task checkbox (`⬜`). | Task title crossed out, checkbox turns to `✅`, and toast: *"Task marked as completed!"*. |
| **6** | **Delete Confirmation Dialog** | Click the trash icon (`🗑️`) on a task card. | Modal overlay popup displaying *"Delete Task? This action cannot be undone."* with Cancel and Delete buttons. |
| **7** | **Delete Task (DELETE)** | Click **"Delete"** inside the modal. | Task removed from view + Green toast: *"Task deleted successfully!"*. |
| **8** | **Data Persistence Verification** | Reload the browser page (`F5`). | All updated and remaining tasks persist exactly as modified, confirming data is stored in MongoDB. |
| **9** | **Error Handling & Retry Flow** | Stop backend (`Ctrl + C`) and click **"Retry"** in frontend. | Red error box displaying *"Failed to fetch"* with **"🔄 Retry"** button and red toast notification. |
| **10** | **MongoDB Compass Collection Verification** | Open MongoDB Compass GUI at `mongodb://localhost:27017`. | View of `task-manager` database and `tasks` collection with actual documents containing `_id`, `title`, `completed`, `priority`, `createdAt`. |

---

## 5. Conclusion

### Short Conclusion
In this practical, we successfully connected the React frontend to the Node.js/Express backend and MongoDB database, establishing a complete full-stack web application. We implemented full CRUD operations through REST APIs, enabled CORS for secure cross-origin communication, and added optimistic UI updates with automatic rollback on network failure. Data persistence was verified across page refreshes and via direct MongoDB inspection.

### Detailed Conclusion
In Practical 6, the decoupled frontend and backend components developed in earlier practicals were wired together into an end-to-end full-stack MERN application. 

Key competencies and learning outcomes achieved:
1. **Cross-Origin Resource Sharing (CORS):** Configured CORS middleware on Express to permit cross-origin HTTP requests originating from the Vite development server (`localhost:5173`) to the backend API (`localhost:5000`).
2. **Centralized API Abstraction:** Created a modular client service (`api.js`) encapsulating standard asynchronous `fetch` calls, maintaining clean separation between application UI components and HTTP communication logic.
3. **Interactive End-to-End CRUD:** Linked interactive React form components directly to backend routes for creating tasks (`POST`), reading task documents (`GET`), updating completion status (`PUT`), and removing items (`DELETE`).
4. **Optimistic UI & Error Resilience:** Implemented optimistic state updates to ensure instantaneous user feedback, supported by automated state rollback and toast notifications in the event of request failures.
5. **Persistent Storage:** Confirmed that client interactions directly manipulate and persist records in a MongoDB database through Mongoose, ensuring data integrity across client and server restarts.
