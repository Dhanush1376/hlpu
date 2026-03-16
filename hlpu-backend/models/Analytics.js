const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    event: {
        type: String,
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    role: {
        type: String,
        enum: ['student', 'alumni', 'admin', 'recruiter'],
        index: true
    },
    metadata: {
        type: Object,
        default: {}
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    ip: String,
    userAgent: String
}, {
    timestamps: true
});

// TTL Index for performance (optional for SaaS metrics, but good for scale)
// analyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // 90 days

module.exports = mongoose.model('Analytics', analyticsSchema);
