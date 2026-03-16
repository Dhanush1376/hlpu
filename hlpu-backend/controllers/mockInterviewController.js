const MockInterview = require('../models/MockInterview');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { emitNotification } = require('../utils/socket');
const { calculateMockScore } = require('../services/recommendationService');

/**
 * POST /api/mock-interviews/request
 * Student creates a mock interview request.
 */
const requestInterview = async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can request mock interviews' });
        }

        const { roleRequested, skills, interviewType, preferredDate, alumniId } = req.body;

        // ObjectId Validation
        const mongoose = require('mongoose');
        if (alumniId && !mongoose.Types.ObjectId.isValid(alumniId)) {
            return res.status(400).json({ message: 'Invalid alumni ID' });
        }

        if (!roleRequested || !interviewType || !preferredDate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // 1. DUPLICATE REQUEST GUARD & COOLDOWN
        const student = await User.findById(req.user.id);

        // Cooldown Check (30 min)
        const COOLDOWN_MS = 30 * 60 * 1000;
        if (student.lastMockInterviewRequestAt && (Date.now() - student.lastMockInterviewRequestAt < COOLDOWN_MS)) {
            const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - student.lastMockInterviewRequestAt)) / 60000);
            return res.status(429).json({ message: `Please wait ${remaining} more minutes before requesting another interview.` });
        }

        // Daily Limit Check (e.g., 3 per day)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const dailyCount = await MockInterview.countDocuments({
            student: req.user.id,
            createdAt: { $gte: startOfDay }
        });
        if (dailyCount >= 3) {
            return res.status(429).json({ message: 'Daily mock interview request limit reached (3/day)' });
        }

        // Prevent multiple pending requests for same role/interviewer
        const existingPending = await MockInterview.findOne({
            student: req.user.id,
            status: 'pending',
            roleRequested,
            alumni: alumniId || { $exists: false }
        });

        if (existingPending) {
            return res.status(400).json({ message: 'You already have a pending request for this role.' });
        }

        const interview = await MockInterview.create({
            student: req.user.id,
            alumni: alumniId,
            roleRequested,
            skills: Array.isArray(skills) ? skills : [],
            interviewType,
            preferredDate,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
        });

        // Update student request timestamp
        student.lastMockInterviewRequestAt = Date.now();
        await student.save();

        // Emit Socket Event
        const io = require('../utils/socket').getIO();
        if (io) io.emit('mock:new-request', { interviewId: interview._id, roleRequested });

        // Trigger Notification to Alumni (Targeted notifications based on role)
        try {
            const student = await User.findById(req.user.id).lean();
            const alumniToNotify = await User.find({ role: 'alumni' }).lean(); // Scale note: In large systems, filter by expertise

            for (const alum of alumniToNotify) {
                const notification = await Notification.create({
                    user: alum._id,
                    type: 'mock_requested',
                    title: 'New Mock Interview Request',
                    message: `${student ? student.name : 'A student'} is requesting a ${interviewType} mock interview for the role of ${roleRequested}.`,
                    metadata: {
                        interviewId: interview._id,
                        studentId: req.user.id,
                        roleRequested
                    }
                });
                emitNotification(alum._id, notification);
            }
        } catch (notifierErr) {
            console.error('[notifier] mock_requested error:', notifierErr.message);
        }

        res.status(201).json(interview);
    } catch (err) {
        console.error('[mockInterviews] requestInterview error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/mock-interviews/student
 * Student views their own interview requests.
 */
const getStudentInterviews = async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const interviews = await MockInterview.find({ student: req.user.id })
            .populate('alumni', 'name email profilePic')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.json(interviews);
    } catch (err) {
        console.error('[mockInterviews] getStudentInterviews error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/mock-interviews/alumni
 * Alumni views pending requests from students.
 */
const getAlumniInterviews = async (req, res) => {
    try {
        if (req.user.role !== 'alumni') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Fetch alumni details for scoring
        const alumni = await User.findById(req.user.id).select('stream currentRole specialization title interviewExpertise skills department').lean();

        // Fetch all potential matching requests
        const interviews = await MockInterview.find({
            $and: [
                { rejectedBy: { $ne: req.user.id } }, // Not rejected by current alumni
                {
                    $or: [
                        { status: 'pending' },
                        { alumni: req.user.id }
                    ]
                }
            ]
        })
            .populate('student', 'name email department profilePic stream')
            .sort({ createdAt: -1 })
            .lean();

        // Apply scoring and rank
        const rankedInterviews = interviews.map(interview => {
            if (interview.status === 'pending') {
                const result = calculateMockScore(interview, alumni);
                return { ...interview, matchScore: result.score, isCrossStream: result.isCrossStream };
            } else {
                // If it's already assigned to them, push to top but keep score
                return { ...interview, matchScore: 100, isCrossStream: false };
            }
        }).sort((a, b) => {
            // Priority: Accepted by this alumni > Top match pending > Time
            if (a.status === 'accepted' && b.status !== 'accepted') return -1;
            if (b.status === 'accepted' && a.status !== 'accepted') return 1;
            if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Apply Pagination
        const paginatedInterviews = rankedInterviews.slice(skip, skip + limit);

        res.json(paginatedInterviews);
    } catch (err) {
        console.error('[mockInterviews] getAlumniInterviews error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PATCH /api/mock-interviews/:id/respond
 * Alumni accepts or rejects an interview request.
 */
const respondToInterview = async (req, res) => {
    try {
        if (req.user.role !== 'alumni') {
            return res.status(403).json({ message: 'Only alumni can respond to requests' });
        }

        const { status, meetingLink, scheduledDate } = req.body;

        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid interview ID' });
        }

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status response' });
        }

        const interview = await MockInterview.findById(req.params.id);
        if (!interview) {
            return res.status(404).json({ message: 'Interview request not found' });
        }

        if (interview.status !== 'pending') {
            return res.status(400).json({ message: 'This request is no longer pending' });
        }

        if (status === 'rejected') {
            // Per-alumni rejection: Add to rejectedBy array, don't change global status
            if (!interview.rejectedBy.includes(req.user.id)) {
                interview.rejectedBy.push(req.user.id);
                await interview.save();
            }
            return res.json({ message: 'Request rejected', status: 'rejected' });
        }

        // 2. INTERVIEWER OVERLOAD PROTECTION (Acceptance logic)
        const alumni = await User.findById(req.user.id);

        // Weekly Reset Guard (Simple implementation: based on ISO week)
        const getWeekNumber = (date) => {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        };

        const currentWeek = getWeekNumber(new Date());
        const lastActiveWeek = alumni.lastActive ? getWeekNumber(alumni.lastActive) : 0;

        if (currentWeek !== lastActiveWeek) {
            alumni.currentWeekInterviews = 0;
        }

        if (alumni.currentWeekInterviews >= (alumni.maxInterviewsPerWeek || 5)) {
            return res.status(400).json({
                message: 'You have reached your weekly interview capacity. You can auto-disable availability in settings.',
                overload: true
            });
        }

        // Atomic Check & Update
        const updatedAlumni = await User.findOneAndUpdate(
            { _id: req.user.id, currentWeekInterviews: { $lt: alumni.maxInterviewsPerWeek || 5 } },
            { $inc: { currentWeekInterviews: 1 }, lastActive: Date.now() },
            { new: true }
        );

        if (!updatedAlumni) {
            return res.status(400).json({ message: 'Unable to accept interview. Weekly capacity reached.' });
        }

        interview.status = 'accepted';
        interview.alumni = req.user.id;
        if (meetingLink) interview.meetingLink = meetingLink;
        if (scheduledDate) interview.scheduledDate = scheduledDate;

        await interview.save();

        // Trigger Notification to Student (Only on Acceptance)
        if (status === 'accepted') {
            try {
                const alumni = await User.findById(req.user.id).lean();
                const notification = await Notification.create({
                    user: interview.student,
                    type: 'mock_accepted',
                    title: 'Mock Interview Accepted! 📅',
                    message: `${alumni ? alumni.name : 'An alumni'} has accepted your mock interview request for ${interview.roleRequested}. Check your dashboard for the meeting link.`,
                    metadata: {
                        interviewId: interview._id,
                        alumniId: req.user.id,
                        scheduledDate: interview.scheduledDate
                    }
                });
                emitNotification(interview.student, notification);

                // Trigger Dashboard Refresh for both
                const io = require('../utils/socket').getIO();
                if (io) {
                    io.emit('mock:update', { studentId: interview.student, alumniId: req.user.id });
                    io.to(interview.student.toString()).emit('mock:accepted', { interviewId: interview._id });
                }
            } catch (notifierErr) {
                console.error('[notifier] mock_accepted error:', notifierErr.message);
            }
        }

        res.json(interview);
    } catch (err) {
        console.error('[mockInterviews] respondToInterview error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PATCH /api/mock-interviews/:id/schedule
 * Alumni schedules the interview time.
 */
const scheduleInterview = async (req, res) => {
    try {
        if (req.user.role !== 'alumni') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const { scheduledDate, meetingLink } = req.body;
        if (!scheduledDate) {
            return res.status(400).json({ message: 'Scheduled date is required' });
        }

        const schedDate = new Date(scheduledDate);
        if (schedDate < new Date()) {
            return res.status(400).json({ message: 'Scheduled date must be in the future' });
        }

        const interview = await MockInterview.findById(req.params.id);
        if (!interview || interview.alumni.toString() !== req.user.id) {
            return res.status(404).json({ message: 'Interview not found or unauthorized' });
        }

        // CONFLICT GUARD: Prevent overlapping (1-hour window)
        const startWindow = new Date(schedDate.getTime() - 59 * 60 * 1000);
        const endWindow = new Date(schedDate.getTime() + 59 * 60 * 1000);

        const conflict = await MockInterview.findOne({
            _id: { $ne: interview._id },
            status: 'accepted',
            $or: [
                { alumni: req.user.id, scheduledDate: { $gte: startWindow, $lte: endWindow } },
                { student: interview.student, scheduledDate: { $gte: startWindow, $lte: endWindow } }
            ]
        }).lean();

        if (conflict) {
            return res.status(409).json({
                message: 'Scheduling conflict detected (interviewer or candidate already has a session within 1 hour)'
            });
        }

        interview.scheduledDate = schedDate;
        if (meetingLink) interview.meetingLink = meetingLink;
        await interview.save();

        // Socket Event
        const io = require('../utils/socket').getIO();
        if (io) io.emit('mock:scheduled', { interviewId: interview._id, scheduledDate: schedDate });

        // Notify
        try {
            const alumni = await User.findById(req.user.id).lean();
            const notification = await Notification.create({
                user: interview.student,
                type: 'mock_scheduled',
                title: 'Mock Interview Scheduled! ⏰',
                message: `Your mock interview for ${interview.roleRequested} has been scheduled for ${schedDate.toLocaleString()}`,
                metadata: { interviewId: interview._id, scheduledDate: schedDate }
            });
            emitNotification(interview.student, notification);
        } catch (e) { }

        res.json(interview);
    } catch (err) {
        console.error('[mockInterviews] scheduleInterview error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PATCH /api/mock-interviews/:id/complete
 * Alumni marks an interview as completed with feedback.
 */
const completeInterview = async (req, res) => {
    try {
        if (req.user.role !== 'alumni') {
            return res.status(403).json({ message: 'Only alumni can complete interviews' });
        }

        const { feedback } = req.body;

        const interview = await MockInterview.findById(req.params.id);
        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        if (interview.alumni.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not the assigned alumni for this interview' });
        }

        if (interview.status !== 'accepted') {
            return res.status(400).json({ message: 'Only accepted interviews can be marked as completed' });
        }

        // FEEDBACK ENFORCEMENT & SANITIZATION
        if (!feedback || feedback.trim().length < 10) {
            return res.status(400).json({ message: 'Meaningful feedback (min 10 chars) is required for completion' });
        }

        // Simple HTML Sanitization
        const sanitizedFeedback = feedback.replace(/<[^>]*>?/gm, '').trim();

        interview.status = 'completed';
        interview.feedback = sanitizedFeedback;
        interview.feedbackGiven = true;

        await interview.save();

        // Socket Event
        const io = require('../utils/socket').getIO();
        if (io) io.emit('mock:completed', { interviewId: interview._id });

        // Notify Completed
        try {
            const notification = await Notification.create({
                user: interview.student,
                type: 'mock_completed',
                title: 'Mock Interview Feedback Ready! 🌟',
                message: `Your interview for ${interview.roleRequested} is complete. View your feedback now!`,
                metadata: { interviewId: interview._id }
            });
            emitNotification(interview.student, notification);
        } catch (e) { }

        res.json(interview);
    } catch (err) {
        console.error('[mockInterviews] completeInterview error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/mock-interviews/expertise
 * Get current alumni interview expertise.
 */
const getExpertise = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('interviewExpertise');
        res.json(user.interviewExpertise || {});
    } catch (err) {
        console.error('[mockInterviews] getExpertise error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/mock-interviews/expertise
 * Update alumni interview expertise.
 */
const updateExpertise = async (req, res) => {
    try {
        if (req.user.role !== 'alumni') {
            return res.status(403).json({ message: 'Only alumni can set expertise' });
        }

        const { primaryArea, topics, otherTopics, availability } = req.body;

        await User.findByIdAndUpdate(req.user.id, {
            interviewExpertise: {
                primaryArea,
                topics,
                otherTopics,
                availability
            }
        });

        res.json({ message: 'Expertise updated successfully' });
    } catch (err) {
        console.error('[mockInterviews] updateExpertise error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/mock-interviews/upcoming
 * Fetch next 3 upcoming accepted mock interviews
 */
const getUpcomingInterviews = async (req, res) => {
    try {
        const query = {
            status: 'accepted',
            scheduledDate: { $gte: new Date() }
        };

        if (req.user.role === 'student') {
            query.student = req.user.id;
        } else if (req.user.role === 'alumni') {
            query.alumni = req.user.id;
        }

        const interviews = await MockInterview.find(query)
            .populate('student', 'name profilePic')
            .populate('alumni', 'name profilePic')
            .sort({ scheduledDate: 1 })
            .limit(3)
            .lean();

        res.json(interviews);
    } catch (err) {
        console.error('[mockInterviews] getUpcomingInterviews error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Utility: Cleanup Mock Interviews (No-shows and Expiries)
 * Can be called before fetching stats or via cron
 */
const cleanupMockInterviews = async () => {
    try {
        const now = new Date();

        // 1. Mark No-Shows
        // Grace period: 2 hours after scheduled time
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

        const noShows = await MockInterview.find({
            status: 'accepted',
            scheduledDate: { $lt: twoHoursAgo }
        });

        for (const interview of noShows) {
            interview.status = 'no-show';
            await interview.save();

            // Increment no-show count for candidate (Abuse control)
            await User.findByIdAndUpdate(interview.student, { $inc: { noShowCount: 1 } });

            // Socket Event
            const io = require('../utils/socket').getIO();
            if (io) io.emit('mock:no-show', { interviewId: interview._id });

            // Notify candidate? (Optional, user didn't specify, but good practice)
        }

        // 2. Mark Expiries (Pending older than 7 days)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        await MockInterview.updateMany(
            { status: 'pending', createdAt: { $lt: sevenDaysAgo } },
            { $set: { status: 'expired' } }
        );

        return { noShows: noShows.length };
    } catch (err) {
        console.error('[mockInterviews] cleanup error:', err.message);
    }
};

module.exports = {
    requestInterview,
    getStudentInterviews,
    getAlumniInterviews,
    respondToInterview,
    completeInterview,
    getExpertise,
    updateExpertise,
    getUpcomingInterviews,
    scheduleInterview,
    cleanupMockInterviews
};
