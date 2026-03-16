const CoursePath = require('../models/CoursePath');
const CourseStep = require('../models/CourseStep');
const StudentProgress = require('../models/StudentProgress');
const User = require('../models/User');

/**
 * GET /api/coursemap/paths
 * Return available career paths with optional filters.
 */
const getPaths = async (req, res) => {
    try {
        const { department, difficulty } = req.query;
        const query = { isActive: true };

        if (department) query.department = department;
        if (difficulty) query.difficulty = difficulty;

        const paths = await CoursePath.find(query).lean();
        res.json(paths);
    } catch (err) {
        console.error('[courseMap] getPaths error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/coursemap/paths/:id
 * Return full roadmap steps and student progress.
 */
const getPathDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const path = await CoursePath.findById(id).lean();
        if (!path) return res.status(404).json({ message: 'Path not found' });

        const steps = await CourseStep.find({ coursePath: id }).sort({ order: 1 }).lean();
        const progress = await StudentProgress.findOne({ student: userId, coursePath: id }).lean();

        res.json({
            path,
            steps,
            progress: progress || { completedSteps: [], progressPercent: 0 }
        });
    } catch (err) {
        console.error('[courseMap] getPathDetails error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/coursemap/progress/:stepId
 * Mark a step complete and update progress percent.
 */
const updateProgress = async (req, res) => {
    try {
        const { stepId } = req.params;
        const userId = req.user.id;

        const step = await CourseStep.findById(stepId);
        if (!step) return res.status(404).json({ message: 'Step not found' });

        const totalStepsCount = await CourseStep.countDocuments({ coursePath: step.coursePath });

        let progress = await StudentProgress.findOne({ student: userId, coursePath: step.coursePath });

        if (!progress) {
            progress = new StudentProgress({
                student: userId,
                coursePath: step.coursePath,
                completedSteps: [stepId]
            });
        } else if (!progress.completedSteps.includes(stepId)) {
            progress.completedSteps.push(stepId);
            progress.lastAccessedAt = Date.now();
        }

        progress.progressPercent = Math.round((progress.completedSteps.length / totalStepsCount) * 100);
        await progress.save();

        res.json({
            message: 'Progress updated',
            progressPercent: progress.progressPercent,
            completedSteps: progress.completedSteps
        });
    } catch (err) {
        console.error('[courseMap] updateProgress error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/coursemap/recommended
 * Return personalized career path recommendations.
 */
const getRecommended = async (req, res) => {
    try {
        const student = await User.findById(req.user.id);
        if (!student) return res.status(404).json({ message: 'User not found' });

        const studentDept = student.department;
        const studentSkills = student.skills || [];

        // Aggregate paths with ranking logic
        const recommended = await CoursePath.aggregate([
            { $match: { isActive: true } },
            {
                $addFields: {
                    score: {
                        $add: [
                            // 1. Department match: +40
                            { $cond: [{ $eq: ["$department", studentDept] }, 40, 0] },
                            // 2. Skill overlap: +30 max (+6 per skill)
                            {
                                $min: [
                                    30,
                                    {
                                        $multiply: [
                                            { $size: { $setIntersection: ["$skills", studentSkills] } }, // Assuming CoursePath might have a skills field added for better matching
                                            6
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                }
            },
            { $sort: { score: -1 } },
            { $limit: 3 }
        ]);

        res.json(recommended);
    } catch (err) {
        console.error('[courseMap] getRecommended error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/coursemap/progress/current
 * Fetch active progress for dashboard widget.
 */
const getCurrentProgress = async (req, res) => {
    try {
        const userId = req.user.id;
        const progress = await StudentProgress.findOne({ student: userId })
            .populate('coursePath')
            .sort({ lastAccessedAt: -1 })
            .lean();

        if (!progress) return res.json(null);

        // Find next step
        const nextStep = await CourseStep.findOne({
            coursePath: progress.coursePath._id,
            _id: { $nin: progress.completedSteps }
        }).sort({ order: 1 }).lean();

        res.json({
            pathTitle: progress.coursePath.role,
            progressPercent: progress.progressPercent,
            nextStep: nextStep ? nextStep.title : 'All steps completed!'
        });
    } catch (err) {
        console.error('[courseMap] getCurrentProgress error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getPaths,
    getPathDetails,
    updateProgress,
    getRecommended,
    getCurrentProgress
};

