const User = require('../models/User');
const AlumniConnection = require('../models/AlumniConnection');
const Notification = require('../models/Notification');
const Conversation = require('../models/Conversation');
const { emitNotification } = require('../utils/socket');

/**
 * GET /api/alumni/circle
 * Professionalized alumni networking with advanced filtering and pagination.
 */
const getAlumniCircle = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const {
            search,
            stream,
            mentorOnly,
            availableOnly,
            minExperience,
            sort
        } = req.query;

        // 1. Get current alumni's connections/requests to determine status (Connect / Message / Pending)
        const connections = await AlumniConnection.find({
            $or: [{ requester: req.user.id }, { recipient: req.user.id }]
        }).lean();

        const connectionMap = {};
        connections.forEach(c => {
            const otherId = c.requester.toString() === req.user.id ? c.recipient.toString() : c.requester.toString();
            connectionMap[otherId] = { status: c.status, id: c._id };
        });

        // 2. Build Query
        const query = {
            role: 'alumni',
            _id: { $ne: req.user.id } // Exclude self
        };

        // Search (Name, Company, Role, Skills)
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
                { skills: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        // Filters
        if (stream) query.stream = stream;
        if (mentorOnly === 'true') query.isMentorAvailable = true;
        if (availableOnly === 'true') query.isMentorAvailable = true; // Use same for now or refine
        if (minExperience) query.yearsOfExperience = { $gte: parseInt(minExperience) };

        // 3. Sorting
        let sortOption = { lastActive: -1 };
        if (sort === 'experience') sortOption = { yearsOfExperience: -1 };
        if (sort === 'newest') sortOption = { createdAt: -1 };

        // 4. Fetch with pagination
        const total = await User.countDocuments(query);
        const alumni = await User.find(query)
            .select('name role company title skills profilePic profilePicture university department stream graduationYear yearsOfExperience isMentorAvailable lastActive verificationStatus stats')
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .lean();

        // 5. Enhance with connection status & networking psychology
        let onlineUsers = {};
        try {
            const socketUtils = require('../utils/socket');
            const io = socketUtils.getIO();
            onlineUsers = io ? (io.onlineUsers || {}) : {};
        } catch (socketErr) {
            console.warn('[alumni] Socket.io not yet initialized for presence lookup');
        }

        const results = alumni.map(a => {
            const userId = a._id.toString();
            const conn = connectionMap[userId];

            // Psychology Labels
            const labels = [];
            if (a.verificationStatus === 'approved') labels.push('Verified');
            if (a.isMentorAvailable) labels.push('Top Mentor');
            if (a.yearsOfExperience >= 5) labels.push('Experienced');
            if (a.stream === req.user.stream) labels.push('From your stream');

            // Recency check (last 24h)
            if (a.lastActive && (new Date() - new Date(a.lastActive)) < 24 * 60 * 60 * 1000) {
                labels.push('Recently active');
            }

            return {
                ...a,
                connectionStatus: conn ? conn.status : 'none',
                connectionId: conn ? conn.id : null,
                isOnline: !!onlineUsers[userId],
                networkingLabels: labels,
                profilePicture: a.profilePic || a.profilePicture
            };
        });

        res.json({
            success: true,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: results
        });
    } catch (err) {
        console.error('[alumni] getAlumniCircle error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/alumni/connect/:alumniId
 * Send a connection request.
 */
const connectAlumni = async (req, res) => {
    try {
        const { alumniId } = req.params;

        if (alumniId === req.user.id) {
            return res.status(400).json({ message: 'You cannot connect with yourself' });
        }

        // Check if recipient is alumni
        const recipient = await User.findById(alumniId).lean();
        if (!recipient || recipient.role !== 'alumni') {
            return res.status(400).json({ message: 'Connections only allowed between alumni' });
        }

        // Check for existing connection
        const existing = await AlumniConnection.findOne({
            $or: [
                { requester: req.user.id, recipient: alumniId },
                { requester: alumniId, recipient: req.user.id }
            ]
        });

        if (existing) {
            return res.status(400).json({ message: 'Request already exists or connected' });
        }

        const connection = await AlumniConnection.create({
            requester: req.user.id,
            recipient: alumniId,
            status: 'pending'
        });

        // Notify recipient
        try {
            const requester = await User.findById(req.user.id).lean();
            const notification = await Notification.create({
                user: alumniId,
                type: 'alumni_request',
                title: 'New Connection Request',
                message: `${requester.name} wants to connect with you.`,
                metadata: { requesterId: req.user.id }
            });

            emitNotification(alumniId, notification);

            const io = require('../utils/socket').getIO();
            if (io) {
                io.to(`user:${alumniId}`).emit('alumni:request:new', {
                    requestId: connection._id,
                    requester: {
                        id: req.user.id,
                        name: requester.name,
                        profilePic: requester.profilePic || requester.profilePicture
                    }
                });
            }
        } catch (notifierErr) {
            console.error('[notifier] alumni_connect error:', notifierErr.message);
        }

        res.status(201).json(connection);
    } catch (err) {
        console.error('[alumni] connectAlumni error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/alumni/connections
 * List accepted connections.
 */
const getConnections = async (req, res) => {
    try {
        const connections = await AlumniConnection.find({
            $or: [{ requester: req.user.id }, { recipient: req.user.id }],
            status: 'accepted'
        })
            .populate('requester', 'name role company skills profilePic profilePicture university department')
            .populate('recipient', 'name role company skills profilePic profilePicture university department')
            .lean();

        const io = require('../utils/socket').getIO();
        const onlineUsers = io ? (io.onlineUsers || {}) : {};

        const results = connections.map(c => {
            const other = c.requester._id.toString() === req.user.id ? c.recipient : c.requester;
            return {
                ...other,
                connectionId: c._id,
                isOnline: !!onlineUsers[other._id.toString()]
            };
        });

        res.json(results);
    } catch (err) {
        console.error('[alumni] getConnections error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/alumni/requests/incoming
 */
const getIncomingRequests = async (req, res) => {
    try {
        const requests = await AlumniConnection.find({
            recipient: req.user.id,
            status: 'pending'
        })
            .populate('requester', 'name company profilePic profilePicture university')
            .sort({ createdAt: -1 })
            .lean();

        res.json(requests);
    } catch (err) {
        console.error('[alumni] getIncomingRequests error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/alumni/requests/outgoing
 */
const getOutgoingRequests = async (req, res) => {
    try {
        const requests = await AlumniConnection.find({
            requester: req.user.id,
            status: 'pending'
        })
            .populate('recipient', 'name company profilePic profilePicture university')
            .sort({ createdAt: -1 })
            .lean();

        res.json(requests);
    } catch (err) {
        console.error('[alumni] getOutgoingRequests error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PATCH /api/alumni/requests/:id/respond
 */
const respondToRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'accepted' or 'rejected'

        const connection = await AlumniConnection.findById(id);
        if (!connection || connection.recipient.toString() !== req.user.id) {
            return res.status(404).json({ message: 'Request not found' });
        }

        connection.status = action;
        await connection.save();

        if (action === 'accepted') {
            // Auto-create conversation
            const participants = [connection.requester, connection.recipient].sort();
            let conversation = await Conversation.findOne({
                participants: { $all: participants, $size: 2 }
            });

            if (!conversation) {
                conversation = await Conversation.create({ participants });
            }

            // Notify requester
            try {
                const recipient = await User.findById(req.user.id).lean();
                const notification = await Notification.create({
                    user: connection.requester,
                    type: 'alumni_request_accepted',
                    title: 'Connection Accepted',
                    message: `${recipient.name} accepted your connection request.`,
                    metadata: { recipientId: req.user.id, conversationId: conversation._id }
                });

                emitNotification(connection.requester, notification);

                const io = require('../utils/socket').getIO();
                if (io) {
                    io.to(`user:${connection.requester.toString()}`).emit('alumni:request:accepted', {
                        connectionId: connection._id,
                        recipient: {
                            id: req.user.id,
                            name: recipient.name,
                            profilePic: recipient.profilePic || recipient.profilePicture
                        },
                        conversationId: conversation._id
                    });
                }
            } catch (notifierErr) {
                console.error('[notifier] alumni_accept error:', notifierErr.message);
            }
        }

        res.json({ message: `Request ${action}`, status: action });
    } catch (err) {
        console.error('[alumni] respondToRequest error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getAlumniCircle,
    connectAlumni,
    getConnections,
    getIncomingRequests,
    getOutgoingRequests,
    respondToRequest
};
