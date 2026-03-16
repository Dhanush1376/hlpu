const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * GET /api/settings/me
 * Get current user settings and profile info
 */
exports.getSettings = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('+password').lean();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Remove password before sending
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (err) {
        console.error('[settings] getSettings error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PATCH /api/settings/profile
 * Update basic profile fields
 */
exports.updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, phone, bio, location, graduationYear } = req.body;

        const updates = {
            name: firstName && lastName ? `${firstName} ${lastName}` : undefined,
            'contact.phone': phone,
            about: bio,
            'contact.location': location,
            graduationYear: graduationYear // Ensure this is in the model if used elsewhere, currently contact.location is present
        };

        // If graduationYear isn't directly in model, we might need to add it or store in specific place
        // Based on User.js, we have contact object. Let's stick to available fields.

        const cleanUpdates = {};
        if (firstName && lastName) cleanUpdates.name = `${firstName} ${lastName}`;
        if (phone) cleanUpdates['contact.phone'] = phone;
        if (bio) cleanUpdates.about = bio;
        if (location) cleanUpdates['contact.location'] = location;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: cleanUpdates },
            { new: true, runValidators: true }
        ).lean();

        res.json({ message: 'Profile updated successfully', user });
    } catch (err) {
        console.error('[settings] updateProfile error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PATCH /api/settings/notifications
 * Update notification toggles
 */
exports.updateNotifications = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { 'settings.notifications': req.body } },
            { new: true }
        ).lean();
        res.json({ message: 'Notification settings updated', settings: user.settings.notifications });
    } catch (err) {
        console.error('[settings] updateNotifications error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PATCH /api/settings/privacy
 * Update privacy controls
 */
exports.updatePrivacy = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { 'settings.privacy': req.body } },
            { new: true }
        ).lean();
        res.json({ message: 'Privacy settings updated', settings: user.settings.privacy });
    } catch (err) {
        console.error('[settings] updatePrivacy error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};


/**
 * PATCH /api/settings/preferences
 * Update user preferences
 */
exports.updatePreferences = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { 'settings.preferences': req.body } },
            { new: true }
        ).lean();
        res.json({ message: 'Preferences updated', settings: user.settings.preferences });
    } catch (err) {
        console.error('[settings] updatePreferences error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PATCH /api/settings/password
 * Secure password change
 */
exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id).select('+password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('[settings] updatePassword error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PATCH /api/settings/deactivate
 * Soft deactivate account
 */
exports.deactivateAccount = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, {
            $set: {
                'settings.accountStatus.isActive': false,
                'settings.accountStatus.deactivatedAt': new Date()
            }
        });
        res.json({ message: 'Account deactivated successfully' });
    } catch (err) {
        console.error('[settings] deactivateAccount error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * DELETE /api/settings/delete
 * Permanent delete
 */
exports.deleteAccount = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user.id);
        res.json({ message: 'Account permanently deleted' });
    } catch (err) {
        console.error('[settings] deleteAccount error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};
