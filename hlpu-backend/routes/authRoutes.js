const express = require('express');
const router = express.Router();
const { register, login, changePassword, verifyAdminOTP, logout, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Validation Middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Brute-force protection for login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: 'Too many login attempts, please try again after 15 minutes'
});

// POST /api/auth/register
router.post('/register', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
], register);

// POST /api/auth/login
router.post('/login', [
    loginLimiter,
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
], login);

// POST /api/auth/logout
router.post('/logout', logout);

// POST /api/auth/verify-otp
router.post('/verify-otp', verifyAdminOTP);

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
], resetPassword);

// POST /api/auth/forgot-password
router.post('/forgot-password', [
    body('email').isEmail().withMessage('Valid email is required'),
    validate
], forgotPassword);

// POST /api/auth/change-password (protected)
router.post('/change-password', protect, changePassword);

// GET /api/auth/me (protected — test route)
router.get('/me', protect, (req, res) => {
    res.json({ message: 'Access granted', user: req.user });
});

module.exports = router;
