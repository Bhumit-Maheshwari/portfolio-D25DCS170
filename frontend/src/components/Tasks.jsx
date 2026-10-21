import { useState, useEffect } from 'react';
import {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    registerUser,
    loginUser,
    getToken,
    removeToken,
    getUser,
    generateAiDescription,
} from '../api';

function Tasks() {
    // ===== Auth state =====
    const [currentUser, setCurrentUser] = useState(getUser());
    const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
    const [authUsername, setAuthUsername] = useState('');
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    // ===== Tasks state =====
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [confirmDelete, setConfirmDelete] = useState(null);

    // ----- Task Form state -----
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [formLoading, setFormLoading] = useState(false);

    // Practical 13: AI Assistant state
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState(null);

    // ===== Toast helper =====
    const showToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    };

    // ===== Fetch all tasks (Protected) =====
    const fetchTasks = async () => {
        if (!getToken()) {
            setTasks([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await getTasks();
            setTasks(data);
        } catch (err) {
            setError(err.message);
            if (err.message.includes('Authentication') || err.message.includes('expired')) {
                handleLogout();
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser && getToken()) {
            fetchTasks();
        }
    }, [currentUser]);

    // ===== Auth Handlers =====
    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setAuthLoading(true);

        try {
            if (authMode === 'register') {
                const res = await registerUser({
                    username: authUsername,
                    email: authEmail,
                    password: authPassword,
                });
                setCurrentUser(res.user);
                showToast(`Welcome, ${res.user.username}! Registered successfully.`);
            } else {
                const res = await loginUser({
                    identifier: authEmail,
                    password: authPassword,
                });
                setCurrentUser(res.user);
                showToast(`Welcome back, ${res.user.username}!`);
            }
            // Clear auth form fields
            setAuthUsername('');
            setAuthEmail('');
            setAuthPassword('');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = () => {
        removeToken();
        setCurrentUser(null);
        setTasks([]);
        showToast('Logged out successfully.');
    };

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

    // ===== Practical 13: AI Assistant Generator =====
    const handleAiGenerate = async () => {
        if (!title.trim()) {
            showToast('Please type a task title first to generate AI suggestions', 'error');
            return;
        }
        setAiLoading(true);
        try {
            const res = await generateAiDescription(title.trim());
            if (res.success) {
                setDescription(res.description);
                if (res.suggestedPriority) {
                    setPriority(res.suggestedPriority);
                }
                setAiSuggestion(res);
                showToast(
                    res.source === 'fallback-engine'
                        ? '✨ Smart suggestions generated via Fallback Engine'
                        : `✨ AI description generated via ${res.model || 'AI'}!`,
                    'success'
                );
            }
        } catch (err) {
            showToast(err.message || 'AI request failed', 'error');
        } finally {
            setAiLoading(false);
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

    return (
        <div className="page tasks-page">
            <h1>Task Manager</h1>
            <p className="page-subtitle">
                Full-Stack CRUD with JWT Authentication & Middleware Pipeline
            </p>

            {/* ===== Auth Status / Login Card ===== */}
            {!currentUser ? (
                <div className="auth-card">
                    <div className="auth-header">
                        <h2>🔐 Authentication Required</h2>
                        <p>Please register or log in to access the protected Task routes.</p>
                        <div className="auth-tabs">
                            <button
                                type="button"
                                className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                                onClick={() => setAuthMode('login')}
                            >
                                Log In
                            </button>
                            <button
                                type="button"
                                className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
                                onClick={() => setAuthMode('register')}
                            >
                                Register
                            </button>
                        </div>
                    </div>

                    <form className="auth-form" onSubmit={handleAuthSubmit}>
                        {authMode === 'register' && (
                            <div className="auth-group">
                                <label htmlFor="auth-username">Username</label>
                                <input
                                    id="auth-username"
                                    type="text"
                                    className="task-input"
                                    placeholder="Enter username (min 3 chars)"
                                    value={authUsername}
                                    onChange={(e) => setAuthUsername(e.target.value)}
                                    required
                                    minLength={3}
                                />
                            </div>
                        )}

                        <div className="auth-group">
                            <label htmlFor="auth-email">
                                {authMode === 'login' ? 'Email or Username' : 'Email Address'}
                            </label>
                            <input
                                id="auth-email"
                                type={authMode === 'login' ? 'text' : 'email'}
                                className="task-input"
                                placeholder={authMode === 'login' ? 'Email or username' : 'name@example.com'}
                                value={authEmail}
                                onChange={(e) => setAuthEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="auth-group">
                            <label htmlFor="auth-password">Password</label>
                            <input
                                id="auth-password"
                                type="password"
                                className="task-input"
                                placeholder="Enter password (min 6 chars)"
                                value={authPassword}
                                onChange={(e) => setAuthPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            className="task-add-btn auth-submit-btn"
                            disabled={authLoading}
                        >
                            {authLoading
                                ? 'Processing...'
                                : authMode === 'login'
                                ? '🔑 Log In with JWT'
                                : '📝 Create Account'}
                        </button>
                    </form>
                </div>
            ) : (
                <>
                    {/* ===== Authenticated User Banner ===== */}
                    <div className="auth-banner">
                        <div className="auth-user-info">
                            <span className="auth-badge">🛡️ Authenticated (JWT)</span>
                            <span>
                                Logged in as: <strong>{currentUser.username}</strong> ({currentUser.email})
                            </span>
                        </div>
                        <button
                            type="button"
                            className="logout-btn"
                            onClick={handleLogout}
                            title="Log out and clear JWT token"
                        >
                            🚪 Log Out
                        </button>
                    </div>

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

                        {/* Practical 13: AI Auto-fill Button */}
                        <div className="ai-action-bar">
                            <button
                                type="button"
                                className="ai-btn"
                                onClick={handleAiGenerate}
                                disabled={aiLoading || !title.trim()}
                                title="Auto-generate description & suggest priority using AI"
                            >
                                {aiLoading ? '✨ Analyzing Task with AI...' : '✨ Auto-Generate with AI (Gemini / OpenAI)'}
                            </button>
                        </div>

                        {/* Practical 13: AI Suggestion Preview Box */}
                        {aiSuggestion && (
                            <div className="ai-suggestion-card">
                                <div className="ai-suggestion-top">
                                    <span className="ai-badge">
                                        ✨ {aiSuggestion.model || 'AI Assistant'}
                                    </span>
                                    <button
                                        type="button"
                                        className="ai-dismiss-btn"
                                        onClick={() => setAiSuggestion(null)}
                                        title="Dismiss AI Suggestion"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <p className="ai-desc-preview">
                                    <strong>AI Description:</strong> {aiSuggestion.description}
                                </p>
                                <div className="ai-meta-row">
                                    <span className="ai-priority-tag">
                                        Recommended Priority: <strong>{aiSuggestion.suggestedPriority?.toUpperCase()}</strong>
                                    </span>
                                    {aiSuggestion.checklist && aiSuggestion.checklist.length > 0 && (
                                        <div className="ai-checklist-wrapper">
                                            <span className="ai-checklist-label">Recommended Checklist:</span>
                                            <ul className="ai-checklist">
                                                {aiSuggestion.checklist.map((item, idx) => (
                                                    <li key={idx}>✓ {item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <input
                            type="text"
                            className="task-input task-desc-input"
                            placeholder="Description (optional, or click Auto-Generate with AI above)"
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

                    {/* ===== Loading & Error states ===== */}
                    {loading && (
                        <div className="page spinner-container">
                            <div className="spinner"></div>
                            <p>Loading your tasks...</p>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="page error-container">
                            <h2>⚠️ Failed to Load Tasks</h2>
                            <p>{error}</p>
                            <button className="retry-btn" onClick={fetchTasks}>
                                🔄 Retry
                            </button>
                        </div>
                    )}

                    {/* ===== Task List ===== */}
                    {!loading && !error && (
                        tasks.length === 0 ? (
                            <div className="tasks-empty">
                                <p>📋 No tasks found for your account. Create your first task above!</p>
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
                        )
                    )}
                </>
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
