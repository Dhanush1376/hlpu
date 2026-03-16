const express = require('express');
const router = express.Router();
const {
    requestMentorship,
    getStudentRequests,
    getAlumniRequests,
    respondToRequest,
    completeRequest,
    cancelRequest,
    updateMentorAvailability,
    getAvailableMentors,
    getSmartMatches,
} = require('../controllers/mentorshipController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { saasGuard } = require('../middleware/saasMiddleware');

// All mentorship routes require authentication
router.use(protect);

// Student creates a request
router.post('/request', authorizeRoles('student'), saasGuard('mentor_requests'), requestMentorship);

// Student seeing/manipulating their own
router.get('/student', authorizeRoles('student'), getStudentRequests);
router.patch('/:id/cancel', authorizeRoles('student'), cancelRequest);
router.get('/available-mentors', authorizeRoles('student'), getAvailableMentors);
router.get('/match', authorizeRoles('student'), getSmartMatches);

// Alumni sees requests (pending or assigned to them)
router.get('/alumni', authorizeRoles('alumni'), getAlumniRequests);

// Alumni responds (accept/reject)
router.patch('/:id/respond', authorizeRoles('alumni'), respondToRequest);

// Alumni marks as completed
router.patch('/:id/complete', authorizeRoles('alumni'), completeRequest);

// Alumni toggles availability
router.patch('/availability', authorizeRoles('alumni'), updateMentorAvailability);

module.exports = router;
