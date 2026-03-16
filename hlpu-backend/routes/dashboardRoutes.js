const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { getStudentDashboard, getAlumniDashboard, getAdminDashboard } = require('../controllers/dashboardController');

// GET /api/dashboard/student — students only
router.get('/student', protect, authorizeRoles('student'), getStudentDashboard);

// GET /api/dashboard/alumni — alumni only
router.get('/alumni', protect, authorizeRoles('alumni'), getAlumniDashboard);

// GET /api/dashboard/admin — admins only
router.get('/admin', protect, authorizeRoles('admin'), getAdminDashboard);

module.exports = router;
