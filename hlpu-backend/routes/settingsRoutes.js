const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');

// All settings routes require authentication
router.use(protect);

router.get('/me', settingsController.getSettings);
router.patch('/profile', settingsController.updateProfile);
router.patch('/notifications', settingsController.updateNotifications);
router.patch('/privacy', settingsController.updatePrivacy);
router.patch('/preferences', protect, settingsController.updatePreferences);
router.patch('/password', settingsController.updatePassword);
router.patch('/deactivate', settingsController.deactivateAccount);
router.delete('/delete', settingsController.deleteAccount);

module.exports = router;
