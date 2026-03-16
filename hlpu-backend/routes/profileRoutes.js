const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getProfile, updateProfile, uploadProfilePicture, getProfileStrength, getAdminLogs } = require('../controllers/profileController');
const { getPublicProfile } = require('../controllers/userController');
const { updateMentorAvailability } = require('../controllers/mentorshipController');
const { upload } = require('../middleware/uploadMiddleware');

// GET /api/profile/me - Get current user's profile
router.get('/me', protect, getProfile);

// PATCH /api/profile/me - Update current user's profile
router.patch('/me', protect, updateProfile);

// GET /api/profile/logs - Get activity logs
router.get('/logs', protect, getAdminLogs);

// POST /api/profile/upload-pic - Upload profile picture
router.post('/upload-pic', protect, upload.single('profilePic'), uploadProfilePicture);

// GET /api/profile/strength - Calculate profile completion
router.get('/strength', protect, getProfileStrength);

// PATCH /api/profile/mentor-availability - Toggle mentor availability
router.patch('/mentor-availability', protect, updateMentorAvailability);

// GET /api/profile/user/:id/public - Public profile for cross-role viewing
router.get('/user/:id/public', protect, getPublicProfile);

module.exports = router;
