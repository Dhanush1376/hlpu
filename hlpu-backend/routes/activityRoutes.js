const express = require('express');
const router = express.Router();
const { trackActivity, getMyRecentActivity, getMomentumTriggers } = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/track', trackActivity);
router.get('/recent', getMyRecentActivity);
router.get('/momentum', getMomentumTriggers);

module.exports = router;
