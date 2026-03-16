/**
 * recommendationController.js
 * Controller for personalized course recommendations.
 */

const Course = require('../models/Course');
const User = require('../models/User');
const Job = require('../models/Job');
const recommendationService = require('../services/recommendationService');

/**
 * GET /api/recommendations/courses
 * Returns top 6 personalized course recommendations.
 */
exports.getRecommendedCourses = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).lean();

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // 1. Gather User Signals
        const signals = {
            skills: user.skills || [],
            targetRole: user.targetRole || '',
            year: user.year,
            missingSkills: []
        };

        // Enchance targetRole if missing (same logic as skillGapController)
        if (!signals.targetRole) {
            const appliedJobs = await Job.find({ 'applicants.student': userId }).limit(5).lean();
            if (appliedJobs.length > 0) {
                const roleCounts = {};
                appliedJobs.forEach(j => {
                    roleCounts[j.title] = (roleCounts[j.title] || 0) + 1;
                });
                signals.targetRole = Object.keys(roleCounts).reduce((a, b) => roleCounts[a] > roleCounts[b] ? a : b);
            }
        }

        // 2. Fetch Active Courses
        const courses = await Course.find({ isActive: true }).lean();

        // 3. Handle Cold Start (No skills and no target role)
        if (signals.skills.length === 0 && !signals.targetRole) {
            const coldStartRecs = recommendationService.getColdStartRecommendations(
                await Course.find({ isActive: true }),
                user.year
            );
            return res.status(200).json({ success: true, recommendations: coldStartRecs });
        }

        // 4. Score and Rank
        const scoredRecommendations = courses
            .map(course => recommendationService.scoreCourse(course, signals))
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 6);

        res.status(200).json({
            success: true,
            recommendations: scoredRecommendations
        });

    } catch (err) {
        console.error('[recommendations] Error:', err);
        res.status(500).json({ success: false, message: 'Failed to generate recommendations' });
    }
};
