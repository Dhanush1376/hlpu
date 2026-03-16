const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: [
            'job_view',
            'job_apply',
            'job_save',
            'mentor_view',
            'mentor_connect',
            'mentor_accepted',
            'mock_booked',
            'mock_completed',
            'course_start',
            'course_progress',
            'profile_update',
            'profile_viewed',
            'application_submit',
            'connection_accepted',
            'login',
            'search'
        ],
        required: true,
        index: true
    },
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Index for aggregation performance (Growth loops)
activitySchema.index({ type: 1, timestamp: -1 });
activitySchema.index({ user: 1, type: 1, timestamp: -1 });

module.exports = mongoose.model('Activity', activitySchema);
