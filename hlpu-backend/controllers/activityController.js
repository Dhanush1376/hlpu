const Activity = require('../models/Activity');
const User = require('../models/User');

/**
 * POST /api/activity/track
 * Records a user activity event for growth tracking.
 */
exports.trackActivity = async (req, res) => {
    try {
        const { type, metadata } = req.body;

        if (!type) {
            return res.status(400).json({ message: 'Activity type is required' });
        }

        const activity = await Activity.create({
            user: req.user.id,
            type,
            metadata: metadata || {},
            timestamp: new Date()
        });

        // Optional: Update user's lastActive timestamp
        await User.findByIdAndUpdate(req.user.id, { lastActive: new Date() });

        res.status(201).json({ success: true, activity });
    } catch (err) {
        console.error('[activity] Tracking error:', err.message);
        res.status(500).json({ message: 'Failed to record activity' });
    }
};

/**
 * GET /api/activity/recent
 * Returns recent activity for the current user.
 */
exports.getMyRecentActivity = async (req, res) => {
    try {
        const activities = await Activity.find({ user: req.user.id })
            .sort({ timestamp: -1 })
            .limit(10)
            .lean();

        res.json(activities);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/activity/momentum
 * Returns momentum triggers (social proof) for the frontend.
 */
exports.getMomentumTriggers = async (req, res) => {
    try {
        const triggers = [];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const user = await User.findById(req.user.id).select('stream department').lean();

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Trigger 1: Job Popularity in Stream
        const popularJobs = await Activity.aggregate([
            { $match: { type: 'job_view', timestamp: { $gte: thirtyDaysAgo } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'visitor'
                }
            },
            { $unwind: '$visitor' },
            { $match: { 'visitor.stream': user.stream } },
            { $group: { _id: '$metadata.jobId', count: { $sum: 1 }, title: { $first: '$metadata.title' } } },
            { $match: { count: { $gte: 2 } } },
            { $sort: { count: -1 } },
            { $limit: 3 }
        ]);

        popularJobs.forEach(job => {
            triggers.push({
                type: 'momentum',
                icon: '🔥',
                text: `${job.count} students from ${user.stream} viewed "${job.title}" recently.`,
                action: 'view_job',
                metadata: { jobId: job._id }
            });
        });

        // Trigger 2: Profile Strength Trends
        const activeProfiles = await Activity.countDocuments({
            type: 'profile_update',
            timestamp: { $gte: thirtyDaysAgo }
        });

        if (activeProfiles > 5) {
            triggers.push({
                type: 'growth',
                icon: '🚀',
                text: `${activeProfiles} peers enhanced their profiles this month. Keep up!`,
                action: 'view_profile',
                metadata: {}
            });
        }

        // Trigger 3: New Mentors in Dept
        const newMentorsCount = await User.countDocuments({
            role: 'alumni',
            department: user.department,
            createdAt: { $gte: thirtyDaysAgo }
        });

        if (newMentorsCount > 0) {
            triggers.push({
                type: 'mentorship',
                icon: '🤝',
                text: `${newMentorsCount} new mentors joined in ${user.department}. Connect now!`,
                action: 'view_mentors',
                metadata: { department: user.department }
            });
        }

        res.json(triggers.slice(0, 5));
    } catch (err) {
        console.error('[activity] Momentum error:', err.message);
        res.status(500).json({ message: 'Failed to fetch momentum' });
    }
};
