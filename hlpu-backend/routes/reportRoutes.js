const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { getReportStats } = require('../controllers/reportController');

router.get('/stats', protect, authorizeRoles('admin'), getReportStats);

module.exports = router;
