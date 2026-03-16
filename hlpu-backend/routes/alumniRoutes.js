const express = require('express');
const router = express.Router();
const {
    getAlumniCircle,
    connectAlumni,
    getConnections,
    getIncomingRequests,
    getOutgoingRequests,
    respondToRequest
} = require('../controllers/alumniController');
const { getCircles, createCircle, toggleJoinCircle } = require('../controllers/circleController');
const { requestVerification, getVerificationStatus } = require('../controllers/verificationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Discovery / Circle (Accessible by Students and Alumni)
router.get('/circle', protect, authorizeRoles('alumni', 'student'), getAlumniCircle);
router.get('/circles', protect, authorizeRoles('alumni', 'student'), getCircles);
router.post('/circles', protect, authorizeRoles('alumni'), createCircle);
router.post('/circles/:id/join', protect, authorizeRoles('alumni', 'student'), toggleJoinCircle);

// All other connection/request routes require alumni role for managing their own requests
router.use(protect);
router.use(authorizeRoles('alumni'));

// Connections management
router.get('/connections', getConnections);
router.post('/connect/:alumniId', connectAlumni);

// Requests management
router.get('/requests/incoming', getIncomingRequests);
router.get('/requests/outgoing', getOutgoingRequests);
router.patch('/requests/:id/respond', respondToRequest);

// Verification
router.post('/verify/request', requestVerification);
router.get('/verify/status', getVerificationStatus);

module.exports = router;
