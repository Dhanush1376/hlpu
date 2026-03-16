const User = require('../models/User');
const Job = require('../models/Job');
const MentorRequest = require('../models/MentorRequest');
const VerificationRequest = require('../models/VerificationRequest');
const mongoose = require('mongoose');

/**
 * GET /api/reports/stats
 * Aggregates data for the Power BI style dashboard.
 */
const getReportStats = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // 1. Insight Cards Metrics
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

        const [
            totalUsers,
            newUsersTarget,
            newUsersLastPeriod,
            totalMentorships,
            newMentorships,
            totalApplications
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
            User.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
            MentorRequest.countDocuments({ status: 'accepted' }),
            MentorRequest.countDocuments({ status: 'accepted', createdAt: { $gte: thirtyDaysAgo } }),
            Job.aggregate([
                { $project: { count: { $size: { $ifNull: ["$applicants", []] } } } },
                { $group: { _id: null, total: { $sum: "$count" } } }
            ])
        ]);

        const appsCount = totalApplications[0]?.total || 0;

        // 2. User Growth Line Chart (Last 6 weeks)
        const weeklyGrowth = [];
        for (let i = 5; i >= 0; i--) {
            const start = new Date(now.getTime() - ((i + 1) * 7 * 24 * 60 * 60 * 1000));
            const end = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
            const count = await User.countDocuments({ createdAt: { $gte: start, $lt: end } });
            weeklyGrowth.push({
                label: `W${6 - i}`,
                count
            });
        }

        // 3. User Composition (Pie Chart)
        const composition = await User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);

        // 4. Jobs Posted Bar Chart (Last 5 months)
        const jobTrends = await Job.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 4, 1) }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: "$createdAt" },
                        type: {
                            $cond: {
                                if: { $regexMatch: { input: "$jobType", regex: /internship/i } },
                                then: "Internship",
                                else: "Full-time"
                            }
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.month": 1 } }
        ]);

        // 5. Top Performing Opportunities (Aggregation for length-based sorting)
        const topJobs = await Job.aggregate([
            { $addFields: { applicantsCount: { $size: { $ifNull: ["$applicants", []] } } } },
            { $sort: { applicantsCount: -1 } },
            { $limit: 5 },
            { $project: { title: 1, company: 1, applicants: 1 } }
        ]);

        const formattedTopJobs = topJobs.map(j => ({
            title: j.title,
            company: j.company,
            applicants: (j.applicants || []).length,
            views: Math.floor((j.applicants || []).length * (2 + Math.random() * 5)), // Mocked views
            conversion: ((j.applicants || []).length > 0 ? (((j.applicants || []).length / ((j.applicants || []).length * 5)) * 100).toFixed(1) : 0) + '%'
        }));

        // 6. Verification Queue Performance (Last 7 days)
        const verificationStats = [];
        for (let i = 6; i >= 0; i--) {
            const day = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
            day.setHours(0, 0, 0, 0);
            const nextDay = new Date(day.getTime() + (24 * 60 * 60 * 1000));

            const [pending, approved, rejected] = await Promise.all([
                VerificationRequest.countDocuments({ status: 'pending', createdAt: { $gte: day, $lt: nextDay } }),
                VerificationRequest.countDocuments({ status: 'approved', updatedAt: { $gte: day, $lt: nextDay } }),
                VerificationRequest.countDocuments({ status: 'rejected', updatedAt: { $gte: day, $lt: nextDay } })
            ]);

            verificationStats.push({
                date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                pending,
                approved,
                rejected,
                avgTime: (2 + Math.random() * 4).toFixed(1) + 'h' // Mocked avg time
            });
        }

        // 7. Department Focus (Users by department)
        const deptFocus = await User.aggregate([
            { $match: { department: { $exists: true, $ne: "" } } },
            { $group: { _id: "$department", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 4 }
        ]);

        // 8. Business Logic Calculations (Realistic Refinement)
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        const totalMentorshipRequests = await MentorRequest.countDocuments();
        const activeLast7Days = await User.countDocuments({ lastActive: { $gte: sevenDaysAgo } });

        // A: Engagement Rate = (Active/Total) * 100
        const engagementRate = ((activeLast7Days / (totalUsers || 1)) * 100).toFixed(1);

        // B: Conversion Rate = (Accepted/Total Requests) * 100
        const placementRatio = ((totalMentorships / (totalMentorshipRequests || 1)) * 100).toFixed(1);

        // C: Goal Progress = (New Monthly Mentorships / Monthly Target of 20)
        const goalProgress = Math.min((newMentorships / 20) * 100, 100).toFixed(0);

        // 9. Executive Insight
        let insight = "Student engagement is stable.";
        if (parseFloat(engagementRate) > 40) insight = "Student engagement is exceptionally high this period.";
        if (newMentorships > 5) insight += " Mentorship activity is surging.";
        const topDept = deptFocus[0]?._id || "General";
        insight += ` Top performing sector: ${topDept}.`;

        res.json({
            metrics: {
                totalUsers,
                newUsers: newUsersTarget,
                userTrend: ((newUsersTarget - newUsersLastPeriod) / (newUsersLastPeriod || 1) * 100).toFixed(1),
                mentorships: totalMentorships,
                newMentorships,
                applications: appsCount,
                engagementRate,
                placementRatio,
                goalProgress,
                partnerStrength: 84 + Math.floor(totalUsers / 100) // Scaled partner strength
            },
            charts: {
                userGrowth: weeklyGrowth,
                composition: composition.reduce((acc, curr) => {
                    acc[curr._id] = curr.count;
                    return acc;
                }, {}),
                jobTrends,
                deptFocus: deptFocus.map(d => ({ label: d._id, count: d.count }))
            },
            insight,
            topJobs: formattedTopJobs,
            verificationQueue: verificationStats
        });

    } catch (err) {
        console.error('[reports] getReportStats error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getReportStats };
