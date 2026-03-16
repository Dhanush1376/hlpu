const LaunchProject = require('../models/LaunchProject');
const LaunchApplication = require('../models/LaunchApplication');
const User = require('../models/User');
const startupService = require('../services/startupService');
const { getIO } = require('../utils/socket');

// ... (existing exports)

/**
 * @desc    Update startup stage (Admin only)
 * @route   PATCH /api/launchpad/startups/:id/stage
 * @access  Private (Admin)
 */
exports.updateStartupStage = async (req, res) => {
    try {
        const { stage } = req.body;
        const startup = await LaunchProject.findById(req.params.id);

        if (!startup) {
            return res.status(404).json({ success: false, message: 'Startup not found' });
        }

        startup.stage = stage;
        await startup.save();

        // Socket emission to owner
        const io = getIO();
        io.to(`user:${startup.postedBy.toString()}`).emit('startup:stage:updated', {
            startupId: startup._id,
            stage
        });

        res.status(200).json({ success: true, data: startup });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Update startup evaluation (Admin only)
 * @route   PATCH /api/launchpad/startups/:id/evaluation
 * @access  Private (Admin)
 */
exports.updateEvaluation = async (req, res) => {
    try {
        const evaluation = { ...req.body };
        const startup = await LaunchProject.findById(req.params.id);

        if (!startup) {
            return res.status(404).json({ success: false, message: 'Startup not found' });
        }

        // Auto-calculate score
        evaluation.startupScore = startupService.calculateStartupScore(evaluation);
        startup.evaluation = evaluation;
        await startup.save();

        res.status(200).json({ success: true, data: startup });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Manage startup team (Add/Remove members)
 * @route   PATCH /api/launchpad/startups/:id/team
 * @access  Private (Owner only)
 */
exports.manageTeam = async (req, res) => {
    try {
        const { action, email, role, userId } = req.body;
        const startup = await LaunchProject.findById(req.params.id);

        if (!startup) {
            return res.status(404).json({ success: false, message: 'Startup not found' });
        }

        if (startup.postedBy.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (action === 'add') {
            const userToAdd = await User.findOne({ email });
            if (!userToAdd) return res.status(404).json({ success: false, message: 'User not found' });

            // Check if already in team
            if (startup.team.some(m => m.user.toString() === userToAdd._id.toString())) {
                return res.status(400).json({ success: false, message: 'User already in team' });
            }

            startup.team.push({ user: userToAdd._id, role });
        } else if (action === 'remove') {
            startup.team = startup.team.filter(m => m.user.toString() !== userId);
        }

        await startup.save();
        res.status(200).json({ success: true, data: startup });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Update milestone progress
 * @route   PATCH /api/launchpad/startups/:id/milestones/:milestoneId
 * @access  Private (Owner/Admin)
 */
exports.updateMilestone = async (req, res) => {
    try {
        const { status } = req.body;
        const startup = await LaunchProject.findById(req.params.id);

        if (!startup) {
            return res.status(404).json({ success: false, message: 'Startup not found' });
        }

        const milestone = startup.milestones.id(req.params.milestoneId);
        if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });

        milestone.status = status;
        if (status === 'completed') milestone.completedAt = Date.now();

        await startup.save();
        res.status(200).json({ success: true, data: startup });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Update investor readiness (Owner only)
 * @route   PATCH /api/launchpad/startups/:id/readiness
 * @access  Private (Owner)
 */
exports.updateReadiness = async (req, res) => {
    try {
        const startup = await LaunchProject.findById(req.params.id);

        if (!startup) {
            return res.status(404).json({ success: false, message: 'Startup not found' });
        }

        if (startup.postedBy.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        startup.investorReadiness = { ...startup.investorReadiness.toObject(), ...req.body };
        startup.investorReadiness.readinessScore = startupService.calculateReadinessScore(startup.investorReadiness);

        await startup.save();
        res.status(200).json({ success: true, data: startup });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Create a new project
 * @route   POST /api/launchpad/projects
 * @access  Private (Student/Alumni)
 */
exports.createProject = async (req, res) => {
    try {
        const { title, description, domain, projectType, skillsRequired, teamSizeNeeded, startupPitchDeck } = req.body;

        const project = await LaunchProject.create({
            title,
            description,
            domain,
            projectType,
            skillsRequired,
            teamSizeNeeded,
            startupPitchDeck,
            postedBy: req.user.id,
            isApproved: req.user.role === 'admin' // Admins auto-approve their own projects
        });

        // Socket emission
        const io = getIO();
        io.emit('launchpad:project:new', {
            projectId: project._id,
            title: project.title,
            postedBy: req.user.name
        });

        res.status(201).json({
            success: true,
            data: project
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get all projects with filters and pagination
 * @route   GET /api/launchpad/projects
 * @access  Public
 */
exports.getProjects = async (req, res) => {
    try {
        const { domain, projectType, status, search, page = 1, limit = 10 } = req.query;

        const query = { isActive: true };

        // Only admins can see unapproved projects in the main list
        if (!req.user || req.user.role !== 'admin') {
            query.isApproved = true;
        }

        if (domain) query.domain = domain;
        if (projectType) query.projectType = projectType;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        // Use aggregation to get applicant count
        const projects = await LaunchProject.aggregate([
            { $match: query },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'launchapplications',
                    localField: '_id',
                    foreignField: 'project',
                    as: 'applicants'
                }
            },
            {
                $addFields: {
                    applicantCount: { $size: '$applicants' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'postedBy',
                    foreignField: '_id',
                    as: 'owner'
                }
            },
            { $unwind: '$owner' },
            {
                $project: {
                    applicants: 0,
                    'owner.password': 0
                }
            }
        ]);

        const total = await LaunchProject.countDocuments(query);

        res.status(200).json({
            success: true,
            count: projects.length,
            total,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            },
            data: projects
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get single project details
 * @route   GET /api/launchpad/projects/:id
 * @access  Public
 */
exports.getProject = async (req, res) => {
    try {
        const project = await LaunchProject.findById(req.params.id)
            .populate('postedBy', 'name email profilePic');

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const applicantCount = await LaunchApplication.countDocuments({ project: req.params.id });

        res.status(200).json({
            success: true,
            data: {
                ...project._doc,
                applicantCount
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get my projects
 * @route   GET /api/launchpad/my-projects
 * @access  Private
 */
exports.getMyProjects = async (req, res) => {
    try {
        const projects = await LaunchProject.find({ postedBy: req.user.id, isActive: true })
            .sort({ createdAt: -1 });

        // Add applicant count to each
        const projectsWithCounts = await Promise.all(projects.map(async (p) => {
            const count = await LaunchApplication.countDocuments({ project: p._id });
            return { ...p._doc, applicantCount: count };
        }));

        res.status(200).json({
            success: true,
            data: projectsWithCounts
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Update project
 * @route   PATCH /api/launchpad/projects/:id
 * @access  Private (Owner only)
 */
exports.updateProject = async (req, res) => {
    try {
        let project = await LaunchProject.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        if (project.postedBy.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this project' });
        }

        project = await LaunchProject.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: project
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Soft delete project
 * @route   DELETE /api/launchpad/projects/:id
 * @access  Private (Owner only)
 */
exports.deleteProject = async (req, res) => {
    try {
        const project = await LaunchProject.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        if (project.postedBy.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this project' });
        }

        project.isActive = false;
        await project.save();

        res.status(200).json({
            success: true,
            message: 'Project deleted'
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Apply to project
 * @route   POST /api/launchpad/apply/:projectId
 * @access  Private (Student/Alumni)
 */
exports.applyToProject = async (req, res) => {
    try {
        const project = await LaunchProject.findById(req.params.projectId);

        if (!project || !project.isActive || project.status === 'closed') {
            return res.status(400).json({ success: false, message: 'Project is not accepting applications' });
        }

        const application = await LaunchApplication.create({
            project: req.params.projectId,
            applicant: req.user.id,
            message: req.body.message
        });

        // Socket emission to owner
        const io = getIO();
        io.to(`user:${project.postedBy.toString()}`).emit('launchpad:application:new', {
            projectId: project._id,
            projectTitle: project.title,
            applicantName: req.user.name
        });

        res.status(201).json({
            success: true,
            data: application
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'You have already applied to this project' });
        }
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get my applications
 * @route   GET /api/launchpad/applications/me
 * @access  Private
 */
exports.getMyApplications = async (req, res) => {
    try {
        const applications = await LaunchApplication.find({ applicant: req.user.id })
            .populate({
                path: 'project',
                select: 'title domain status projectType postedBy',
                populate: {
                    path: 'postedBy',
                    select: 'name'
                }
            })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            data: applications
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get applications received for projects I posted
 * @route   GET /api/launchpad/applications/received
 * @access  Private (Alumni/Student Project Owners)
 */
exports.getReceivedApplications = async (req, res) => {
    try {
        // 1. Find all projects posted by this user
        const projects = await LaunchProject.find({ postedBy: req.user.id }).select('_id');
        const projectIds = projects.map(p => p._id);

        // 2. Find applications for these projects
        const applications = await LaunchApplication.find({ project: { $in: projectIds } })
            .populate('project', 'title domain status projectType')
            .populate('applicant', 'name email role skills profilePic')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            data: applications
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get application stats for business dashboard
 * @route   GET /api/launchpad/applications/stats
 * @access  Private
 */
exports.getApplicationStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Stats for applications I submitted (Student perspective)
        const myApps = await LaunchApplication.find({ applicant: userId }).lean();
        const studentStats = {
            totalApplied: myApps.length,
            pending: myApps.filter(a => a.status === 'pending').length,
            accepted: myApps.filter(a => a.status === 'accepted').length,
            rejected: myApps.filter(a => a.status === 'rejected').length
        };

        // Stats for applications received (Owner perspective)
        const myProjects = await LaunchProject.find({ postedBy: userId }).select('_id');
        const projectIds = myProjects.map(p => p._id);
        const receivedApps = await LaunchApplication.find({ project: { $in: projectIds } }).lean();

        const ownerStats = {
            totalReceived: receivedApps.length,
            pending: receivedApps.filter(a => a.status === 'pending').length,
            accepted: receivedApps.filter(a => a.status === 'accepted').length,
            rejected: receivedApps.filter(a => a.status === 'rejected').length
        };

        res.status(200).json({
            success: true,
            data: {
                student: studentStats,
                owner: ownerStats,
                admin: {
                    total: await LaunchApplication.countDocuments(),
                    pending: await LaunchApplication.countDocuments({ status: 'pending' }),
                    accepted: await LaunchApplication.countDocuments({ status: 'accepted' }),
                    rejected: await LaunchApplication.countDocuments({ status: 'rejected' })
                }
            }
        });
    } catch (err) {
        console.error('[launchpad] getApplicationStats error:', err);
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get applicants for a project
 * @route   GET /api/launchpad/projects/:id/applicants
 * @access  Private (Owner only)
 */
exports.getProjectApplicants = async (req, res) => {
    try {
        const project = await LaunchProject.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        if (project.postedBy.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const applicants = await LaunchApplication.find({ project: req.params.id })
            .populate('applicant', 'name email profilePic role skills')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: applicants
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Respond to application
 * @route   PATCH /api/launchpad/applications/:id/respond
 * @access  Private (Owner only)
 */
exports.respondToApplication = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const application = await LaunchApplication.findById(req.params.id).populate('project');

        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        if (application.project.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        application.status = status;
        await application.save();

        // Socket emission to applicant
        const io = getIO();
        io.to(`user:${application.applicant.toString()}`).emit(`launchpad:application:${status}`, {
            projectId: application.project._id,
            projectTitle: application.project.title
        });

        res.status(200).json({
            success: true,
            data: application
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get ALL applications across platform (Admin only)
 * @route   GET /api/launchpad/applications/admin/all
 * @access  Private (Admin)
 */
exports.getAllApplicationsAdmin = async (req, res) => {
    try {
        const applications = await LaunchApplication.find()
            .populate('project', 'title domain status projectType')
            .populate('applicant', 'name email role skills profilePic')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            data: applications
        });
    } catch (err) {
        console.error('[launchpad] getAllApplicationsAdmin error:', err);
        res.status(400).json({ success: false, message: err.message });
    }
};
/**
 * @desc    Approve/Moderation for project (Admin only)
 * @route   PATCH /api/launchpad/projects/:id/approve
 * @access  Private (Admin)
 */
exports.approveProject = async (req, res) => {
    try {
        const { isApproved } = req.body;
        const project = await LaunchProject.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        project.isApproved = isApproved;
        if (isApproved && project.projectType === 'startup' && project.stage === 'idea_submitted') {
            project.stage = 'under_review';
        }
        await project.save();

        res.status(200).json({ success: true, data: project });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Upload pitch deck file
 * @route   POST /api/launchpad/upload-pitch
 * @access  Private
 */
exports.uploadPitchDeck = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a file' });
        }

        const fileUrl = `/uploads/startups/${req.file.filename}`;
        res.status(200).json({
            success: true,
            data: fileUrl
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
