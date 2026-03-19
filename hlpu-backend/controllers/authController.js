const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { trackEvent } = require('../services/analyticsService');
const crypto = require('crypto');
const recommendationService = require('../services/recommendationService');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Helper to set HttpOnly cookie.
 */
const setTokenCookie = (res, token) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-origin (Vercel ↔ Render)
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
};

/**
 * POST /api/auth/register
 * Body: { name, email, password, role, department, phoneNumber, regNo, batch, stream, company, graduationYear, specialization, yearsOfExperience, currentRole }
 */
const register = async (req, res) => {
    try {
        const { name, email, password, role, department } = req.body;
        console.log('[auth] Registering user:', { name, email, role, ...req.body });

        // 1. Validate required fields
        if (!name || !email || !password || !req.body.stream || !department) {
            return res.status(400).json({ message: 'Name, email, password, stream, and program are required' });
        }

        const normalizedEmail = String(email).toLowerCase().trim();

        // 2. Ensure email is unique
        const exists = await User.findOne({ email: normalizedEmail }).lean();
        if (exists) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // 3. Hash password (10 rounds)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Generate initial preference profile
        const preferenceProfile = recommendationService.generateInitialProfile({
            stream: req.body.stream,
            specialization: req.body.specialization
        });

        // 5. Create user
        const user = await User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role: role || 'student',
            department, // mapped to program
            phoneNumber: req.body.phoneNumber,
            regNo: req.body.regNo,
            batch: req.body.batch,
            stream: req.body.stream,
            company: req.body.company,
            graduationYear: req.body.graduationYear,
            specialization: req.body.specialization,
            yearsOfExperience: req.body.yearsOfExperience,
            currentRole: req.body.currentRole,
            preferenceProfile,
            referralCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
            // Set initial verification status for alumni
            verificationStatus: role === 'alumni' ? 'pending' : 'none'
        });

        // 6. If Alumni, create a VerificationRequest record
        if (role === 'alumni') {
            try {
                const VerificationRequest = require('../models/VerificationRequest');
                await VerificationRequest.create({
                    user: user._id,
                    regNo: req.body.regNo || 'PENDING',
                    passoutYear: req.body.graduationYear || new Date().getFullYear(),
                    status: 'pending'
                });
                console.log('[auth] Verification request created for alumni:', user.email);
            } catch (vErr) {
                console.error('[auth] Failed to create verification request:', vErr.message);
                // We don't block registration if this fails, but it should be logged
            }
        }

        console.log('[auth] USER CREATED IN DB:', {
            id: user._id,
            email: user.email,
            stream: user.stream,
            preferenceProfileSet: !!user.preferenceProfile
        });

        // Track Event: user_signed_up
        trackEvent('user_signed_up', req, { userId: user._id, role: user.role });

        res.status(201).json({
            message: role === 'alumni' ? 'Registration successful. Your profile is pending verification.' : 'Registration successful',
            userId: user._id
        });
    } catch (err) {
        console.error('[auth] register error:', err.message);
        res.status(500).json({ message: 'Server error — please try again' });
    }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validate request body
        if (!email || !password) {
            console.warn('[auth] Login failed: Missing email or password in request body');
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Always normalize email (lowercase and trim) for consistent DB lookup
        const normalizedEmail = String(email).toLowerCase().trim();
        console.log(`[auth] Attempting login for: ${normalizedEmail}`);

        // 2. Find user. MUST include select('+password') because schema sets it to select: false
        const user = await User.findOne({ email: normalizedEmail }).select('+password').lean();
        
        // 3. Handle user not found (Prevents 500 when accessing user.password)
        if (!user) {
            console.warn(`[auth] Login failed: User not found for email ${normalizedEmail}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // 4. Handle missing password field in database (Old records or OAuth users)
        // Prevents bcrypt.compare from throwing 'data and hash arguments required'
        if (!user.password) {
            console.error(`[auth] Login Error: Password missing in DB for user ${user._id}`);
            return res.status(401).json({ message: 'Invalid credentials or old account. Please reset your password.' });
        }

        // 5. Verify password safely
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.warn(`[auth] Login failed: Password mismatch for ${normalizedEmail} (user ID ${user._id})`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log(`[auth] Login successful for user ${user._id}`);

        // Admin OTP feature removed per user request

        // 6. Return success for non-admin users
        const token = generateToken(user._id, user.role);
        setTokenCookie(res, token);

        // Log the event
        const { logEvent } = require('../utils/auditLogger');
        await logEvent({
            userId: user._id,
            action: 'login',
            description: `User logged in: ${user.email} (${user.role})`
        }, req);

        res.status(200).json({
            token, // Keep sending token for frontend LocalStorage fallback if needed
            role: user.role,
            userName: user.name,
        });

        // Track Event: user_logged_in
        trackEvent('user_logged_in', req, { userId: user._id, role: user.role });
    } catch (err) {
        console.error('[auth] login error:', err.message, err.stack);
        res.status(500).json({ message: 'Server error: ' + err.message + ' (Render deployment might still be updating)' });
    }
};

/**
 * POST /api/auth/change-password
 * Body: { oldPassword, newPassword }
 * Protected route
 */
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Old and new passwords are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        // 1. Find user (including password)
        const user = await User.findById(req.user.id).select('+password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 2. Verify old password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect old password' });
        }

        // 3. Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('[auth] changePassword error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/auth/verify-otp
 * Body: { email, otp }
 */
const verifyAdminOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        const user = await User.findOne({ email }).select('+otp +otpExpires');
        if (!user || user.role !== 'admin') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (user.otp !== otp || user.otpExpires < new Date()) {
            return res.status(401).json({ message: 'Invalid or expired OTP' });
        }

        // Clear OTP after success
        await User.findByIdAndUpdate(user._id, { $unset: { otp: 1, otpExpires: 1 } });

        const token = generateToken(user._id, user.role);
        setTokenCookie(res, token);

        // Log the event
        const { logEvent } = require('../utils/auditLogger');
        await logEvent({
            userId: user._id,
            action: 'login',
            description: `Admin successfully verified OTP and logged in: ${user.email}`
        }, req);

        res.status(200).json({
            token,
            role: user.role,
            userName: user.name,
        });
    } catch (err) {
        console.error('[auth] verifyOTP error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // Return success even if email doesn't exist to prevent timing attacks/enumeration
            return res.json({ message: 'If that email exists, a reset link has been sent' });
        }

        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(20).toString('hex');

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
        await user.save();

        if (process.env.NODE_ENV !== 'production') {
            console.log(`\n[SECURITY] Password Reset Token for ${email}: ${resetToken}\n`);
        }

        res.json({ message: 'If that email exists, a reset link has been sent' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/auth/reset-password/:token
 */
const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        // Log the event
        const { logEvent } = require('../utils/auditLogger');
        await logEvent({
            userId: user._id,
            action: 'password_reset',
            targetType: 'User',
            targetId: user._id,
            description: `Password reset successful for ${user.email}`
        }, req);

        res.json({ message: 'Password reset successful' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/auth/logout
 * Clears the authentication cookie.
 */
const logout = (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

module.exports = { register, login, changePassword, verifyAdminOTP, logout, forgotPassword, resetPassword };
