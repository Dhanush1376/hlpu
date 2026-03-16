const mongoose = require('mongoose');
const Job = require('../models/Job');
const SavedJob = require('../models/SavedJob');
const Notification = require('../models/Notification');
const { emitNotification } = require('../utils/socket');
const User = require('../models/User'); // Need this to get user names
const { trackEvent } = require('../services/analyticsService');

/**
 * POST /api/jobs
 * Create a new job posting (alumni only).
 */
const createJob = async (req, res) => {
    try {
        if (req.user.role !== 'alumni' && req.user.role !== 'recruiter' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only alumni, recruiters, and admins can post jobs' });
        }

        const {
            title,
            company,
            companyName,
            companyLogo,
            description,
            department,
            location,
            jobType,
            experienceLevel,
            workMode,
            skills,
            tags,
            salaryMin,
            salaryMax,
            salaryPeriod,
            deadline,
            applicationDeadline,
            link
        } = req.body;

        // Validation
        if (!title || !description) {
            return res.status(400).json({ message: 'Title and description are required' });
        }

        const finalCompanyName = companyName || company;
        if (!finalCompanyName) {
            return res.status(400).json({ message: 'Company name is required' });
        }
        if (!jobType) {
            return res.status(400).json({ message: 'Job Type is required' });
        }
        if (!workMode) {
            return res.status(400).json({ message: 'Work Mode is required' });
        }

        const sMin = salaryMin ? Number(salaryMin) : undefined;
        const sMax = salaryMax ? Number(salaryMax) : undefined;

        if (sMin !== undefined && sMax !== undefined && sMin > sMax) {
            return res.status(400).json({ message: 'Minimum salary cannot be greater than maximum salary' });
        }

        // Compute expiresAt from deadline if not provided
        const finalDeadline = deadline || applicationDeadline;
        const expiresAtValue = req.body.expiresAt || finalDeadline || null;

        const job = await Job.create({
            title,
            company: finalCompanyName,
            companyName: finalCompanyName,
            companyLogo,
            description,
            department,
            location,
            jobType,
            experienceLevel,
            workMode,
            skills,
            tags,
            salaryMin: sMin,
            salaryMax: sMax,
            salaryPeriod,
            deadline: finalDeadline,
            applicationDeadline: finalDeadline,
            link,
            postedBy: req.user.id,
            status: 'active',
            expiresAt: expiresAtValue,
        });

        // Trigger Real-time Event for Dashboards
        try {
            const io = require('../utils/socket').getIO();
            if (io) {
                io.emit('job:new', {
                    _id: job._id,
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    jobType: job.jobType,
                    createdAt: job.createdAt
                });
            }
        } catch (socketErr) {
            console.error('[socket] job:new emission failed:', socketErr.message);
        }

        res.status(201).json(job);

        // Track Event: job_posted
        trackEvent('job_posted', req, { jobId: job._id });
    } catch (err) {
        console.error('[jobs] createJob error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/jobs
 * Fetch all jobs with filtering and pagination.
 */
const getAllJobs = async (req, res) => {
    try {
        const { search, location, jobType, department, experienceLevel, skills, company, datePosted, sortBy, page = 1, limit = 10 } = req.query;
        let query = {};

        // --- LIFECYCLE FILTER: Only show active, non-expired jobs (unless admin) ---
        if (req.user.role !== 'admin') {
            query.status = { $in: ['active', undefined, null] };
            query.$and = query.$and || [];
            query.$and.push({
                $or: [
                    { expiresAt: { $gt: new Date() } },
                    { expiresAt: null },
                    { expiresAt: { $exists: false } }
                ]
            });
        }

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            const searchOr = [{ title: searchRegex }, { company: searchRegex }, { companyName: searchRegex }, { description: searchRegex }];
            if (query.$and) {
                query.$and.push({ $or: searchOr });
            } else {
                query.$or = searchOr;
            }
        }
        if (location) query.location = new RegExp(location, 'i');
        if (jobType && jobType !== 'all') query.jobType = new RegExp(`^${jobType}$`, 'i');
        if (experienceLevel && experienceLevel !== 'all') query.experienceLevel = new RegExp(`^${experienceLevel}$`, 'i');
        if (company) {
            const companyOr = [{ company: new RegExp(company, 'i') }, { companyName: new RegExp(company, 'i') }];
            if (query.$and) {
                query.$and.push({ $or: companyOr });
            } else if (query.$or) {
                query.$and = [{ $or: query.$or }, { $or: companyOr }];
                delete query.$or;
            } else {
                query.$or = companyOr;
            }
        }
        if (skills) {
            const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
            if (skillList.length) query.skills = { $in: skillList.map(s => new RegExp(s, 'i')) };
        }
        if (datePosted && datePosted !== 'all') {
            const now = new Date();
            if (datePosted === 'today') query.createdAt = { $gte: new Date(now.setHours(0, 0, 0, 0)) };
            else if (datePosted === 'week') query.createdAt = { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) };
            else if (datePosted === 'month') query.createdAt = { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
        }

        if (department && department !== 'all') {
            if (department === 'Engineering') {
                query.department = { $in: [/CSE/i, /ECE/i, /EEE/i, /Mechanical/i, /Civil/i] };
            } else if (department === 'Management') {
                query.department = { $in: [/MBA/i, /BBA/i] };
            } else if (department === 'Science') {
                query.department = /Sciences/i;
            } else if (department === 'Commerce') {
                query.department = /Commerce|Finance|BBA/i;
            } else {
                query.department = new RegExp(department, 'i');
            }
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // --- RELEVANCE SORT via recommendationService ---
        let jobs;
        let total = 0;

        let studentProfile = null;
        if (req.user && req.user.role === 'student') {
            studentProfile = await User.findById(req.user.id).select('skills stream department').lean();
        }

        const { calculateJobScore } = require('../services/recommendationService');

        if (sortBy === 'relevance' && studentProfile) {
            // Memory based full sort 
            const allMatchingJobs = await Job.find(query)
                .populate('postedBy', 'name role')
                .lean();

            const scoredJobs = allMatchingJobs.map(job => {
                const { score, isCrossStream } = calculateJobScore(job, studentProfile);
                return { ...job, matchScore: score, isCrossStream };
            });

            // Sort: matchScore DESC, createdAt DESC
            scoredJobs.sort((a, b) => {
                if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            });

            total = scoredJobs.length;
            jobs = scoredJobs.slice(skip, skip + limitNum);
        } else {
            // Smart sorting
            let sortObj = { createdAt: -1 };
            if (sortBy === 'applicants') sortObj = { 'applicants': -1, createdAt: -1 };

            total = await Job.countDocuments(query);
            jobs = await Job.find(query)
                .sort(sortObj)
                .skip(skip)
                .limit(limitNum)
                .populate('postedBy', 'name role')
                .lean();

            if (studentProfile) {
                jobs = jobs.map(job => {
                    const { score, isCrossStream } = calculateJobScore(job, studentProfile);
                    return { ...job, matchScore: score, isCrossStream };
                });
            }
        }

        const jobData = jobs.map(job => {
            let userStatus = null;
            try {
                if (req.user && req.user.role === 'student' && Array.isArray(job.applicants)) {
                    const currentUserIdStr = req.user.id ? req.user.id.toString() : null;
                    if (currentUserIdStr) {
                        const app = job.applicants.find(a => {
                            if (!a) return false;
                            const applicantId = a.student || a.user || a;
                            if (!applicantId) return false;
                            return applicantId.toString() === currentUserIdStr;
                        });
                        if (app) userStatus = app.status || 'pending';
                    }
                }
            } catch (err) {
                console.warn(`[jobs] Mapping error for job ${job._id}:`, err.message);
            }
            return {
                ...job,
                company: job.companyName || job.company || 'Unknown Company',
                companyName: job.companyName || job.company || 'Unknown Company',
                applicationStatus: userStatus,
            };
        });

        res.json({
            jobs: jobData,
            pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1 }
        });
    } catch (err) {
        console.error('[jobs] getAllJobs error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/jobs/:id
 * Fetch a single job by ID.
 */
const getJobById = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id)
            .populate('postedBy', 'name role')
            .lean();

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Map unified fields
        const jobData = {
            ...job,
            company: job.companyName || job.company || 'Unknown Company',
            companyName: job.companyName || job.company || 'Unknown Company'
        };

        res.json(jobData);

        // Track Event: job_view
        trackEvent('job_view', req, { jobId: job._id, title: job.title });
    } catch (err) {
        console.error('[jobs] getJobById error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/jobs/mine
 * Fetch jobs posted by the logged-in alumni.
 */
const getMyPostedJobs = async (req, res) => {
    try {
        if (req.user.role !== 'alumni' && req.user.role !== 'recruiter' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only alumni, recruiters, and admins can view their posted jobs' });
        }
        const jobs = await Job.find({ postedBy: req.user.id }).sort({ createdAt: -1 }).lean();
        res.json(jobs);
    } catch (err) {
        console.error('[jobs] getMyPostedJobs error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/jobs/applied
 * Aliased for GET /api/jobs/applications/student
 */
const getAppliedJobs = async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can view applied jobs' });
        }

        const jobs = await Job.find({
            $or: [
                { "applicants.student": req.user.id },
                { "applicants.user": req.user.id },
                { "applicants": req.user.id }
            ]
        })
            .sort({ createdAt: -1 })
            .populate('postedBy', 'name email role')
            .lean();

        const applications = jobs.map(job => {
            let app = null;
            try {
                // Find the specific applicant record for this user
                app = (job.applicants || []).find(a => {
                    if (!a) return false;
                    const applicantId = a.student ? a.student : (a.user ? a.user : a);
                    return applicantId && applicantId.toString() === req.user.id;
                });
            } catch (err) {
                console.warn(`[jobs] Applied mapping error for job ${job._id}:`, err.message);
            }

            return {
                ...job,
                // New unified fields
                company: job.companyName || job.company || 'Unknown Company',
                companyName: job.companyName || job.company || 'Unknown Company',
                applicationStatus: app && app.status ? app.status : 'pending',
                appliedAtDate: app && app.appliedAt ? app.appliedAt : (job.appliedAt || job.createdAt),

                // Legacy fields for backward compatibility
                status: app && app.status ? app.status : 'pending',
                appliedAt: app && app.appliedAt ? app.appliedAt : (job.appliedAt || job.createdAt),
                alumni: job.postedBy
            };
        });

        res.json(applications);
    } catch (err) {
        console.error('[jobs] getAppliedJobs error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/jobs/:id/apply
 */
const applyToJob = async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can apply to jobs' });
        }

        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Lifecycle check: only apply to active, non-expired jobs
        if (job.status && job.status !== 'active') {
            return res.status(400).json({ message: `Cannot apply — job is ${job.status}` });
        }
        if (job.expiresAt && new Date(job.expiresAt) < new Date()) {
            return res.status(400).json({ message: 'Cannot apply — job has expired' });
        }

        const alreadyApplied = job.applicants.some(app =>
            (app.student ? app.student.toString() : (app.user ? app.user.toString() : app.toString())) === req.user.id
        );
        if (alreadyApplied) return res.status(400).json({ message: 'Already applied' });

        job.applicants.push({
            student: req.user.id,
            status: 'pending',
            appliedAt: new Date()
        });
        await job.save();

        // Real-time: broadcast new application event
        try {
            const io = require('../utils/socket').getIO();
            if (io) {
                io.emit('job:application:new', {
                    jobId: job._id,
                    jobTitle: job.title,
                    applicantCount: job.applicants.length
                });
            }
        } catch (e) { /* graceful fallback */ }

        // Trigger Notification to Alumni
        try {
            const student = await User.findById(req.user.id).lean();
            const notification = await Notification.create({
                user: job.postedBy,
                type: 'job_applied',
                title: 'New Job Application',
                message: `${student ? student.name : 'A student'} applied for your job: ${job.title}`,
                metadata: {
                    jobId: job._id,
                    studentId: req.user.id,
                    jobTitle: job.title
                }
            });
            emitNotification(job.postedBy, notification);
        } catch (notifierErr) {
            console.error('[notifier] job_applied error:', notifierErr.message);
        }

        res.json({ message: 'Application submitted successfully' });

        // Track Event: job_applied
        trackEvent('job_applied', req, { jobId: job._id });
    } catch (err) {
        console.error('[jobs] applyToJob error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/jobs/applications/alumni
 * Aggregate all applications for jobs posted by this alumni.
 */
const getAlumniApplications = async (req, res) => {
    try {
        if (req.user.role !== 'alumni' && req.user.role !== 'recruiter' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only alumni, recruiters, and admins can view recruitment dashboard' });
        }

        const jobs = await Job.find({ postedBy: req.user.id })
            .populate('applicants.student', 'name email department skills placementScore readinessScore profileStrength')
            .populate('applicants.user', 'name email department') // for legacy
            .lean();

        let allApplicants = [];
        jobs.forEach(job => {
            job.applicants.forEach(app => {
                const studentInfo = app.student || app.user;
                if (studentInfo) {
                    allApplicants.push({
                        jobId: job._id,
                        jobTitle: job.title,
                        company: job.companyName || job.company,
                        studentId: studentInfo._id,
                        studentName: studentInfo.name,
                        studentEmail: studentInfo.email,
                        studentDepartment: studentInfo.department,
                        status: app.status || 'pending',
                        appliedAt: app.appliedAt || job.createdAt
                    });
                }
            });
        });

        // Sort by most recent application first
        allApplicants.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

        res.json(allApplicants);
    } catch (err) {
        console.error('[jobs] getAlumniApplications error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/jobs/:id/applicants
 * Ranked applicant list with match scoring via Intelligence Engine.
 * Supports pagination: ?page=1&limit=20
 */
const getJobApplicants = async (req, res) => {
    try {
        if (!['alumni', 'recruiter', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const jobId = req.params.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        // Fetch job and populate applicants (with student profile)
        const job = await Job.findById(jobId)
            .select('postedBy skills title department experienceLevel applicants')
            .populate({
                path: 'applicants.student',
                select: 'name email role department stream skills profilePic yearsOfExperience careerInsights'
            })
            .lean();

        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Ownership check (admin bypasses)
        const isOwner = job.postedBy && job.postedBy.toString() === req.user.id;
        if (!isOwner && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Filter valid populated students
        const validApplicants = (job.applicants || []).filter(app => app.student);

        // Delegate to intelligence engine
        const { rankApplicants } = require('../services/intelligenceEngine');
        const rankedApplicants = rankApplicants(job, validApplicants);

        // Paginate results
        const total = rankedApplicants.length;
        const paginatedApplicants = rankedApplicants.slice(skip, skip + limit);

        // Format for response (flatten student fields to match expected structure)
        const applicants = paginatedApplicants.map(app => ({
            _id: app.student._id,
            name: app.student.name,
            email: app.student.email,
            role: app.student.role,
            department: app.student.department,
            skills: app.student.skills,
            profilePic: app.student.profilePic,
            matchScore: app.matchScore,
            matchedSkillsCount: app.student.skills ? job.skills.filter(s => app.student.skills.map(us => us.toLowerCase()).includes(s.toLowerCase())).length : 0,
            totalJobSkills: job.skills.length,
            placementProbability: app.placementProbability,
            skillMatchPercent: app.skillMatchPercent,
            missingCriticalSkills: app.missingCriticalSkills,
            shortlistTier: app.shortlistTier,
            appliedAt: app.appliedAt,
            status: app.status
        }));

        res.json({
            applicants,
            jobTitle: job.title,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 }
        });
    } catch (err) {
        console.error('[jobs] getJobApplicants error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PUT /api/jobs/:id
 */
const updateJob = async (req, res) => {
    try {
        if (!['alumni', 'recruiter', 'admin'].includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const isOwner = job.postedBy && job.postedBy.toString() === req.user.id;
        if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

        const allowedFields = ['title', 'company', 'companyName', 'companyLogo', 'description', 'location', 'jobType', 'experienceLevel', 'workMode', 'department', 'deadline', 'applicationDeadline', 'skills', 'tags', 'salaryMin', 'salaryMax', 'salaryPeriod', 'link'];
        allowedFields.forEach(field => { if (req.body[field] !== undefined) job[field] = req.body[field]; });

        const updatedJob = await job.save();

        // Real-time event
        try {
            const io = require('../utils/socket').getIO();
            if (io) io.emit('job:updated', { _id: updatedJob._id, title: updatedJob.title, company: updatedJob.company });
        } catch (e) { /* graceful fallback */ }

        res.json(updatedJob);
    } catch (err) {
        console.error('[jobs] updateJob error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * DELETE /api/jobs/:id
 */
const deleteJob = async (req, res) => {
    try {
        if (!['alumni', 'recruiter', 'admin'].includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const isOwner = job.postedBy && job.postedBy.toString() === req.user.id;
        if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

        const jobId = job._id;
        const jobTitle = job.title;
        await job.deleteOne();

        // Real-time event
        try {
            const io = require('../utils/socket').getIO();
            if (io) io.emit('job:deleted', { _id: jobId, title: jobTitle });
        } catch (e) { /* graceful fallback */ }

        res.json({ message: 'Job deleted successfully' });
    } catch (err) {
        console.error('[jobs] deleteJob error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PATCH /api/jobs/:id/applicants/:userId/status
 */
const updateApplicationStatus = async (req, res) => {
    try {
        if (!['alumni', 'recruiter', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Only authorized roles can update status' });
        }

        const { status } = req.body;
        if (!['pending', 'accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const isOwner = job.postedBy && job.postedBy.toString() === req.user.id;
        if (!isOwner && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const index = job.applicants.findIndex(app =>
            (app.student ? app.student.toString() : (app.user ? app.user.toString() : app.toString())) === req.params.userId
        );

        if (index === -1) return res.status(404).json({ message: 'Applicant not found' });

        const currentApp = job.applicants[index];
        if (typeof currentApp === 'string' || currentApp instanceof mongoose.Types.ObjectId) {
            job.applicants[index] = { student: req.params.userId, status: status, appliedAt: new Date() };
        } else {
            job.applicants[index].status = status;
            if (!job.applicants[index].student && job.applicants[index].user) {
                job.applicants[index].student = job.applicants[index].user;
            }
        }

        await job.save();

        // Trigger Notification to Student
        try {
            const type = status === 'accepted' ? 'application_accepted' : 'application_rejected';
            const title = status === 'accepted' ? 'Application Accepted! 🎉' : 'Application Update';
            const message = status === 'accepted'
                ? `Congratulations! Your application for "${job.title}" at ${job.company} has been accepted.`
                : `We regret to inform you that your application for "${job.title}" at ${job.company} was not selected.`;

            const notification = await Notification.create({
                user: req.params.userId,
                type: type,
                title: title,
                message: message,
                metadata: {
                    jobId: job._id,
                    status: status,
                    jobTitle: job.title,
                    company: job.company
                }
            });
            emitNotification(req.params.userId, notification);
        } catch (notifierErr) {
            console.error('[notifier] status_update error:', notifierErr.message);
        }

        res.json({ message: 'Status updated successfully', status });
    } catch (err) {
        console.error('[jobs] updateStatus error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/jobs/recommended
 * Personalized job recommendations for students.
 */
const getRecommendedJobs = async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students receive job recommendations' });
        }

        const student = await User.findById(req.user.id).lean();
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const studentDept = student.department || '';
        const studentSkills = student.skills || [];
        const preferredType = student.preferredJobType || '';
        const studentCity = (student.contact && student.contact.location) ? student.contact.location : '';

        // Recency decay: Jobs within 30 days get a boost
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const recommendations = await Job.aggregate([
            {
                $addFields: {
                    // 1. STREAM MATCH: +50
                    streamScore: {
                        $cond: [{ $eq: ["$stream", student.stream] }, 50, 0]
                    },
                    // 2. DEPARTMENT MATCH: +20
                    deptScore: {
                        $cond: [{ $eq: ["$department", studentDept] }, 20, 0]
                    },
                    // 3. SKILL MATCH: +5 per match (max 20)
                    skillOverlap: {
                        $size: { $setIntersection: [{ $ifNull: ["$skills", []] }, studentSkills] }
                    },
                    // 4. RECENCY BOOST: max +10 (linear decay over 30 days)
                    recencyScore: {
                        $subtract: [
                            10,
                            {
                                $multiply: [
                                    10,
                                    {
                                        $divide: [
                                            { $subtract: [new Date(), { $ifNull: ["$createdAt", new Date()] }] },
                                            30 * 24 * 60 * 60 * 1000
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $addFields: {
                    skillScore: { $min: [{ $multiply: ["$skillOverlap", 5] }, 20] },
                    // Ensure recencyScore is not negative
                    finalRecencyScore: { $max: ["$recencyScore", 0] }
                }
            },
            {
                $addFields: {
                    jobScore: {
                        $add: ["$streamScore", "$deptScore", "$skillScore", "$finalRecencyScore"]
                    }
                }
            },
            { $sort: { jobScore: -1 } },
            { $limit: 10 },
            {
                $project: {
                    title: 1,
                    company: 1,
                    companyName: 1,
                    location: 1,
                    jobType: 1,
                    workMode: 1,
                    skills: 1,
                    jobScore: 1,
                    createdAt: 1,
                    companyLogo: 1,
                    applicants: 1
                }
            }
        ]);

        const recommendationsWithStatus = recommendations.map(job => {
            let userStatus = null;
            try {
                if (req.user && req.user.role === 'student' && Array.isArray(job.applicants)) {
                    const currentUserIdStr = req.user.id ? req.user.id.toString() : null;
                    if (currentUserIdStr) {
                        const app = job.applicants.find(a => {
                            if (!a) return false;
                            const applicantId = a.student || a.user || a;
                            if (!applicantId) return false;
                            return applicantId.toString() === currentUserIdStr;
                        });
                        if (app) userStatus = app.status || 'pending';
                    }
                }
            } catch (err) {
                console.warn(`[jobs] Recs mapping error for job ${job._id}:`, err.message);
            }
            return {
                ...job,
                company: job.companyName || job.company || 'Unknown Company',
                companyName: job.companyName || job.company || 'Unknown Company',
                applicationStatus: userStatus
            };
        });

        res.json(recommendationsWithStatus);
    } catch (err) {
        console.error('[jobs] getRecommendedJobs error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/jobs/:id/flag
 * Allows students to flag a job for review.
 */
const flagJob = async (req, res) => {
    try {
        const { reason } = req.body;
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Add flag if not already flagged by this user
        if (!job.moderation.flags.some(f => f.user.toString() === req.user.id)) {
            job.moderation.flags.push({ user: req.user.id, reason });
            job.moderation.reviewStatus = 'flagged';
            await job.save();
        }

        res.json({ message: 'Job flagged for moderator review' });
    } catch (err) {
        console.error('[jobs] flagJob error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PATCH /api/jobs/:id/moderate
 * Admin moderation of a job.
 */
const moderateJob = async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

        const { status, adminNote } = req.body;
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        job.moderation.reviewStatus = status;
        if (adminNote) job.moderation.adminNote = adminNote;

        await job.save();

        // Log the event
        const { logEvent } = require('../utils/auditLogger');
        await logEvent({
            userId: req.user.id,
            action: 'job_moderated',
            targetType: 'Job',
            targetId: job._id,
            description: `Moderated job: ${job.title} to status: ${status}`,
            metadata: { status, adminNote }
        }, req);

        res.json({ message: `Job marked as ${status}`, job });
    } catch (err) {
        console.error('[jobs] moderateJob error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/jobs/admin/stats
 * Aggregated stats for Admin Dashboard
 */
const getAdminJobStats = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const totalActive = await Job.countDocuments({ "moderation.reviewStatus": { $ne: 'closed' } });
        const pendingReview = await Job.countDocuments({ "moderation.reviewStatus": 'pending' });
        const totalApplications = await Job.aggregate([
            { $project: { count: { $size: { $ifNull: ["$applicants", []] } } } },
            { $group: { _id: null, total: { $sum: "$count" } } }
        ]);

        const uniqueCompanies = await Job.distinct('company');

        res.json({
            active: totalActive,
            pending: pendingReview,
            applications: totalApplications[0] ? totalApplications[0].total : 0,
            companies: uniqueCompanies.length
        });
    } catch (err) {
        console.error('[jobs] getAdminJobStats error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/jobs/admin/export
 * Export all job postings for Admin
 */
const exportJobsAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const jobs = await Job.find()
            .populate('postedBy', 'name email role')
            .sort({ createdAt: -1 })
            .lean();

        const exportData = jobs.map(job => ({
            id: job._id,
            title: job.title,
            company: job.companyName || job.company,
            location: job.location,
            jobType: job.jobType,
            salary: `${job.salaryMin || 0} - ${job.salaryMax || 0} ${job.salaryPeriod || ''}`,
            postedBy: job.postedBy ? job.postedBy.name : 'System',
            postedByEmail: job.postedBy ? job.postedBy.email : 'N/A',
            applicantsCount: (job.applicants || []).length,
            status: job.moderation?.reviewStatus || 'unknown',
            postedAt: job.createdAt
        }));

        res.json(exportData);
    } catch (err) {
        console.error('[jobs] exportJobsAdmin error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// ================================
// PART 1 — JOB SAVE / BOOKMARK
// ================================

/**
 * POST /api/jobs/:id/save
 * Bookmark a job (any authenticated user).
 */
const saveJob = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid job ID' });
        }

        const jobExists = await Job.exists({ _id: req.params.id });
        if (!jobExists) return res.status(404).json({ message: 'Job not found' });

        await SavedJob.create({ user: req.user.id, job: req.params.id });

        // Real-time event
        try {
            const io = require('../utils/socket').getIO();
            if (io) io.to(`user:${req.user.id}`).emit('job:saved', { jobId: req.params.id });
        } catch (e) { /* graceful fallback */ }

        res.status(201).json({ message: 'Job saved' });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(200).json({ message: 'Job already saved' });
        }
        console.error('[jobs] saveJob error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * DELETE /api/jobs/:id/save
 * Remove a bookmark.
 */
const unsaveJob = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid job ID' });
        }

        const result = await SavedJob.deleteOne({ user: req.user.id, job: req.params.id });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Bookmark not found' });
        }

        // Real-time event
        try {
            const io = require('../utils/socket').getIO();
            if (io) io.to(`user:${req.user.id}`).emit('job:unsaved', { jobId: req.params.id });
        } catch (e) { /* graceful fallback */ }

        res.json({ message: 'Job unsaved' });
    } catch (err) {
        console.error('[jobs] unsaveJob error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/jobs/saved
 * Paginated list of saved jobs for current user.
 */
const getSavedJobs = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const total = await SavedJob.countDocuments({ user: req.user.id });

        const savedJobs = await SavedJob.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'job',
                populate: { path: 'postedBy', select: 'name role' }
            })
            .lean();

        const jobs = savedJobs
            .filter(s => s.job) // filter out deleted jobs
            .map(s => ({
                ...s.job,
                savedAt: s.createdAt,
                company: s.job.companyName || s.job.company || 'Unknown Company',
                companyName: s.job.companyName || s.job.company || 'Unknown Company'
            }));

        res.json({
            jobs,
            pagination: { total, page, pages: Math.ceil(total / limit) || 1 }
        });
    } catch (err) {
        console.error('[jobs] getSavedJobs error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// ================================
// PART 2 — JOB LIFECYCLE STATUS
// ================================

/**
 * PATCH /api/jobs/:id/status
 * Owner can pause/close/reactivate. Admin can override.
 */
const updateJobStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['active', 'paused', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Allowed: ${validStatuses.join(', ')}` });
        }

        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const isOwner = job.postedBy && job.postedBy.toString() === req.user.id;
        if (!isOwner && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const previousStatus = job.status;
        job.status = status;
        await job.save();

        // Real-time event
        try {
            const io = require('../utils/socket').getIO();
            if (io) {
                io.emit('job:statusChanged', {
                    jobId: job._id,
                    title: job.title,
                    previousStatus,
                    newStatus: status
                });
            }
        } catch (e) { /* graceful fallback */ }

        res.json({ message: `Job status updated to ${status}`, status: job.status });
    } catch (err) {
        console.error('[jobs] updateJobStatus error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// ================================
// PART 3 — APPLICATION WITHDRAWAL
// ================================

/**
 * PATCH /api/jobs/:id/withdraw
 * Student withdraws their own pending application.
 */
const withdrawApplication = async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can withdraw applications' });
        }

        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const index = job.applicants.findIndex(app =>
            (app.student ? app.student.toString() : (app.user ? app.user.toString() : app.toString())) === req.user.id
        );

        if (index === -1) return res.status(404).json({ message: 'Application not found' });

        const currentApp = job.applicants[index];
        if (currentApp.status === 'withdrawn') {
            return res.status(400).json({ message: 'Application already withdrawn' });
        }
        if (currentApp.status !== 'pending') {
            return res.status(400).json({ message: `Cannot withdraw — application is already ${currentApp.status}` });
        }

        job.applicants[index].status = 'withdrawn';
        await job.save();

        // Real-time event
        try {
            const io = require('../utils/socket').getIO();
            if (io) {
                io.emit('application:withdrawn', {
                    jobId: job._id,
                    jobTitle: job.title,
                    studentId: req.user.id
                });
            }
        } catch (e) { /* graceful fallback */ }

        // Notify job owner
        try {
            const student = await User.findById(req.user.id).lean();
            const notification = await Notification.create({
                user: job.postedBy,
                type: 'application_withdrawn',
                title: 'Application Withdrawn',
                message: `${student?.name || 'A student'} withdrew their application for: ${job.title}`,
                metadata: { jobId: job._id, studentId: req.user.id, jobTitle: job.title }
            });
            emitNotification(job.postedBy, notification);
        } catch (e) { /* graceful fallback */ }

        res.json({ message: 'Application withdrawn successfully' });
    } catch (err) {
        console.error('[jobs] withdrawApplication error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// ================================
// PART 6 — ALUMNI JOB INSIGHTS
// ================================

/**
 * GET /api/jobs/:id/insights
 * Returns analytics for a specific job. Owner/admin only.
 */
const getJobInsights = async (req, res) => {
    try {
        if (!['alumni', 'recruiter', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const job = await Job.findById(req.params.id)
            .select('postedBy applicants skills title')
            .lean();
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const isOwner = job.postedBy && job.postedBy.toString() === req.user.id;
        if (!isOwner && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const applicants = job.applicants || [];
        const activeApplicants = applicants.filter(a => a.status !== 'withdrawn');
        const totalApplicants = activeApplicants.length;

        // Compute match scores via aggregation if there are applicants
        let topMatchScore = 0;
        let avgMatchScore = 0;

        if (totalApplicants > 0) {
            const jobSkills = (job.skills || []).map(s => s.toLowerCase().trim());
            const jobSkillsCount = Math.max(jobSkills.length, 1);

            const pipeline = [
                { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
                { $unwind: '$applicants' },
                { $match: { 'applicants.status': { $ne: 'withdrawn' } } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'applicants.student',
                        foreignField: '_id',
                        as: 'student'
                    }
                },
                { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        matchScore: {
                            $min: [100, {
                                $add: [
                                    { $multiply: [{ $divide: [{ $size: { $setIntersection: [{ $map: { input: { $ifNull: ['$student.skills', []] }, as: 's', in: { $toLower: '$$s' } } }, jobSkills] } }, jobSkillsCount] }, 70] },
                                    { $multiply: [{ $ifNull: ['$student.placementScore', 0] }, 0.2] },
                                    { $multiply: [{ $ifNull: ['$student.profileStrength', 0] }, 0.1] }
                                ]
                            }]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        topMatchScore: { $max: '$matchScore' },
                        avgMatchScore: { $avg: '$matchScore' }
                    }
                }
            ];

            const result = await Job.aggregate(pipeline);
            if (result.length > 0) {
                topMatchScore = Math.round((result[0].topMatchScore || 0) * 10) / 10;
                avgMatchScore = Math.round((result[0].avgMatchScore || 0) * 10) / 10;
            }
        }

        // Job health
        let jobHealth;
        if (totalApplicants >= 20) jobHealth = 'high';
        else if (totalApplicants >= 5) jobHealth = 'medium';
        else jobHealth = 'low';

        res.json({
            totalApplicants,
            topMatchScore,
            avgMatchScore,
            jobHealth
        });
    } catch (err) {
        console.error('[jobs] getJobInsights error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createJob,
    getAllJobs,
    getJobById,
    getMyPostedJobs,
    getAppliedJobs,
    applyToJob,
    getJobApplicants,
    getAlumniApplications,
    updateJob,
    deleteJob,
    getRecommendedJobs,
    updateApplicationStatus,
    flagJob,
    moderateJob,
    getAdminJobStats,
    exportJobsAdmin,
    saveJob,
    unsaveJob,
    getSavedJobs,
    updateJobStatus,
    withdrawApplication,
    getJobInsights
};
