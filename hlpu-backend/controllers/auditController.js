const AuditLog = require('../models/AuditLog');

/**
 * GET /api/admin/audit-logs
 * Fetch audit logs with filtering and pagination.
 */
const getAuditLogs = async (req, res) => {
    try {
        const { action, userId, page = 1, limit = 50, search } = req.query;
        let query = {};

        if (action && action !== 'all event types') {
            query.action = action;
        }

        if (userId) {
            query.user = userId;
        }

        if (search) {
            query.$or = [
                { description: { $regex: search, $options: 'i' } },
                { ipAddress: { $regex: search, $options: 'i' } }
            ];
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const logs = await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('user', 'name email role')
            .lean();

        const total = await AuditLog.countDocuments(query);

        res.json({
            logs,
            pagination: {
                total,
                page: pageNum,
                pages: Math.ceil(total / limitNum) || 1
            }
        });
    } catch (err) {
        console.error('[audit] getAuditLogs error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/admin/audit-stats
 * Aggregated stats for the audit dashboard.
 */
const getAuditStats = async (req, res) => {
    try {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - 7));

        const [adminActionsCount, userChangesCount, deletionsCount] = await Promise.all([
            AuditLog.countDocuments({
                action: { $in: ['verification_approved', 'verification_rejected', 'user_suspended', 'job_moderated'] },
                createdAt: { $gte: startOfWeek }
            }),
            AuditLog.countDocuments({
                action: { $in: ['login', 'password_reset', 'job_created'] },
                createdAt: { $gte: startOfWeek }
            }),
            AuditLog.countDocuments({
                action: 'job_deleted',
                createdAt: { $gte: startOfWeek }
            })
        ]);

        res.json({
            adminActionsCount,
            userChangesCount,
            deletionsCount,
            totalLogs: await AuditLog.countDocuments()
        });
    } catch (err) {
        console.error('[audit] getAuditStats error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getAuditLogs, getAuditStats };
