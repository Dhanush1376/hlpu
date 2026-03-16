const User = require('../models/User');

/**
 * GET /api/profile/user/:id/public
 * Returns a sanitized public profile for cross-role viewing.
 * Requires authentication. Respects privacy settings.
 */
const getPublicProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -settings.otp -settings.otpExpires -settings.resetPasswordToken -settings.resetPasswordExpire -settings.security -settings.adminMetadata')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Respect privacy settings
        const visibility = user.settings?.privacy?.profileVisibility || 'public';
        if (visibility === 'private' && req.user.id !== req.params.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'This profile is private' });
        }

        // Hide email if user opted out
        if (user.settings?.privacy?.showEmail === false && req.user.id !== req.params.id) {
            user.email = undefined;
        }

        // Clean up settings from response
        delete user.settings;

        res.json(user);
    } catch (err) {
        console.error('[users] getPublicProfile error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getPublicProfile };
