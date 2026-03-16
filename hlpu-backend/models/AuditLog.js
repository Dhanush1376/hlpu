const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'login', 'logout', 'password_reset',
            'verification_approved', 'verification_rejected',
            'user_suspended', 'user_unsuspended',
            'job_created', 'job_updated', 'job_deleted', 'job_moderated',
            'settings_updated', 'system_config'
        ]
    },
    targetType: {
        type: String,
        enum: ['User', 'Job', 'VerificationRequest', 'System']
    },
    targetId: mongoose.Schema.Types.ObjectId,
    description: String,
    metadata: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
