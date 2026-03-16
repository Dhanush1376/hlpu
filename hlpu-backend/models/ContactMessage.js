const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    role: {
        type: String,
        required: true,
        enum: ['student', 'alumni', 'recruiter', 'guest'],
        default: 'guest'
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['new', 'read', 'replied', 'archived'],
        default: 'new'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    adminReply: {
        type: String,
        trim: true
    },
    repliedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    repliedAt: Date
}, {
    timestamps: true
});

// Indexes for performance
contactMessageSchema.index({ status: 1 });
contactMessageSchema.index({ role: 1 });
contactMessageSchema.index({ priority: 1 });
contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ email: 1 });
contactMessageSchema.index({ name: 'text', subject: 'text', message: 'text' });

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

module.exports = ContactMessage;
