const User = require('../models/User');
const Analytics = require('../models/Analytics');
const exceljs = require('exceljs');
const MockInterview = require('../models/MockInterview');

/**
 * GET /api/admin/mocks/health
 * Aggregated Mock Interview Metrics
 */
exports.getMockHealth = async (req, res) => {
    try {
        // Run cleanup first for accurate stats
        const { cleanupMockInterviews } = require('./mockInterviewController');
        await cleanupMockInterviews();

        const totalPending = await MockInterview.countDocuments({ status: 'pending' });
        const totalScheduled = await MockInterview.countDocuments({ status: 'accepted' });
        const totalCompleted = await MockInterview.countDocuments({ status: 'completed' });
        const totalNoShow = await MockInterview.countDocuments({ status: 'no-show' });
        const totalExpired = await MockInterview.countDocuments({ status: 'expired' });

        const activeInterviewers = await User.countDocuments({
            role: 'alumni',
            isMentorAvailable: true,
            currentWeekInterviews: { $gt: 0 }
        });

        const totalHandled = totalCompleted + totalNoShow;
        const noShowRate = totalHandled > 0 ? ((totalNoShow / totalHandled) * 100).toFixed(1) + '%' : '0%';

        res.json({
            totalPending,
            totalScheduled,
            totalCompleted,
            totalNoShow,
            totalExpired,
            activeInterviewers,
            noShowRate,
            lastChecked: new Date()
        });
    } catch (err) {
        console.error('[admin] getMockHealth error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/admin/users
 * Fetch all users with optional role and search filtering.
 */
exports.getAllUsers = async (req, res) => {
    try {
        const { role, search, status } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const query = {};
        if (role && role !== 'all roles') query.role = role;
        // status and batch filtering can be added here if fields exist in model

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } },
                { phoneNumber: { $regex: search, $options: 'i' } },
                { regNo: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await User.countDocuments(query);

        // Fetch detailed stats for the cards (total system stats)
        const stats = {
            alumni: await User.countDocuments({ role: 'alumni' }),
            student: await User.countDocuments({ role: 'student' }),
            admin: await User.countDocuments({ role: 'admin' }),
            pending: await User.countDocuments({ verificationStatus: 'pending' }),
            dau: await Analytics.distinct('user', { timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }).then(u => u.length),
            totalEvents: await Analytics.countDocuments({ timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
        };

        res.json({
            users,
            total,
            stats,
            pages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (err) {
        console.error('[admin] getAllUsers error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/admin/export-users
 * Export users to Excel with two sheets (Alumni, Students).
 */
exports.exportUsers = async (req, res) => {
    try {
        const alumni = await User.find({ role: 'alumni' }).lean();
        const students = await User.find({ role: 'student' }).lean();

        const workbook = new exceljs.Workbook();

        // Sheet 1: Alumni
        const alumniSheet = workbook.addWorksheet('Alumni');
        alumniSheet.columns = [
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Phone', key: 'phoneNumber', width: 15 },
            { header: 'Reg No', key: 'regNo', width: 15 },
            { header: 'Grad Year', key: 'batch', width: 12 },
            { header: 'Stream', key: 'stream', width: 25 },
            { header: 'Program', key: 'department', width: 25 },
            { header: 'Company', key: 'company', width: 25 },
            { header: 'Status', key: 'statusDisplay', width: 15 },
            { header: 'Joined Date', key: 'createdAt', width: 20 }
        ];

        const alumniRows = alumni.map(u => ({
            name: u.name,
            email: u.email,
            phoneNumber: u.phoneNumber || 'N/A',
            regNo: u.regNo || 'N/A',
            batch: u.batch || 'N/A',
            stream: u.stream || 'N/A',
            department: u.department || 'N/A',
            company: u.company || 'N/A',
            statusDisplay: (u.accountStatus?.isActive === false || u.accountStatus?.status === 'suspended') ? 'suspended' : 'active',
            createdAt: u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A'
        }));
        alumniSheet.addRows(alumniRows);

        // Sheet 2: Students
        const studentSheet = workbook.addWorksheet('Students');
        studentSheet.columns = [
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Phone', key: 'phoneNumber', width: 15 },
            { header: 'Reg No', key: 'regNo', width: 15 },
            { header: 'Current Year', key: 'batch', width: 12 },
            { header: 'Stream', key: 'stream', width: 25 },
            { header: 'Program', key: 'department', width: 25 },
            { header: 'Status', key: 'statusDisplay', width: 15 },
            { header: 'Joined Date', key: 'createdAt', width: 20 }
        ];

        const studentRows = students.map(u => ({
            name: u.name,
            email: u.email,
            phoneNumber: u.phoneNumber || 'N/A',
            regNo: u.regNo || 'N/A',
            batch: u.batch || 'N/A',
            stream: u.stream || 'N/A',
            department: u.department || 'N/A',
            statusDisplay: (u.accountStatus?.isActive === false || u.accountStatus?.status === 'suspended') ? 'suspended' : 'active',
            createdAt: u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A'
        }));
        studentSheet.addRows(studentRows);

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + 'hLPU_Comprehensive_Users_' + Date.now() + '.xlsx'
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('[admin] exportUsers error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/admin/users/:id
 * Get detailed user info for viewing profile.
 */
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).lean();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('[admin] getUserById error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/admin/users/:id/message
 * Send a message (notification) to a user.
 */
exports.sendAdminMessage = async (req, res) => {
    try {
        const { message, title } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        const Notification = require('../models/Notification');
        await Notification.create({
            user: req.params.id,
            type: 'admin_message',
            title: title || 'Message from Administrator',
            message,
            metadata: { adminId: req.user.id }
        });

        res.json({ message: 'Message sent successfully' });
    } catch (err) {
        console.error('[admin] sendAdminMessage error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};
/**
 * GET /api/admin/pending-verifications
 * Returns pending requests, stats, and recent history.
 */
exports.getPendingVerifications = async (req, res) => {
    try {
        const VerificationRequest = require('../models/VerificationRequest');
        const User = require('../models/User');

        // 1. Fetch explicit pending requests
        const explicitRequests = await VerificationRequest.find({ status: 'pending' })
            .populate('user', 'name email profilePic department regNo stream batch role')
            .sort({ createdAt: 1 })
            .lean();

        // 2. Fetch all unverified alumni who DON'T have a pending request record
        const pendingUserIds = explicitRequests.map(r => r.user?._id?.toString()).filter(id => !!id);
        const unverifiedAlumni = await User.find({
            role: 'alumni',
            isVerified: false,
            _id: { $nin: pendingUserIds }
        }).select('name email profilePic department regNo stream batch role createdAt').lean();

        // 3. Merge them into a single list (Virtualize alumni as "requests")
        const virtualRequests = unverifiedAlumni.map(user => ({
            _id: `phantom-${user._id}`, // Special ID for processing
            user: user,
            regNo: user.regNo || 'N/A',
            passoutYear: user.graduationYear || 'N/A',
            status: 'pending',
            createdAt: user.createdAt,
            isVirtual: true
        }));

        const requests = [...explicitRequests, ...virtualRequests].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        // 2. Fetch Stats
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const stats = {
            pending: requests.length,
            urgent: requests.filter(r => (Date.now() - new Date(r.createdAt)) > 3 * 24 * 60 * 60 * 1000).length,
            approvedToday: await VerificationRequest.countDocuments({ status: 'approved', reviewedAt: { $gte: startOfDay } }),
            rejectedWeekly: await VerificationRequest.countDocuments({ status: 'rejected', reviewedAt: { $gte: weekAgo } }),
            countsByRole: {
                alumni: 0,
                student: 0
            }
        };

        // Role breakdown for pending
        requests.forEach(r => {
            if (r.user && r.user.role === 'alumni') stats.countsByRole.alumni++;
            else if (r.user && r.user.role === 'student') stats.countsByRole.student++;
        });

        // Calculate average response time (last 50 requests)
        const processed = await VerificationRequest.find({ status: { $ne: 'pending' }, reviewedAt: { $exists: true } })
            .sort({ reviewedAt: -1 })
            .limit(50)
            .lean();

        if (processed.length > 0) {
            const totalMs = processed.reduce((acc, curr) => acc + (new Date(curr.reviewedAt) - new Date(curr.createdAt)), 0);
            stats.avgResponseTime = (totalMs / processed.length / (1000 * 60 * 60)).toFixed(1) + 'h';
        } else {
            stats.avgResponseTime = '0.0h';
        }

        // 3. Fetch recent history
        const history = await VerificationRequest.find({ status: { $ne: 'pending' } })
            .populate('user', 'name')
            .populate('reviewedBy', 'name')
            .sort({ reviewedAt: -1 })
            .limit(10)
            .lean();

        res.json({
            requests,
            stats,
            history
        });
    } catch (err) {
        console.error('[admin] getPendingVerifications error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PATCH /api/admin/verify/:requestId
 * Body: { status: 'approved' | 'rejected', reason: string }
 */
exports.respondToVerification = async (req, res) => {
    try {
        const { status, reason } = req.body;
        const VerificationRequest = require('../models/VerificationRequest');
        let requestId = req.params.requestId;
        let request;

        // Handle Phantom/Virtual requests (unverified users with no request record)
        if (requestId.startsWith('phantom-')) {
            const userId = requestId.split('-')[1];
            const User = require('../models/User');
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ message: 'User not found' });

            // Create entry on the fly
            request = await VerificationRequest.create({
                user: userId,
                regNo: user.regNo || 'N/A',
                passoutYear: user.graduationYear || new Date().getFullYear(),
                status: 'pending'
            });
            console.log(`[admin] Created on-the-fly request for virtual alumni: ${user.email}`);
        } else {
            request = await VerificationRequest.findById(requestId);
        }

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        request.status = status;
        request.rejectionReason = status === 'rejected' ? reason : undefined;
        request.reviewedBy = req.user.id;
        request.reviewedAt = Date.now();
        await request.save();

        // Update User Model
        const userUpdate = {
            verificationStatus: status,
            isVerified: status === 'approved'
        };
        await User.findByIdAndUpdate(request.user, userUpdate);

        // Notify user
        const Notification = require('../models/Notification');
        await Notification.create({
            user: request.user,
            type: status === 'approved' ? 'admin_message' : 'admin_message',
            title: status === 'approved' ? 'Account Verified!' : 'Verification Rejected',
            message: status === 'approved'
                ? 'Your alumni status has been verified. You now have access to all alumni features.'
                : `Your verification was rejected. Reason: ${reason || 'Incomplete proofs'}`
        });

        // Log the event
        const { logEvent } = require('../utils/auditLogger');
        await logEvent({
            userId: req.user.id,
            action: status === 'approved' ? 'verification_approved' : 'verification_rejected',
            targetType: 'VerificationRequest',
            targetId: request._id,
            description: `${status === 'approved' ? 'Approved' : 'Rejected'} verification for user ID: ${request.user}`,
            metadata: { reason }
        }, req);

        res.json({ message: `Verification ${status}` });
    } catch (err) {
        console.error('[admin] respondToVerification error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};
