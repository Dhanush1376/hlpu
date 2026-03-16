const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
    requestInterview,
    getStudentInterviews,
    getAlumniInterviews,
    respondToInterview,
    completeInterview,
    getExpertise,
    updateExpertise,
    getUpcomingInterviews,
    scheduleInterview
} = require('../controllers/mockInterviewController');

// All routes are protected
router.use(protect);

// Global upcoming mocks (contextual to user)
router.get('/upcoming', getUpcomingInterviews);

// Student routes
router.post('/request', authorizeRoles('student'), requestInterview);
router.get('/student', authorizeRoles('student'), getStudentInterviews);

// Alumni routes
router.get('/expertise', authorizeRoles('alumni'), getExpertise);
router.post('/expertise', authorizeRoles('alumni'), updateExpertise);
router.get('/alumni', authorizeRoles('alumni'), getAlumniInterviews);
router.patch('/:id/respond', authorizeRoles('alumni'), respondToInterview);
router.patch('/:id/schedule', authorizeRoles('alumni'), scheduleInterview);
router.patch('/:id/complete', authorizeRoles('alumni'), completeInterview);

module.exports = router;
