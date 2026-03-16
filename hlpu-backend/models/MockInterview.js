const mongoose = require('mongoose');

const mockInterviewSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    alumni: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    roleRequested: {
        type: String,
        required: true,
        trim: true
    },
    skills: [{
        type: String,
        trim: true
    }],
    interviewType: {
        type: String,
        enum: ['HR', 'Technical', 'Behavioral'],
        required: true
    },
    preferredDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'completed', 'no-show', 'expired'],
        default: 'pending',
        index: true
    },
    feedbackGiven: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date
    },
    meetingLink: {
        type: String,
        trim: true
    },
    feedback: {
        type: String,
        trim: true
    },
    scheduledDate: {
        type: Date
    },
    rejectedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Performance Indexes
mockInterviewSchema.index({ student: 1, status: 1 });
mockInterviewSchema.index({ alumni: 1, status: 1 });
mockInterviewSchema.index({ scheduledDate: 1 });
mockInterviewSchema.index({ createdAt: -1 });
mockInterviewSchema.index({ status: 1, scheduledDate: 1 });
mockInterviewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index if we want auto-deletion, but user said expiry logic
mockInterviewSchema.index({ roleRequested: 1, skills: 1 }); // Intelligence ranking index

module.exports = mongoose.model('MockInterview', mockInterviewSchema);
