const express = require('express');
const router = express.Router();
const recruiterController = require('../controllers/recruiterController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * All recruiter routes are protected and restricted to recruiters.
 */
router.use(protect);
router.use(authorizeRoles('recruiter', 'admin'));

/**
 * GET /api/recruiter/candidates
 * Efficient candidate search.
 */
router.get('/candidates', recruiterController.getCandidates);

/**
 * POST /api/recruiter/shortlist/:studentId
 * Shortlist or reject a candidate.
 */
router.post('/shortlist/:studentId', recruiterController.shortlistStudent);

/**
 * GET /api/recruiter/shortlisted
 * Get all shortlisted candidates by this recruiter.
 */
router.get('/shortlisted', recruiterController.getShortlisted);

/**
 * GET /api/recruiter/analytics
 * Dashboard statistics.
 */
router.get('/analytics', recruiterController.getAnalytics);

module.exports = router;
