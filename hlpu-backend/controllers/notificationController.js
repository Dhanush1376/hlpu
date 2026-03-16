const Notification = require('../models/Notification');

/**
 * Get user's notifications with pagination.
 */
exports.getNotifications = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const { category, priority, isRead } = req.query;
        let query = { user: req.user.id };

        if (category) query.category = category;
        if (priority) query.priority = priority;
        if (isRead !== undefined) query.isRead = isRead === 'true';

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ user: req.user.id, isRead: false });

        res.json({
            notifications,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            },
            unreadCount
        });
    } catch (err) {
        console.error('[notifications] fetch error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Mark all notifications as read for the current user.
 */
exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error('[notifications] mark read-all error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Mark a single notification as read.
 */
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { $set: { isRead: true } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json(notification);
    } catch (err) {
        console.error('[notifications] mark read error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Delete a specific notification.
 */
exports.deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted' });
    } catch (err) {
        console.error('[notifications] delete error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};
