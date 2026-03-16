const Course = require('../models/Course');
const User = require('../models/User');
const { calculateCourseScore } = require('../services/recommendationService');

/**
 * @desc    Create a new course
 * @route   POST /api/admin/courses
 * @access  Private (Admin)
 */
exports.createCourse = async (req, res) => {
    try {
        const {
            title, summaryLine, description, category,
            skillsRequired, jobRoles, topCompanies,
            level, durationEstimate, eligibleYears,
            roadmapPdfUrl, isTrending
        } = req.body;

        const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

        const slugExists = await Course.findOne({ slug });
        if (slugExists) {
            return res.status(400).json({ success: false, message: 'Course with similar title already exists' });
        }

        const course = await Course.create({
            title,
            slug,
            summaryLine,
            description,
            category,
            skillsRequired,
            jobRoles,
            topCompanies,
            level,
            durationEstimate,
            eligibleYears,
            roadmapPdfUrl,
            isTrending,
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            data: course
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get courses for admin with pagination
 * @route   GET /api/admin/courses
 * @access  Private (Admin)
 */
exports.getAdminCourses = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const courses = await Course.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Course.countDocuments();

        res.status(200).json({
            success: true,
            count: courses.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: courses
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get course by ID
 * @route   GET /api/admin/courses/:id
 * @access  Private (Admin)
 */
exports.getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        res.status(200).json({
            success: true,
            data: course
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Update course
 * @route   PATCH /api/admin/courses/:id
 * @access  Private (Admin)
 */
exports.updateCourse = async (req, res) => {
    try {
        let course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        if (req.body.title && req.body.title !== course.title) {
            req.body.slug = req.body.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        }

        course = await Course.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: course
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Soft delete course
 * @route   DELETE /api/admin/courses/:id
 * @access  Private (Admin)
 */
exports.deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        course.isActive = false;
        await course.save();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get all active courses for students
 * @route   GET /api/courses
 * @access  Public
 */
exports.getCourses = async (req, res) => {
    try {
        const { category, level, search, year, isTrending, page = 1, limit = 9 } = req.query;

        const query = { isActive: true };

        // Handle Year Filter - Priority: Query Param > User's current year
        let filterYear = year;
        if (req.user && req.user.role === 'student' && !year) {
            filterYear = req.user.year;
        }

        if (filterYear && filterYear !== 'all') {
            query.eligibleYears = Number(filterYear);
        }

        if (category && category !== 'all') query.category = category;
        if (level) query.level = level;
        if (isTrending === 'true') query.isTrending = true;

        if (search) {
            query.$text = { $search: search };
        }

        // Fetch all candidates to allow global ranking by matchScore
        // For a very large database, we would limit this to top N by date/trending first
        let courses = await Course.find(query).lean();

        // --- PERSONALIZED RANKING ---
        let rankedData = courses;
        if (req.user && req.user.role === 'student') {
            const user = await User.findById(req.user.id).select('stream department year skills').lean();
            if (user) {
                rankedData = courses.map(course => {
                    const result = calculateCourseScore(course, user);
                    let score = result.score;

                    // Boost if matches user's specific year
                    if (course.eligibleYears && user.year && course.eligibleYears.includes(Number(user.year))) {
                        score += 20;
                    }

                    return {
                        ...course,
                        matchScore: score,
                        isCrossStream: result.isCrossStream
                    };
                }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
            }
        } else {
            // Default sort for non-students or non-logged in
            rankedData = courses.sort((a, b) => {
                if (a.isTrending && !b.isTrending) return -1;
                if (!a.isTrending && b.isTrending) return 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
        }

        // --- MANUAL PAGINATION ---
        const total = rankedData.length;
        const p = parseInt(page);
        const l = parseInt(limit);
        const startIndex = (p - 1) * l;
        const paginatedData = rankedData.slice(startIndex, startIndex + l);

        res.status(200).json({
            success: true,
            count: paginatedData.length,
            total,
            page: p,
            pages: Math.ceil(total / l),
            data: paginatedData
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get single course by slug (with analytics increment)
 * @route   GET /api/courses/:slug
 * @access  Public
 */
exports.getCourseBySlug = async (req, res) => {
    try {
        const course = await Course.findOneAndUpdate(
            { slug: req.params.slug, isActive: true },
            { $inc: { viewCount: 1 } },
            { new: true }
        ).lean();

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        res.status(200).json({
            success: true,
            data: course
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get download URL (with download tracking)
 * @route   GET /api/courses/:slug/download
 * @access  Public
 */
exports.getCourseDownload = async (req, res) => {
    try {
        const course = await Course.findOneAndUpdate(
            { slug: req.params.slug, isActive: true },
            { $inc: { downloadCount: 1 } },
            { new: true }
        ).select('roadmapPdfUrl slug').lean();

        if (!course || !course.roadmapPdfUrl) {
            return res.status(400).json({ success: false, message: 'Roadmap PDF not available' });
        }

        res.status(200).json({
            success: true,
            downloadUrl: course.roadmapPdfUrl
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Upload Roadmap PDF
 * @route   POST /api/courses/upload-roadmap
 * @access  Private (Admin)
 */
exports.uploadRoadmap = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a PDF file' });
        }

        const protocol = req.protocol;
        const host = req.get('host');
        const fileUrl = `${protocol}://${host}/uploads/roadmaps/${req.file.filename}`;

        res.status(200).json({
            success: true,
            url: fileUrl
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
