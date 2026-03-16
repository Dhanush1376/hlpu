const User = require('../models/User');
const { generateCareerInsights } = require('../services/aiCareerService');

/**
 * GET /api/ai/career-insights
 * Returns AI-driven career predictions and insights for the logged-in student.
 */
exports.getCareerInsights = async (req, res) => {
    try {
        const userId = req.user.id;
        const student = await User.findById(userId).lean();

        if (!student) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Generate insights using lightweight ML/Heuristic engine
        const insights = generateCareerInsights(student);

        res.status(200).json({
            success: true,
            data: insights
        });
    } catch (err) {
        console.error('[CareerInsights] Error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to generate career insights' });
    }
};
