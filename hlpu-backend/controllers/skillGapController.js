const User = require('../models/User');
const Job = require('../models/Job');
const CoursePath = require('../models/CoursePath');
const CourseStep = require('../models/CourseStep');
const LaunchProject = require('../models/LaunchProject');

/**
 * Default roles based on department if no targetRole or job applications exist.
 */
const DEPT_DEFAULT_ROLES = {
    'cse': 'Software Engineer',
    'ece': 'Embedded Systems Engineer',
    'mech': 'Mechanical Design Engineer',
    'civil': 'Structural Engineer',
    'bba': 'Business Analyst',
    'design': 'UI/UX Designer'
};

/**
 * GET /api/ai/skill-gap
 * Personalized skill gap analysis for students.
 */
exports.getSkillGap = async (req, res) => {
    try {
        const student = await User.findById(req.user.id).lean();
        if (!student) return res.status(404).json({ message: 'Student not found' });

        // 1. Determine Target Role
        let targetRole = student.targetRole;

        if (!targetRole) {
            // Priority 2: most applied job role
            const appliedJobs = await Job.find({ 'applicants.student': student._id }).limit(10).lean();
            if (appliedJobs.length > 0) {
                const roleCounts = {};
                appliedJobs.forEach(j => {
                    const title = j.title || 'Professional';
                    roleCounts[title] = (roleCounts[title] || 0) + 1;
                });
                targetRole = Object.keys(roleCounts).reduce((a, b) => roleCounts[a] > roleCounts[b] ? a : b);
            }
        }

        if (!targetRole) {
            // Priority 3: department default
            const dept = (student.department || '').toLowerCase();
            targetRole = DEPT_DEFAULT_ROLES[dept] || 'Professional';
        }

        // 2. Aggregate Required Skills
        // a) From matched CoursePath
        // Escape regex special characters to prevent crashes
        const escapedRole = (targetRole || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const coursePath = await CoursePath.findOne({
            isActive: true,
            role: { $regex: new RegExp('^' + escapedRole + '$', 'i') }
        }).lean() || await CoursePath.findOne({
            isActive: true,
            role: { $regex: new RegExp(escapedRole, 'i') }
        }).lean();

        let requiredSkills = coursePath ? (coursePath.skills || []) : [];

        // b) From Market Trends (Jobs with similar title)
        const marketJobs = await Job.find({
            title: { $regex: new RegExp(escapedRole, 'i') }
        }).limit(20).lean();

        const marketSkills = new Set();
        marketJobs.forEach(j => {
            (j.skills || []).forEach(s => marketSkills.add(s));
        });

        // Merge and unique
        const allRequiredSkills = Array.from(new Set([...requiredSkills, ...Array.from(marketSkills)]));

        // Fallback for empty results
        if (allRequiredSkills.length === 0) {
            allRequiredSkills.push('Critical Thinking', 'Problem Solving', 'Communication');
        }

        // 3. Compute Gap Analysis
        const studentSkills = new Set((student.skills || []).map(s => s.toLowerCase()));
        const matchedSkills = [];
        const missingSkills = [];

        allRequiredSkills.forEach(skill => {
            if (studentSkills.has(skill.toLowerCase())) {
                matchedSkills.push(skill);
            } else {
                missingSkills.push(skill);
            }
        });

        // 4. Compute Readiness Score
        const readinessScore = allRequiredSkills.length > 0
            ? Math.round((matchedSkills.length / allRequiredSkills.length) * 100)
            : 0;

        // 5. Generate Recommendations
        // Courses
        let recommendedCourses = [];
        if (coursePath) {
            const steps = await CourseStep.find({
                coursePath: coursePath._id,
                type: 'course'
            }).limit(3).lean();
            recommendedCourses = steps.map(s => s.title);
        }

        // Projects (from LaunchPad)
        const recommendedProjects = await LaunchProject.find({
            status: 'open',
            $or: [
                { skillsRequired: { $in: missingSkills } },
                { domain: coursePath ? coursePath.department : student.department }
            ]
        }).limit(3).lean();

        // 6. Final Priority Logic
        let priorityLevel = 'low';
        if (readinessScore < 40) priorityLevel = 'high';
        else if (readinessScore <= 70) priorityLevel = 'medium';

        res.json({
            targetRole,
            readinessScore,
            matchedSkills,
            missingSkills,
            recommendedCourses,
            recommendedProjects: recommendedProjects.map(p => p.title),
            priorityLevel
        });

    } catch (err) {
        console.error('[skillGap] Analysis error:', err.message);
        res.status(500).json({ message: 'Analysis failed — please try again later.' });
    }
};
