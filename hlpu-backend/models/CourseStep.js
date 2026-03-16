const mongoose = require('mongoose');

const courseStepSchema = new mongoose.Schema({
    coursePath: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CoursePath',
        required: [true, 'CoursePath is required']
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    order: {
        type: Number,
        required: [true, 'Order is required']
    },
    type: {
        type: String,
        enum: ['course', 'project', 'practice', 'assessment'],
        required: [true, 'Type is required']
    },
    resourceLink: {
        type: String,
        required: [true, 'Resource link is required']
    },
    estimatedHours: {
        type: Number,
        required: [true, 'Estimated hours is required']
    },
    isOptional: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for efficient lookup and ordering
courseStepSchema.index({ coursePath: 1, order: 1 });
courseStepSchema.index({ coursePath: 1 });

module.exports = mongoose.model('CourseStep', courseStepSchema);
