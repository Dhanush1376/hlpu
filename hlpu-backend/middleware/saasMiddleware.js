/**
 * SaaS Middleware for soft feature gating and plan-based limits.
 */
const saasGuard = (feature, options = {}) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        // All features are free and unlimited on this platform
        next();
    };
};

module.exports = { saasGuard };
