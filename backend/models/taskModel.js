// In-memory data store (replaces database for now)
let tasks = [
    { id: 1, title: 'Learn Express', completed: false },
    { id: 2, title: 'Build REST API', completed: false },
    { id: 3, title: 'Test with Postman', completed: false }
];

let nextId = 4;

const getAllTasks = () => tasks;

const getTaskById = (id) => tasks.find((t) => t.id === id);

const createTask = (title) => {
    const newTask = { id: nextId++, title: title.trim(), completed: false };
    tasks.push(newTask);
    return newTask;
};

const updateTask = (id, updates) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return null;

    if (updates.title !== undefined) task.title = updates.title.trim();
    if (updates.completed !== undefined) task.completed = updates.completed;

    return task;
};

const deleteTask = (id) => {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    return tasks.splice(index, 1)[0];
};

module.exports = { getAllTasks, getTaskById, createTask, updateTask, deleteTask };
