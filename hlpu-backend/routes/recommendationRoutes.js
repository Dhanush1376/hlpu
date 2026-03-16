/**
 * recommendationRoutes.js
 * Routes for AI-powered personalized recommendations.
 */

const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// All recommendation routes are protected and for students (cold start fallback handles others)
router.use(protect);
router.use(authorizeRoles('student'));

/**
 * GET /api/recommendations/courses
 * Personalized course recommendations for the logged-in student.
 */
router.get('/courses', recommendationController.getRecommendedCourses);

module.exports = router;
