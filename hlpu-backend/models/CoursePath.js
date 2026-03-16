const mongoose = require('mongoose');

const coursePathSchema = new mongoose.Schema({
    role: {
        type: String,
        required: [true, 'Role is required'],
        trim: true
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        required: [true, 'Difficulty is required']
    },
    estimatedDurationWeeks: {
        type: Number,
        required: [true, 'Estimated duration is required']
    },
    skills: [{
        type: String,
        trim: true
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for efficient querying
coursePathSchema.index({ role: 1 });
coursePathSchema.index({ department: 1 });
coursePathSchema.index({ isActive: 1 });

module.exports = mongoose.model('CoursePath', coursePathSchema);
