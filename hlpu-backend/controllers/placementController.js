const mongoose = require('mongoose');
const User = require('../models/User');
const Job = require('../models/Job');
const CoursePath = require('../models/CoursePath');
const StudentProgress = require('../models/StudentProgress');
const MockInterview = require('../models/MockInterview');
const MentorRequest = require('../models/MentorRequest');
const LaunchApplication = require('../models/LaunchApplication');

/**
 * GET /api/ai/placement-score
 * Calculates placement probability based on 5 weighted pillars.
 */
exports.getPlacementScore = async (req, res) => {
    try {
        const userId = req.user.id;
        const student = await User.findById(userId).lean();
        if (!student) return res.status(404).json({ message: 'User not found' });

        // 1. Profile Completion (20%)
        let profileScore = 0;
        if (student.name) profileScore += 10;
        if (student.title) profileScore += 10;
        if (student.about) profileScore += 15;
        if (student.skills && student.skills.length >= 3) profileScore += 15;
        if (student.projects && student.projects.length >= 1) profileScore += 15;
        if (student.education && student.education.length >= 1) profileScore += 15;
        const contactLinks = student.contact ? Object.values(student.contact).filter(v => !!v).length : 0;
        if (contactLinks >= 3) profileScore += 20;

        // 2. Skills Depth (25%)
        // Logic similar to Skill Gap analyzer
        let skillScore = 0;
        let targetRole = student.targetRole || 'Software Engineer'; // Default
        const escapedRole = targetRole.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const coursePath = await CoursePath.findOne({
            isActive: true,
            role: { $regex: new RegExp('^' + escapedRole + '$', 'i') }
        }).lean();

        if (coursePath && coursePath.skills && coursePath.skills.length > 0) {
            const studentSkills = new Set((student.skills || []).map(s => s.toLowerCase()));
            const matchedCount = coursePath.skills.filter(s => studentSkills.has(s.toLowerCase())).length;
            skillScore = Math.round((matchedCount / coursePath.skills.length) * 100);
        } else {
            // Fallback if no course path match
            skillScore = student.skills && student.skills.length > 5 ? 80 : (student.skills ? student.skills.length * 15 : 0);
        }
        skillScore = Math.min(100, skillScore);

        // 3. Project Quality (20%)
        let projectScore = 0;
        const profileProjectsCount = (student.projects || []).length;
        if (profileProjectsCount >= 1) projectScore += 40;
        if (profileProjectsCount >= 2) projectScore += 30;
        if (profileProjectsCount >= 3) projectScore += 10;

        // Bonus for Launchpad engagement
        const launchApps = await LaunchApplication.countDocuments({ applicant: userId, status: 'accepted' });
        if (launchApps > 0) projectScore += 20;
        projectScore = Math.min(100, projectScore);

        // 4. Activity Level (15%)
        let activityScore = 0;
        const [mocks, mentors] = await Promise.all([
            MockInterview.countDocuments({ student: userId, status: { $in: ['accepted', 'completed'] } }),
            MentorRequest.countDocuments({ student: userId, status: { $in: ['accepted', 'completed'] } })
        ]);

        if (mocks > 0) activityScore += 40;
        if (mocks > 1) activityScore += 20;
        if (mentors > 0) activityScore += 40;
        activityScore = Math.min(100, activityScore);

        // 5. Course Progress (20%)
        let courseScore = 0;
        const progress = await StudentProgress.find({ student: userId }).sort({ progressPercent: -1 }).limit(1).lean();
        if (progress.length > 0) {
            courseScore = progress[0].progressPercent;
        }

        // Final Weighted Calculation
        const finalScore = Math.round(
            (profileScore * 0.20) +
            (skillScore * 0.25) +
            (projectScore * 0.20) +
            (activityScore * 0.15) +
            (courseScore * 0.20)
        );

        // Level Determination
        let level = 'Needs Improvement';
        if (finalScore >= 85) level = 'Excellent';
        else if (finalScore >= 70) level = 'Good';
        else if (finalScore >= 50) level = 'Average';

        res.json({
            placementScore: finalScore,
            level,
            breakdown: {
                profileCompletion: profileScore,
                skillsDepth: skillScore,
                projectQuality: projectScore,
                activityLevel: activityScore,
                courseProgress: courseScore
            }
        });

    } catch (err) {
        console.error('[placementScore] Error:', err.message);
        res.status(500).json({ message: 'Failed to calculate placement score' });
    }
};
