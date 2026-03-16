const Circle = require('../models/Circle');

/**
 * GET /api/alumni/circles
 * Fetch all active circles
 */
exports.getCircles = async (req, res) => {
    try {
        const circles = await Circle.find({ isActive: true }).lean();

        // Mark if the current user is a member
        const userId = req.user.id;
        const enrichedCircles = circles.map(c => ({
            ...c,
            isJoined: c.members.some(m => m.toString() === userId)
        }));

        res.status(200).json(enrichedCircles);
    } catch (err) {
        console.error('[circleController] getCircles error:', err.message);
        res.status(500).json({ message: 'Failed to fetch circles' });
    }
};

/**
 * POST /api/alumni/circles
 * Create a new circle
 */
exports.createCircle = async (req, res) => {
    try {
        const { name, description, category } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Circle name is required' });
        }

        const circle = await Circle.create({
            name,
            description,
            category,
            createdBy: req.user.id,
            members: [req.user.id] // Creator is the first member
        });

        res.status(201).json(circle);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'A circle with this name already exists' });
        }
        res.status(500).json({ message: 'Failed to create circle' });
    }
};

/**
 * POST /api/alumni/circles/:id/join
 * Join or leave a circle
 */
exports.toggleJoinCircle = async (req, res) => {
    try {
        const circle = await Circle.findById(req.params.id);
        if (!circle) {
            return res.status(404).json({ message: 'Circle not found' });
        }

        const userId = req.user.id;
        const index = circle.members.indexOf(userId);

        if (index === -1) {
            // Join
            circle.members.push(userId);
        } else {
            // Leave
            circle.members.splice(index, 1);
        }

        await circle.save();
        res.status(200).json({
            isJoined: index === -1,
            memberCount: circle.members.length
        });
    } catch (err) {
        res.status(500).json({ message: 'Action failed' });
    }
};
