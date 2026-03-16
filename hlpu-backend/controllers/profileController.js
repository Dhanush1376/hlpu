const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { trackEvent } = require('../services/analyticsService');

/**
 * GET /api/profile/me
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).lean();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Background update for lastActive (no need to wait)
        User.findByIdAndUpdate(req.user.id, { $set: { lastActive: new Date() } }).catch(err => console.error('[profile] lastActive update failed:', err));

        res.json(user);
    } catch (err) {
        console.error('[profile] getProfile error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PATCH /api/profile/me
 * Update current user profile
 */
exports.updateProfile = async (req, res) => {
    try {
        const allowedFields = [
            'name', 'email', 'title', 'university', 'about', 'skills',
            'education', 'projects', 'contact', 'profilePicture', 'experience',
            'professionalBadges', 'mentorship', 'achievements', 'stats', 'company',
            'settings', 'phoneNumber'
        ];

        const updates = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);

        // Track Event: profile_update
        trackEvent('profile_update', req, { fields: Object.keys(updates) });
    } catch (err) {
        console.error('[profile] updateProfile error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};
/**
 * POST /api/profile/upload-pic
 * Upload profile picture
 */
exports.uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const profilePictureUrl = `/uploads/profile-pics/${req.file.filename}`;

        await User.findByIdAndUpdate(req.user.id, {
            $set: { profilePicture: profilePictureUrl }
        });

        res.json({
            message: 'Profile picture uploaded successfully',
            profilePicture: profilePictureUrl
        });

        // Track Event: profile_pic_update
        trackEvent('profile_pic_update', req, { url: profilePictureUrl });
    } catch (err) {
        console.error('[profile] uploadPic error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};
/**
 * GET /api/profile/strength
 * Calculate profile completion percentage
 */
exports.getProfileStrength = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).lean();
        if (!user) return res.status(404).json({ message: 'User not found' });

        let score = 0;
        const missingFields = [];
        const breakdown = {
            basic: 0,       // Name, Title, About (Max 30)
            professional: 0, // Skills, Experience, Education (Max 40)
            visibility: 0,  // Profile Pic, Projects, Contact (Max 30)
        };

        // --- BASIC INFO (30 pts) ---
        if (user.name) breakdown.basic += 10;
        else missingFields.push({ field: 'name', label: 'Full Name', points: 10 });

        if (user.title) breakdown.basic += 10;
        else missingFields.push({ field: 'title', label: 'Professional Title', points: 10 });

        if (user.about && user.about.length > 50) breakdown.basic += 10;
        else missingFields.push({ field: 'about', label: 'Detailed Bio (min 50 chars)', points: 10 });

        // --- PROFESSIONAL (40 pts) ---
        if (user.skills && user.skills.length >= 5) breakdown.professional += 15;
        else missingFields.push({ field: 'skills', label: 'At least 5 skills', points: 15 });

        if (user.experience && user.experience.length >= 1) breakdown.professional += 15;
        else missingFields.push({ field: 'experience', label: 'Work Experience', points: 15 });

        if (user.education && user.education.length >= 1) breakdown.professional += 10;
        else missingFields.push({ field: 'education', label: 'Education details', points: 10 });

        // --- VISIBILITY (30 pts) ---
        if (user.profilePicture && !user.profilePicture.includes('default')) breakdown.visibility += 10;
        else missingFields.push({ field: 'profilePicture', label: 'Profile Picture', points: 10 });

        if (user.projects && user.projects.length >= 1) breakdown.visibility += 10;
        else missingFields.push({ field: 'projects', label: 'At least 1 project', points: 10 });

        const contactLinks = user.contact ? Object.values(user.contact).filter(v => !!v).length : 0;
        if (contactLinks >= 2) breakdown.visibility += 10;
        else missingFields.push({ field: 'contact', label: 'Contact links (LinkedIn, Portfolio, etc)', points: 10 });

        score = breakdown.basic + breakdown.professional + breakdown.visibility;

        // Sync back to user document for ranking
        await User.findByIdAndUpdate(req.user.id, { $set: { profileStrength: score } });

        res.json({
            percentage: score,
            breakdown,
            missingFields,
            level: score >= 90 ? 'Expert' : score >= 70 ? 'Professional' : score >= 40 ? 'Intermediate' : 'Beginner',
            nextMilestone: score < 100 ? missingFields[0] : null
        });
    } catch (err) {
        console.error('[profile] getProfileStrength error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/profile/logs
 * Get recent activity logs for current admin
 */
exports.getAdminLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        res.json(logs);
    } catch (err) {
        console.error('[profile] getAdminLogs error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};
