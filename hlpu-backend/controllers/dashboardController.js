const mongoose = require('mongoose');
const Job = require('../models/Job');
const MockInterview = require('../models/MockInterview');
const MentorRequest = require('../models/MentorRequest');
const User = require('../models/User');
const LaunchProject = require('../models/LaunchProject');
const LaunchApplication = require('../models/LaunchApplication');
const Activity = require('../models/Activity');

/**
 * GET /api/dashboard/student
 * Returns dashboard metrics for the authenticated student.
 *
 * Response: {
 *   totalJobsAvailable, jobsApplied, recentJobs[]
 * }
 */
const getStudentDashboard = async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Access restricted to students' });
        }

        const userId = new mongoose.Types.ObjectId(req.user.id);

        // Run independent queries in parallel for efficiency
        const [
            applicationStats,
            totalMockInterviews,
            totalMentorsConnected,
            recentJobs,
            upcomingMocks,
            launchApplicationsCount,
            suggestedProjects,
            availableMentors,
            momentumTriggers
        ] = await Promise.all([
            // Aggregate job applications and status counts
            Job.aggregate([
                { $match: { "applicants.student": userId } },
                { $unwind: "$applicants" },
                { $match: { "applicants.student": userId } },
                {
                    $group: {
                        _id: null,
                        totalApplications: { $sum: 1 },
                        acceptedApplications: {
                            $sum: { $cond: [{ $eq: ["$applicants.status", "accepted"] }, 1, 0] }
                        },
                        pendingApplications: {
                            $sum: { $cond: [{ $eq: ["$applicants.status", "pending"] }, 1, 0] }
                        }
                    }
                }
            ]),
            MockInterview.countDocuments({ student: userId }),
            MentorRequest.countDocuments({ student: userId, status: 'accepted' }),
            Job.find()
                .sort({ createdAt: -1 })
                .limit(2) // User requested 2 jobs
                .select('title company location jobType createdAt companyLogo')
                .lean(),
            MockInterview.find({ student: userId, status: 'accepted', scheduledDate: { $gte: new Date() } })
                .populate('alumni', 'name profilePic')
                .sort({ scheduledDate: 1 })
                .limit(3)
                .lean(),
            LaunchApplication.countDocuments({ applicant: userId }),
            LaunchProject.find({ isActive: true, status: 'open' })
                .sort({ createdAt: -1 })
                .limit(2) // User requested 2 innovations/projects
                .select('title subtitle category tags logo')
                .lean(),
            User.find({ role: 'alumni', isMentorAvailable: true })
                .limit(2) // User requested 2 mentors
                .select('name title company profilePicture skills')
                .lean(),
            // Simulate momentum triggers or fetch from activity logic
            Activity.find({ timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
                .sort({ timestamp: -1 })
                .limit(3)
                .populate('user', 'name')
                .lean()
        ]);

        const stats = applicationStats[0] || {
            totalApplications: 0,
            acceptedApplications: 0,
            pendingApplications: 0
        };

        // Format Momentum Triggers for UI
        const formattedMomentum = (momentumTriggers || []).map(m => {
            const timeStr = require('../utils/timeHelpers')?.formatTimeAgo ?
                require('../utils/timeHelpers').formatTimeAgo(m.timestamp) :
                'Recently';
            return {
                text: `${m.user?.name || 'A user'} just ${m.type.replace(/_/g, ' ')}`,
                time: timeStr,
                icon: m.type.includes('job') ? '💼' : m.type.includes('mentor') ? '🎓' : '🚀'
            };
        });

        res.json({
            totalApplications: stats.totalApplications,
            acceptedApplications: stats.acceptedApplications,
            pendingApplications: stats.pendingApplications,
            totalMockInterviews,
            totalMentorsConnected,
            recentJobs,
            upcomingMocks,
            launchApplicationsCount,
            suggestedProjects,
            availableMentors,
            momentum: formattedMomentum
        });
    } catch (err) {
        console.error('[dashboard] getStudentDashboard error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/dashboard/alumni
 * Returns dashboard metrics for the authenticated alumni.
 *
 * Response: {
 *   jobsPosted, totalApplicants, recentPostedJobs[]
 * }
 */
const getAlumniDashboard = async (req, res) => {
    try {
        if (req.user.role !== 'alumni') {
            return res.status(403).json({ message: 'Access restricted to alumni' });
        }

        const userId = new mongoose.Types.ObjectId(req.user.id);

        // Run independent queries in parallel for efficiency
        const [
            jobStats,
            totalMockSessions,
            totalMenteesConnected,
            recentPostedJobs,
            upcomingMocks,
            activeLaunchProjectsCount,
            pendingLaunchApplicantsCount,
            momentumTriggers
        ] = await Promise.all([
            // Single aggregation to get both jobsPosted count and totalApplicants
            Job.aggregate([
                { $match: { postedBy: userId } },
                {
                    $group: {
                        _id: null,
                        totalJobsPosted: { $sum: 1 },
                        totalApplicantsReceived: { $sum: { $size: { $ifNull: ["$applicants", []] } } },
                    },
                },
            ]),
            MockInterview.countDocuments({ alumni: userId }),
            MentorRequest.countDocuments({ alumni: userId, status: 'accepted' }),
            Job.find({ postedBy: userId })
                .sort({ createdAt: -1 })
                .limit(2)
                .select('title company location jobType applicants createdAt companyLogo')
                .lean(),
            MockInterview.find({ alumni: userId, status: 'accepted', scheduledDate: { $gte: new Date() } })
                .populate('student', 'name profilePic')
                .sort({ scheduledDate: 1 })
                .limit(3)
                .lean(),
            LaunchProject.countDocuments({ postedBy: userId, isActive: true }),
            LaunchApplication.countDocuments({
                project: { $in: await LaunchProject.find({ postedBy: userId }).distinct('_id') },
                status: 'pending'
            }),
            // Momentum for Alumni: Student activity on their jobs
            Activity.find({
                'metadata.jobId': { $in: await Job.find({ postedBy: userId }).distinct('_id') },
                timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            })
                .sort({ timestamp: -1 })
                .limit(3)
                .populate('user', 'name')
                .lean()
        ]);

        const stats = jobStats[0] || { totalJobsPosted: 0, totalApplicantsReceived: 0 };

        // Format Momentum for Alumni
        const formattedMomentum = (momentumTriggers || []).map(m => {
            return {
                text: `${m.user?.name || 'A student'} ${m.type === 'job_view' ? 'viewed' : 'interacted with'} your job: ${m.metadata.title || 'Job'}`,
                time: 'Recently',
                icon: '👀'
            };
        });

        res.json({
            totalJobsPosted: stats.totalJobsPosted,
            totalApplicantsReceived: stats.totalApplicantsReceived,
            totalMockSessions,
            totalMenteesConnected,
            recentPostedJobs,
            upcomingMocks,
            activeLaunchProjectsCount,
            pendingLaunchApplicantsCount,
            momentum: formattedMomentum
        });
    } catch (err) {
        console.error('[dashboard] getAlumniDashboard error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/dashboard/admin
 * Returns dashboard metrics for the authenticated admin.
 */
const getAdminDashboard = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access restricted to admins' });
        }

        const [
            totalStudents,
            totalAlumni,
            totalJobs,
            totalMentorships,
            recentUsers,
            pendingModerationJobs,
            pendingVerificationsCount
        ] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            User.countDocuments({ role: 'alumni' }),
            Job.countDocuments(),
            MentorRequest.countDocuments({ status: 'accepted' }),
            User.find()
                .sort({ createdAt: -1 })
                .limit(4)
                .select('name role createdAt department education')
                .lean(),
            Job.find()
                .sort({ createdAt: -1 })
                .limit(4)
                .select('title company createdAt postedBy')
                .populate('postedBy', 'name role')
                .lean(),
            require('../models/VerificationRequest').countDocuments({ status: 'pending' })
        ]);

        res.json({
            totalStudents,
            totalAlumni,
            totalJobs,
            totalMentorships,
            recentUsers,
            pendingModerationJobs,
            pendingVerificationsCount,
            // Prepared for real system alerts in the future
            systemAlerts: []
        });
    } catch (err) {
        console.error('[dashboard] getAdminDashboard error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getStudentDashboard, getAlumniDashboard, getAdminDashboard };
