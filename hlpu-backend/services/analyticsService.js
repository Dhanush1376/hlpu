const Analytics = require('../models/Analytics');
const Activity = require('../models/Activity');

/**
 * Log an analytics event to the database.
 * @param {string} event - The name of the event (e.g., 'job_applied').
 * @param {Object} req - The express request object (for user and metadata).
 * @param {Object} metadata - Optional additional data to store.
 */
const trackEvent = async (event, req, metadata = {}) => {
    try {
        const userId = req.user ? req.user.id : null;
        const userRole = req.user ? req.user.role : null;

        // 1. Log to legacy Analytics for reports
        await Analytics.create({
            event,
            user: userId,
            role: userRole,
            metadata,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        // 2. Log to Activity for Growth Flywheel (Feeds, Recs, Momentum)
        if (userId) {
            await Activity.create({
                user: userId,
                type: event,
                metadata,
                timestamp: new Date()
            });
        }
    } catch (err) {
        console.error(`[analytics] Failed to track event ${event}:`, err.message);
        // Do not throw error to avoid breaking main flow
    }
};

module.exports = {
    trackEvent
};
