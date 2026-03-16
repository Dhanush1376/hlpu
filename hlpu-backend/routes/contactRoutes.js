const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const {
    submitMessage,
    getMessages,
    getMessageById,
    updateMessageStatus,
    replyToMessage,
    getMessageStats
} = require('../controllers/contactController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Rate limiting for public submission
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 messages per hour
    message: {
        success: false,
        message: 'Too many messages from this IP, please try again after an hour'
    }
});

// Public route
router.post('/', contactLimiter, submitMessage);

// Admin routes
router.get('/admin/list', protect, authorizeRoles('admin'), getMessages);
router.get('/admin/stats', protect, authorizeRoles('admin'), getMessageStats);
router.get('/admin/:id', protect, authorizeRoles('admin'), getMessageById);
router.patch('/admin/:id/status', protect, authorizeRoles('admin'), updateMessageStatus);
router.post('/admin/:id/reply', protect, authorizeRoles('admin'), replyToMessage);

module.exports = router;
