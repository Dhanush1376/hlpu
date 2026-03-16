const mongoose = require('mongoose');

const studentProgressSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student ID is required']
    },
    coursePath: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CoursePath',
        required: [true, 'CoursePath ID is required']
    },
    completedSteps: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CourseStep'
    }],
    progressPercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    lastAccessedAt: {
        type: Date,
        default: Date.now
    }
});

// Unique index to ensure one progress record per student per path
studentProgressSchema.index({ student: 1, coursePath: 1 }, { unique: true });
studentProgressSchema.index({ student: 1 });

module.exports = mongoose.model('StudentProgress', studentProgressSchema);
