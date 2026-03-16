const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: [
            'job_applied',
            'application_accepted',
            'application_rejected',
            'mentor_request',
            'mentor_accepted',
            'mentor_rejected',
            'mock_requested',
            'mock_accepted',
            'mock_rejected',
            'referral_success',
            'plan_expired',
            'support_update',
            'admin_broadcast',
            'admin_message',
            'momentum_trigger',
            'profile_milestone',
            'reengagement_nudge'
        ],
        required: true
    },
    category: {
        type: String,
        enum: ['career', 'network', 'system', 'billing', 'support', 'engagement', 'opportunity', 'social_proof'],
        default: 'system'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    metadata: {
        type: Object,
        default: {}
    },
    expiresAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound index for efficient fetching of unread notifications for a user
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
