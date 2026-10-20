// ===== Central API Helper for Backend Communication with JWT Auth =====
const BASE_URL = 'http://localhost:5000';

// Token helpers in localStorage
export const getToken = () => localStorage.getItem('token');
export const setToken = (token) => localStorage.setItem('token', token);
export const removeToken = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

export const getUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

export const setUser = (user) => {
    localStorage.setItem('user', JSON.stringify(user));
};

// Helper to construct headers with Bearer token
const getHeaders = (includeContentType = true) => {
    const headers = {};
    if (includeContentType) {
        headers['Content-Type'] = 'application/json';
    }
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// ===== Auth API Calls =====
// POST /auth/register
export const registerUser = async ({ username, email, password }) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
        const errorMsg = data.message || (data.details ? data.details.join(', ') : data.error) || 'Registration failed';
        throw new Error(errorMsg);
    }
    if (data.token) {
        setToken(data.token);
        setUser(data.user);
    }
    return data;
};

// POST /auth/login
export const loginUser = async ({ identifier, password }) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, username: identifier, password }),
    });
    const data = await res.json();
    if (!res.ok) {
        const errorMsg = data.message || (data.details ? data.details.join(', ') : data.error) || 'Login failed';
        throw new Error(errorMsg);
    }
    if (data.token) {
        setToken(data.token);
        setUser(data.user);
    }
    return data;
};

// GET /auth/me
export const getCurrentUser = async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: getHeaders(false),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch user profile');
    return data.user;
};

// ===== Tasks API Calls (Protected with Authorization: Bearer <token>) =====
// GET /tasks — Fetch all tasks
export const getTasks = async () => {
    const res = await fetch(`${BASE_URL}/tasks`, {
        headers: getHeaders(false),
    });
    const data = await res.json();
    if (!res.ok) {
        if (res.status === 401) {
            throw new Error('Authentication required. Please log in to view tasks.');
        }
        throw new Error(data.message || data.error || 'Failed to fetch tasks');
    }
    return data;
};

// POST /tasks — Create a new task (Pipeline: Auth -> Validation -> Controller)
export const createTask = async (taskData) => {
    const res = await fetch(`${BASE_URL}/tasks`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(taskData),
    });
    const data = await res.json();
    if (!res.ok) {
        const errorMsg = data.message || (data.details ? data.details.join(', ') : data.error) || 'Failed to create task';
        throw new Error(errorMsg);
    }
    return data;
};

// PUT /tasks/:id — Update a task
export const updateTask = async (id, updates) => {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) {
        const errorMsg = data.message || (data.details ? data.details.join(', ') : data.error) || 'Failed to update task';
        throw new Error(errorMsg);
    }
    return data;
};

// DELETE /tasks/:id — Delete a task
export const deleteTask = async (id) => {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
        method: 'DELETE',
        headers: getHeaders(false),
    });
    const data = await res.json();
    if (!res.ok) {
        const errorMsg = data.message || data.error || 'Failed to delete task';
        throw new Error(errorMsg);
    }
    return data;
};
