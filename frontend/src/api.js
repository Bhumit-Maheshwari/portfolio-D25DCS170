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
