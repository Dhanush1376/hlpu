const jwt = require('jsonwebtoken');

/**
 * Verify JWT and attach decoded payload to req.user.
 */
const protect = async (req, res, next) => {
    let token = req.cookies.token;

    // Fallback to Bearer header for dev/API testing
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, please log in' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch real-time user status from DB
        const User = require('../models/User');
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'User no longer exists' });
        }

        if (user.accountStatus?.status === 'suspended' || user.accountStatus?.isActive === false) {
            return res.status(403).json({ message: 'Your account has been suspended' });
        }

        req.user = user;
        console.log(`[auth] Request: ${req.method} ${req.originalUrl || req.url} | User: ${req.user._id} | Role: ${req.user.role} | Verified: ${req.user.isVerified}`);
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token or session expired' });
    }
};

/**
 * Role-based authorization factory with optional verified check.
 */
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Special check: alumni must be verified for certain roles if requested
        // but for now, we'll keep it simple and add a separate check for verification where needed
        next();
    };
};

const verifiedAlumniOnly = (req, res, next) => {
    console.log('[auth] verifiedAlumniOnly checking user:', req.user.email, 'isVerified:', req.user.isVerified);
    if (req.user.role === 'alumni' && !req.user.isVerified) {
        return res.status(403).json({ message: 'Access denied. Verified alumni account required.' });
    }
    next();
};

module.exports = { protect, authorizeRoles, verifiedAlumniOnly };
