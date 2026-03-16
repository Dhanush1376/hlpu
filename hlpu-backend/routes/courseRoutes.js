const express = require('express');
const router = express.Router();
const { getCourses, getCourseBySlug, getCourseDownload } = require('../controllers/courseController');

// @route   GET /api/courses
// @desc    Get all active courses
router.get('/', getCourses);

// @route   GET /api/courses/:slug
// @desc    Get single course
router.get('/:slug', getCourseBySlug);

// @route   GET /api/courses/:slug/download
// @desc    Get download URL
router.get('/:slug/download', getCourseDownload);

module.exports = router;
