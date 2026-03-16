const jwt = require('jsonwebtoken');

/**
 * Verify JWT token from Authorization header.
 * Attaches decoded user payload to req.user.
 */
const protect = (req, res, next) => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Not authorized — no token' });
    }

    try {
        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Not authorized — invalid token' });
    }
};

/**
 * Restrict route to specific roles.
 * Usage: authorize('admin', 'alumni')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden — insufficient role' });
        }
        next();
    };
};

module.exports = { protect, authorize };
