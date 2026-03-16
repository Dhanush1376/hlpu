const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['technical', 'billing', 'mentorship', 'jobs', 'profile', 'other'],
        default: 'other',
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'low',
        index: true
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'],
        default: 'open',
        index: true
    },
    description: {
        type: String,
        required: true
    },
    attachments: [String],
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    thread: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        message: String,
        timestamp: { type: Date, default: Date.now },
        attachments: [String]
    }],
    resolvedAt: Date,
    slaDeadlineAt: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
