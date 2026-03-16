const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/tickets', supportController.createTicket);
router.get('/tickets', supportController.getTickets);
router.post('/tickets/:id/message', supportController.addTicketMessage);

// Admin only routes
router.patch('/tickets/:id/status', authorizeRoles('admin'), supportController.updateTicketStatus);

module.exports = router;
