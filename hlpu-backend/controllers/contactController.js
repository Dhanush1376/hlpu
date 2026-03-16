const ContactMessage = require('../models/ContactMessage');
const { getIO } = require('../utils/socket');

// @desc    Submit a new contact message
// @route   POST /api/contact
// @access  Public
exports.submitMessage = async (req, res) => {
    try {
        const { name, email, subject, message, role, submittedBy } = req.body;

        const newMessage = await ContactMessage.create({
            name,
            email,
            subject,
            message,
            role: role || 'guest',
            submittedBy: submittedBy || null
        });

        // Emit socket event for real-time admin notification
        const io = getIO();
        if (io) {
            io.emit('contact:new-message', {
                id: newMessage._id,
                name: newMessage.name,
                subject: newMessage.subject,
                role: newMessage.role
            });
        }

        res.status(201).json({
            success: true,
            message: 'Message submitted successfully',
            data: newMessage
        });
    } catch (err) {
        console.error('Error in submitMessage:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while submitting message'
        });
    }
};

// @desc    Get all messages (Admin only)
// @route   GET /api/admin/messages
// @access  Private/Admin
exports.getMessages = async (req, res) => {
    try {
        const { status, role, priority, search, page = 1, limit = 50 } = req.query;

        const query = {};
        if (status) query.status = status;
        if (role) query.role = role;
        if (priority) query.priority = priority;

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const messages = await ContactMessage.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await ContactMessage.countDocuments(query);

        res.json({
            success: true,
            messages,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('Error in getMessages:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single message details
// @route   GET /api/admin/messages/:id
// @access  Private/Admin
exports.getMessageById = async (req, res) => {
    try {
        const message = await ContactMessage.findById(req.params.id)
            .populate('submittedBy', 'name email role')
            .lean();

        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        res.json({ success: true, message });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update message status/priority
// @route   PATCH /api/admin/messages/:id/status
// @access  Private/Admin
exports.updateMessageStatus = async (req, res) => {
    try {
        const { status, priority } = req.body;
        const updateData = {};
        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;

        const message = await ContactMessage.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        const io = getIO();
        if (io) {
            io.emit('contact:status-updated', { id: message._id, status: message.status });
        }

        res.json({ success: true, message });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Reply to a message
// @route   POST /api/admin/messages/:id/reply
// @access  Private/Admin
exports.replyToMessage = async (req, res) => {
    try {
        const { reply } = req.body;

        const message = await ContactMessage.findByIdAndUpdate(
            req.params.id,
            {
                adminReply: reply,
                status: 'replied',
                repliedBy: req.user._id,
                repliedAt: Date.now()
            },
            { new: true }
        );

        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        res.json({ success: true, message });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get message statistics
// @route   GET /api/admin/messages/stats
// @access  Private/Admin
exports.getMessageStats = async (req, res) => {
    try {
        const stats = {
            total: await ContactMessage.countDocuments(),
            new: await ContactMessage.countDocuments({ status: 'new' }),
            replied: await ContactMessage.countDocuments({ status: 'replied' }),
            highPriority: await ContactMessage.countDocuments({ priority: 'high' })
        };

        res.json({ success: true, stats });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
