const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const courseController = require('../controllers/courseController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// All admin routes are protected
router.use(protect);
router.use(authorizeRoles('admin'));

// GET /api/admin/users
router.get('/users', protect, authorizeRoles('admin'), adminController.getAllUsers);
router.get('/stats', protect, authorizeRoles('admin'), adminController.getAllUsers); // Reusing getAllUsers as it now returns stats

// GET /api/admin/users/:id
router.get('/users/:id', adminController.getUserById);

// POST /api/admin/users/:id/message
router.post('/users/:id/message', adminController.sendAdminMessage);

// GET /api/admin/export-users
router.get('/export-users', adminController.exportUsers);

// Verification Management
router.get('/pending-verifications', adminController.getPendingVerifications);
router.patch('/verify/:requestId', adminController.respondToVerification);

const { uploadRoadmap } = require('../middleware/uploadMiddleware');

// Course Management
router.post('/courses', courseController.createCourse);
router.post('/courses/upload-roadmap', uploadRoadmap.single('roadmap'), courseController.uploadRoadmap);
router.get('/courses/:id', courseController.getCourseById);
router.patch('/courses/:id', courseController.updateCourse);
router.delete('/courses/:id', courseController.deleteCourse);
router.get('/courses', courseController.getAdminCourses);
router.get('/mocks/health', adminController.getMockHealth);

module.exports = router;
