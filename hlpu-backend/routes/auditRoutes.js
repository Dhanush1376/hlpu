const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { getAuditLogs, getAuditStats } = require('../controllers/auditController');

// All audit routes are restricted to admins
router.use(protect, authorizeRoles('admin'));

router.get('/logs', getAuditLogs);
router.get('/stats', getAuditStats);

module.exports = router;
