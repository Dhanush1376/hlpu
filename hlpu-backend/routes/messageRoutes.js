const express = require('express');
const router = express.Router();

// Search messages, users, and groups for global search
router.get('/search-global', (req, res) => {
    try {
        const query = req.query.q || '';
        // Return empty arrays for now until messaging system is fully implemented
        res.json({
            users: [],
            groups: [],
            messages: []
        });
    } catch (error) {
        console.error('[Message Search] Error:', error);
        res.status(500).json({ success: false, message: 'Failed to search messages' });
    }
});

module.exports = router;
