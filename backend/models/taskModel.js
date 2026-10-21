const mongoose = require('mongoose');

// ===== Task Schema Definition =====
const taskSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    title: {
        type: String,
        required: [true, 'Task title is required'],
    },
    description: {
        type: String,
        default: '',
    },
    completed: {
        type: Boolean,
        default: false,
    },
    priority: {
        type: String,
        enum: {
            values: ['low', 'medium', 'high'],
            message: 'Priority must be low, medium, or high',
        },
        default: 'medium',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// ===== Practical 9: Query Optimization Indexing =====
// Compound index on user and createdAt speeds up sorted task queries (IXSCAN instead of COLLSCAN)
taskSchema.index({ user: 1, createdAt: -1 });

// ===== Pre-save Hook =====
// Automatically trims whitespace from title before saving
taskSchema.pre('save', function () {
    if (this.title) {
        this.title = this.title.trim();
    }
});

// ===== Export Model =====
const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
