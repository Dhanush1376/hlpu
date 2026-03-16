const express = require('express');
const router = express.Router();
const skillGapController = require('../controllers/skillGapController');
const placementController = require('../controllers/placementController');
const aiCareerController = require('../controllers/aiCareerController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * All AI routes are protected and restricted to students.
 */
router.use(protect);
router.use(authorizeRoles('student'));

/**
 * GET /api/ai/skill-gap
 * Returns personalized skill gap analysis.
 */
router.get('/skill-gap', skillGapController.getSkillGap);

/**
 * GET /api/ai/placement-score
 * Returns placement readiness score and breakdown.
 */
router.get('/placement-score', placementController.getPlacementScore);

/**
 * GET /api/ai/career-insights
 * Returns AI heuristics for career trajectory.
 */
router.get('/career-insights', aiCareerController.getCareerInsights);

module.exports = router;
