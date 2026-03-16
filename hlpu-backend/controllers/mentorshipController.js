const MentorRequest = require('../models/MentorRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { emitNotification } = require('../utils/socket');
const { trackEvent } = require('../services/analyticsService');
const { calculateMentorScore } = require('../services/recommendationService');

/**
 * POST /api/mentorship/request
 * Student creates a new mentorship request with spam protection and availability checks.
 */
const requestMentorship = async (req, res) => {
    try {
        const { message, preferredDomain, preferredMode, alumniId } = req.body;

        if (!message || message.length < 20) {
            return res.status(400).json({ message: 'Message must be at least 20 characters' });
        }
        if (!preferredDomain || !preferredMode || !alumniId) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // 1. Prevent self-mentorship
        if (alumniId === req.user.id) {
            return res.status(400).json({ message: 'You cannot request mentorship from yourself' });
        }

        // 2. Check if mentor exists and is available
        const mentor = await User.findById(alumniId);
        if (!mentor || mentor.role !== 'alumni') {
            return res.status(404).json({ message: 'Mentor not found' });
        }

        if (!mentor.isMentorAvailable || (mentor.currentMentees >= mentor.maxMentees)) {
            return res.status(400).json({ message: 'Mentor is currently strictly unavailable or has reached maximum mentee capacity' });
        }

        // 3. Rate limiting check (e.g., 5 per day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dailyCount = await MentorRequest.countDocuments({
            student: req.user.id,
            createdAt: { $gte: today }
        });

        if (dailyCount >= 5) {
            return res.status(429).json({ message: 'Daily limit reached. You can only send 5 requests per day.' });
        }

        // 4. Duplicate pending request check
        const existingRequest = await MentorRequest.findOne({
            student: req.user.id,
            alumni: alumniId,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'You already have a pending request with this mentor' });
        }

        const mentorshipRequest = await MentorRequest.create({
            student: req.user.id,
            alumni: alumniId,
            message,
            preferredDomain,
            preferredMode,
            status: 'pending',
        });

        // Trigger Notification
        try {
            const student = await User.findById(req.user.id).lean();
            const payload = {
                type: 'mentor_request',
                title: 'New Mentorship Request 🎓',
                message: `${student ? student.name : 'A student'} requested mentorship in ${preferredDomain}.`,
                metadata: {
                    requestId: mentorshipRequest._id,
                    studentId: req.user.id,
                    domain: preferredDomain
                }
            };

            const notification = await Notification.create({ user: alumniId, ...payload });
            emitNotification(alumniId, notification);

            // Socket event
            const io = require('../utils/socket').getIO();
            if (io) {
                io.to(`user:${alumniId}`).emit('mentorship:new-request', {
                    requestId: mentorshipRequest._id,
                    studentName: student ? student.name : 'A student',
                    domain: preferredDomain,
                    matchScore: 90 // Placeholder for real-time calc
                });
            }
        } catch (notifierErr) {
            console.error('[notifier] mentor_request error:', notifierErr.message);
        }

        res.status(201).json(mentorshipRequest);

        // Track Event: mentor_requested
        trackEvent('mentor_requested', req, { mentorId: alumniId, domain: preferredDomain });
    } catch (err) {
        console.error('[mentorship] requestMentorship error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/mentorship/available-mentors
 * Fetch list of mentors with pagination and basic info.
 */
const getAvailableMentors = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const mentors = await User.find({
            role: 'alumni',
            isMentorAvailable: true,
            currentMentees: { $lt: 20 }
        })
            .select('name title company skills university profilePicture currentMentees maxMentees department stream yearsOfExperience')
            .lean();

        // Personalized Ranking if logged in
        let rankedMentors = mentors;
        if (req.user && req.user.role === 'student') {
            const user = await User.findById(req.user.id).select('stream skills department program').lean();
            if (user) {
                rankedMentors = mentors.map(m => {
                    const result = calculateMentorScore(m, user);
                    return {
                        ...m,
                        matchScore: result.score,
                        isCrossStream: result.isCrossStream
                    };
                }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
            }
        }

        const paginatedMentors = rankedMentors.slice(skip, skip + limit);
        res.json(paginatedMentors);

        // Track Event: mentor_browse
        if (req.user && req.user.role === 'student') {
            trackEvent('mentor_browse', req, { count: paginatedMentors.length, page });
        }
    } catch (err) {
        console.error('[mentorship] getAvailableMentors error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/mentorship/student
 * Student views their own mentorship requests.
 */
const getStudentRequests = async (req, res) => {
    try {
        const requests = await MentorRequest.find({ student: req.user.id })
            .sort({ createdAt: -1 })
            .populate('alumni', 'name email department')
            .lean();

        res.json(requests);
    } catch (err) {
        console.error('[mentorship] getStudentRequests error:', err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
};

/**
 * GET /api/mentorship/alumni
 * Alumni views pending mentorship requests.
 */
const getAlumniRequests = async (req, res) => {
    try {
        console.log(`[mentorship] Fetching requests for alumni: ${req.user.id}`);

        const requests = await MentorRequest.find({
            $or: [
                { alumni: req.user.id },
                { alumni: null, status: 'pending' }
            ]
        })
            .sort({ createdAt: -1 })
            .populate('student', 'name email department profilePicture skills')
            .lean();

        res.json(requests);
    } catch (err) {
        console.error('[mentorship] getAlumniRequests error:', err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
};

/**
 * PATCH /api/mentorship/:id/respond
 * Alumni accepts or rejects a mentorship request.
 */
/**
 * PATCH /api/mentorship/:id/respond
 * Alumni accepts or rejects a mentorship request with load control.
 */
const respondToRequest = async (req, res) => {
    try {
        const { status } = req.body;

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const mentorshipRequest = await MentorRequest.findById(req.params.id);

        if (!mentorshipRequest) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // owner check
        if (mentorshipRequest.alumni.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Check if request is still pending
        if (mentorshipRequest.status !== 'pending') {
            return res.status(400).json({ message: 'Request already responded to' });
        }

        const mentor = await User.findById(req.user.id);

        if (status === 'accepted') {
            // Load control check
            if (mentor.currentMentees >= mentor.maxMentees) {
                return res.status(400).json({ message: 'You have reached your maximum mentee limit. Cannot accept more.' });
            }

            mentorshipRequest.status = 'accepted';
            mentor.currentMentees += 1;

            // AUTO-GUARD: Disable availability if limit reached
            if (mentor.currentMentees >= mentor.maxMentees) {
                mentor.isMentorAvailable = false;
            }
            await mentor.save();
        } else {
            mentorshipRequest.status = 'rejected';
        }

        await mentorshipRequest.save();

        // Trigger Notification to Student
        try {
            const type = status === 'accepted' ? 'mentor_accepted' : 'mentor_rejected';
            const title = status === 'accepted' ? 'Mentorship Accepted! 🤝' : 'Mentorship Update';
            const messageStr = status === 'accepted'
                ? `Great news! ${mentor.name} has accepted your mentorship request for ${mentorshipRequest.preferredDomain}.`
                : `Your mentorship request for ${mentorshipRequest.preferredDomain} was not accepted at this time.`;

            const notification = await Notification.create({
                user: mentorshipRequest.student,
                type: type,
                title: title,
                message: messageStr,
                metadata: {
                    requestId: mentorshipRequest._id,
                    alumniId: req.user.id,
                    domain: mentorshipRequest.preferredDomain
                }
            });
            emitNotification(mentorshipRequest.student, notification);

            // Real-time Socket Events
            const io = require('../utils/socket').getIO();
            if (io) {
                const eventName = status === 'accepted' ? 'mentorship:accepted' : 'mentorship:rejected';
                io.to(`user:${mentorshipRequest.student}`).emit(eventName, {
                    requestId: mentorshipRequest._id,
                    alumniName: mentor.name,
                    domain: mentorshipRequest.preferredDomain
                });

                // Notify alumni of new progress bar state
                io.to(`user:${req.user.id}`).emit('mentor:availability-changed', {
                    currentMentees: mentor.currentMentees,
                    maxMentees: mentor.maxMentees,
                    isAvailable: mentor.isMentorAvailable
                });

                // AUTO-CREATE CONVERSATION ON ACCEPT
                if (status === 'accepted') {
                    const Conversation = require('../models/Conversation');
                    let conversation = await Conversation.findOne({
                        participants: { $all: [mentorshipRequest.student, req.user.id] },
                        type: 'direct' // Direct or mentorship? Better to mark as mentorship
                    });

                    if (!conversation) {
                        conversation = await Conversation.create({
                            participants: [mentorshipRequest.student, req.user.id],
                            type: 'mentorship',
                            status: 'approved',
                            lastMessageAt: new Date(),
                            categories: {
                                [mentorshipRequest.student.toString()]: 'primary',
                                [req.user.id.toString()]: 'primary'
                            },
                            metadata: {
                                mentorshipId: mentorshipRequest._id,
                                domain: mentorshipRequest.preferredDomain
                            }
                        });
                    } else {
                        // Re-enable/re-categorize if it already existed
                        conversation.status = 'approved';
                        conversation.type = 'mentorship';

                        // Safety check for legacy uninitialized maps
                        if (!conversation.categories) {
                            conversation.categories = new Map();
                        }
                        // Fallback if somehow it's a plain object
                        if (typeof conversation.categories.set !== 'function') {
                            const oldCats = conversation.categories;
                            conversation.categories = new Map();
                            for (const key in oldCats) {
                                if (Object.prototype.hasOwnProperty.call(oldCats, key)) {
                                    conversation.categories.set(key, oldCats[key]);
                                }
                            }
                        }

                        conversation.categories.set(mentorshipRequest.student.toString(), 'primary');
                        conversation.categories.set(req.user.id.toString(), 'primary');
                        await conversation.save();
                    }

                    // Notify both that chat is now enabled
                    io.to(`user:${mentorshipRequest.student}`).emit('chat:enabled', { conversationId: conversation._id, partnerName: mentor.name });
                    io.to(`user:${req.user.id}`).emit('chat:enabled', { conversationId: conversation._id, partnerName: 'Mentee' });
                }
            }
        } catch (notifierErr) {
            console.error('[notifier] mentor_response error:', notifierErr.message);
        }

        res.json(mentorshipRequest);
    } catch (err) {
        console.error('[mentorship] respondToRequest error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PATCH /api/mentorship/:id/complete
 * Alumni marks a mentorship request as completed, freeing up a mentee slot.
 */
const completeRequest = async (req, res) => {
    try {
        const mentorshipRequest = await MentorRequest.findById(req.params.id);

        if (!mentorshipRequest) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Check ownership
        if (mentorshipRequest.alumni.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (mentorshipRequest.status !== 'accepted') {
            return res.status(400).json({ message: 'Only accepted requests can be completed' });
        }

        mentorshipRequest.status = 'completed';
        await mentorshipRequest.save();

        // 1. Decrement currentMentees
        const mentor = await User.findById(req.user.id);
        if (mentor.currentMentees > 0) {
            mentor.currentMentees -= 1;
            // Optionally: if was disabled by auto-guard, we could re-enable it
            // but for now we just track the count.
            await mentor.save();
        }

        // 2. Emit Socket Update
        const io = require('../utils/socket').getIO();
        if (io) {
            io.to(`user:${req.user.id}`).emit('mentor:availability-changed', {
                currentMentees: mentor.currentMentees,
                maxMentees: mentor.maxMentees,
                isAvailable: mentor.isMentorAvailable
            });
        }

        res.json(mentorshipRequest);
    } catch (err) {
        console.error('[mentorship] completeRequest error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PATCH /api/mentorship/:id/cancel
 * Student cancels their own mentorship request.
 */
const cancelRequest = async (req, res) => {
    try {
        const mentorshipRequest = await MentorRequest.findById(req.params.id);

        if (!mentorshipRequest) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Check ownership
        if (mentorshipRequest.student.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (['completed', 'rejected', 'cancelled'].includes(mentorshipRequest.status)) {
            return res.status(400).json({ message: 'Request is already in a final state' });
        }

        const oldStatus = mentorshipRequest.status;
        mentorshipRequest.status = 'cancelled';
        await mentorshipRequest.save();

        // If it was accepted, decrement the mentor's load
        if (oldStatus === 'accepted') {
            const mentor = await User.findById(mentorshipRequest.alumni);
            if (mentor && mentor.currentMentees > 0) {
                mentor.currentMentees -= 1;
                await mentor.save();

                // Notify mentor
                const io = require('../utils/socket').getIO();
                if (io) {
                    io.to(`user:${mentor._id}`).emit('mentor:availability-changed', {
                        currentMentees: mentor.currentMentees,
                        maxMentees: mentor.maxMentees,
                        isAvailable: mentor.isMentorAvailable
                    });
                }
            }
        }

        res.json({ message: 'Request cancelled successfully', status: 'cancelled' });
    } catch (err) {
        console.error('[mentorship] cancelRequest error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PATCH /api/mentorship/availability
 * Alumni toggles their mentor availability status.
 */
const updateMentorAvailability = async (req, res) => {
    try {
        const { isMentorAvailable } = req.body;

        const user = await User.findById(req.user.id);
        if (user.role !== 'alumni') {
            return res.status(403).json({ message: 'Only alumni can toggle mentorship' });
        }

        user.isMentorAvailable = !!isMentorAvailable;
        await user.save();

        // Emit socket for real-time dashboard updates
        const io = require('../utils/socket').getIO();
        if (io) {
            io.to(`user:${req.user.id}`).emit('mentor:availability-changed', {
                currentMentees: user.currentMentees,
                maxMentees: user.maxMentees,
                isAvailable: user.isMentorAvailable
            });
            // Also trigger global update for discovery
            io.emit('mentor:update', { alumniId: req.user.id, isAvailable: user.isMentorAvailable });
        }

        res.json({ message: 'Availability updated', isMentorAvailable: user.isMentorAvailable });
    } catch (err) {
        console.error('[mentorship] updateMentorAvailability error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/mentorship/match
 * Smart Mentor Matching using UnifiedScoringService
 */
const getSmartMatches = async (req, res) => {
    try {
        const { page = 1, limit = 10, department, search } = req.query;
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Access restricted to students' });
        }

        const student = await User.findById(req.user.id).lean();
        if (!student) return res.status(404).json({ message: 'Student not found' });

        let query = {
            role: 'alumni',
            isMentorAvailable: true,
            _id: { $ne: student._id }
        };

        // Stream/Program Filter
        if (department && department !== 'all') {
            query.$or = [
                { department: new RegExp(department, 'i') },
                { stream: new RegExp(department, 'i') }
            ];
        }

        // Search Filter
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            const searchOr = [
                { name: searchRegex },
                { title: searchRegex },
                { company: searchRegex },
                { skills: { $in: [searchRegex] } }
            ];
            if (query.$or) {
                query.$and = [{ $or: query.$or }, { $or: searchOr }];
                delete query.$or;
            } else {
                query.$or = searchOr;
            }
        }

        const mentors = await User.find(query)
            .select('name title company skills profilePicture currentMentees maxMentees department stream yearsOfExperience isVerified')
            .lean();

        const scoredMentors = mentors.map(mentor => {
            const result = calculateMentorScore(mentor, student);
            return {
                ...mentor,
                matchScore: result.score,
                isCrossStream: result.isCrossStream
            };
        });

        // Sort: matchScore DESC, then Verified, then Last Active/Created
        scoredMentors.sort((a, b) => {
            if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
            if (b.isVerified !== a.isVerified) return b.isVerified ? 1 : -1;
            return 0;
        });

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const total = scoredMentors.length;

        const paginatedMentors = scoredMentors.slice(skip, skip + limitNum);

        res.json({
            mentors: paginatedMentors,
            pagination: {
                total,
                page: pageNum,
                pages: Math.ceil(total / limitNum) || 1
            }
        });
    } catch (err) {
        console.error('[mentorship] getSmartMatches error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    requestMentorship,
    getStudentRequests,
    getAlumniRequests,
    respondToRequest,
    completeRequest,
    cancelRequest,
    updateMentorAvailability,
    getAvailableMentors,
    getSmartMatches,
};
