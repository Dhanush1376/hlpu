const User = require('../models/User');
const Job = require('../models/Job');
const Shortlist = require('../models/Shortlist');
const mongoose = require('mongoose');

/**
 * GET /api/recruiter/candidates
 * Highly efficient candidate search with filtering and pagination.
 */
exports.getCandidates = async (req, res) => {
    try {
        const { department, skills, minReadiness, minPlacement, page = 1, limit = 10 } = req.query;
        let query = { role: 'student' };

        if (department && department !== 'all') {
            query.department = new RegExp(department, 'i');
        }

        if (skills) {
            const skillList = skills.split(',').map(s => s.trim());
            query.skills = { $all: skillList.map(s => new RegExp(s, 'i')) };
        }

        if (minReadiness) query.readinessScore = { $gte: parseInt(minReadiness) };
        if (minPlacement) query.placementScore = { $gte: parseInt(minPlacement) };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await User.countDocuments(query);
        const candidates = await User.find(query)
            .select('name email department skills placementScore readinessScore profileStrength projects university')
            .sort({ placementScore: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        res.json({
            candidates,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('[recruiter] getCandidates error:', err.message);
        res.status(500).json({ message: 'Failed to fetch candidates' });
    }
};

/**
 * POST /api/recruiter/shortlist/:studentId
 */
exports.shortlistStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { jobId, status = 'shortlisted' } = req.body;

        const shortlist = await Shortlist.findOneAndUpdate(
            { recruiter: req.user.id, student: studentId, job: jobId || null },
            { status, createdAt: new Date() },
            { upsert: true, new: true }
        );

        res.json({ message: `Student ${status} successfully`, shortlist });
    } catch (err) {
        console.error('[recruiter] shortlist error:', err.message);
        res.status(500).json({ message: 'Failed to shortlist student' });
    }
};

/**
 * GET /api/recruiter/shortlisted
 */
exports.getShortlisted = async (req, res) => {
    try {
        const shortlisted = await Shortlist.find({ recruiter: req.user.id })
            .populate('student', 'name email department skills placementScore')
            .populate('job', 'title company')
            .sort({ createdAt: -1 })
            .lean();

        res.json(shortlisted);
    } catch (err) {
        console.error('[recruiter] getShortlisted error:', err.message);
        res.status(500).json({ message: 'Failed to fetch shortlisted candidates' });
    }
};

/**
 * GET /api/recruiter/analytics
 */
exports.getAnalytics = async (req, res) => {
    try {
        const recruiterId = req.user.id;

        const [jobStats, shortlistCount, topTalent] = await Promise.all([
            Job.aggregate([
                { $match: { postedBy: new mongoose.Types.ObjectId(recruiterId) } },
                {
                    $group: {
                        _id: null,
                        totalJobs: { $sum: 1 },
                        totalApplicants: { $sum: { $size: "$applicants" } }
                    }
                }
            ]),
            Shortlist.countDocuments({ recruiter: recruiterId, status: 'shortlisted' }),
            User.find({ role: 'student' }).sort({ placementScore: -1 }).limit(5).select('name placementScore department').lean()
        ]);

        const stats = jobStats[0] || { totalJobs: 0, totalApplicants: 0 };

        res.json({
            activeJobs: stats.totalJobs,
            totalApplicants: stats.totalApplicants,
            shortlistedCount: shortlistCount,
            topTalentRecommendations: topTalent
        });
    } catch (err) {
        console.error('[recruiter] analytics error:', err.message);
        res.status(500).json({ message: 'Failed to fetch analytics' });
    }
};
