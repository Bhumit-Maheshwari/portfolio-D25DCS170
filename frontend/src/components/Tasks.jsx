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
