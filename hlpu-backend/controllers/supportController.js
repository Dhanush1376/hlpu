const SupportTicket = require('../models/SupportTicket');
const { trackEvent } = require('../services/analyticsService');

/**
 * POST /api/support/tickets
 * Create a new ticket.
 */
exports.createTicket = async (req, res) => {
    try {
        const { subject, category, priority, description } = req.body;

        if (!subject || !description) {
            return res.status(400).json({ success: false, message: 'Subject and description are required' });
        }

        const ticket = await SupportTicket.create({
            user: req.user.id,
            subject,
            category: category || 'other',
            priority: priority || 'low',
            description
        });

        trackEvent('ticket_created', req, { ticketId: ticket._id, category });

        res.status(201).json({ success: true, ticket });
    } catch (err) {
        console.error('[support] createTicket error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * GET /api/support/tickets
 * Get user's tickets (or all for admin).
 */
exports.getTickets = async (req, res) => {
    try {
        const query = req.user.role === 'admin' ? {} : { user: req.user.id };
        const tickets = await SupportTicket.find(query)
            .sort({ createdAt: -1 })
            .populate('user', 'name email role')
            .lean();

        res.json({ success: true, tickets });
    } catch (err) {
        console.error('[support] getTickets error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * PATCH /api/support/tickets/:id/status
 * Update ticket status (admin only).
 */
exports.updateTicketStatus = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin only' });
        }

        const { status, priority, assignedTo } = req.body;
        const ticket = await SupportTicket.findByIdAndUpdate(
            req.params.id,
            { $set: { status, priority, assignedTo } },
            { new: true }
        );

        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        res.json({ success: true, ticket });
    } catch (err) {
        console.error('[support] updateTicketStatus error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * POST /api/support/tickets/:id/message
 * Add message to ticket thread.
 */
exports.addTicketMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const ticket = await SupportTicket.findById(req.params.id);

        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        // Authorization check
        if (req.user.role !== 'admin' && ticket.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        ticket.thread.push({
            sender: req.user.id,
            message,
            timestamp: new Date()
        });

        if (req.user.role === 'admin' && ticket.status === 'open') {
            ticket.status = 'in_progress';
        }

        await ticket.save();
        res.json({ success: true, ticket });
    } catch (err) {
        console.error('[support] addTicketMessage error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
