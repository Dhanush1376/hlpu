const AuditLog = require('../models/AuditLog');

/**
 * Logs a system event into the AuditLog collection.
 * @param {Object} param0 
 * @param {string} param0.userId - ID of the user performing the action
 * @param {string} param0.action - Action type (enum)
 * @param {string} [param0.targetType] - Type of object being acted on
 * @param {string} [param0.targetId] - ID of object being acted on
 * @param {string} [param0.description] - Human readable description
 * @param {Object} [param0.metadata] - Extra data
 * @param {Object} req - Express request object (to extract IP and UA)
 */
const logEvent = async ({ userId, action, targetType, targetId, description, metadata }, req) => {
    try {
        await AuditLog.create({
            user: userId,
            action,
            targetType,
            targetId,
            description,
            metadata,
            ipAddress: req ? (req.ip || req.headers['x-forwarded-for']) : 'internal',
            userAgent: req ? req.headers['user-agent'] : 'system'
        });
        console.log(`[audit] Logged: ${action} by ${userId}`);
    } catch (err) {
        console.error('[audit] Failed to log event:', err.message);
    }
};

module.exports = { logEvent };
