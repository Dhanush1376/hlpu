const VerificationRequest = require('../models/VerificationRequest');
const CollegeDataset = require('../models/CollegeDataset');
const User = require('../models/User');

/**
 * alumni submits verification details
 */
exports.requestVerification = async (req, res) => {
    try {
        const { regNo, passoutYear, proofUrl } = req.body;

        if (!regNo || !passoutYear) {
            return res.status(400).json({ message: 'Registration number and passout year are required' });
        }

        // 1. Instant Match against Master Database
        const match = await CollegeDataset.findOne({
            regNo: regNo.trim(),
            passoutYear: parseInt(passoutYear)
        });

        if (!match) {
            return res.status(403).json({
                message: 'No matching alumni record found in the college database. Please contact admin if this is an error.'
            });
        }

        // 2. check if request already exists
        const existing = await VerificationRequest.findOne({ user: req.user.id, status: 'pending' });
        if (existing) {
            return res.status(400).json({ message: 'You already have a pending verification request' });
        }

        // 3. Create request
        await VerificationRequest.create({
            user: req.user.id,
            regNo,
            passoutYear,
            proofUrl,
            status: 'pending'
        });

        // 4. Update user status
        await User.findByIdAndUpdate(req.user.id, {
            verificationStatus: 'pending'
        });

        res.status(201).json({
            message: 'Verification request submitted. Status: Pending Admin Review.'
        });
    } catch (err) {
        console.error('[verify] requestVerification error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get current verification status
 */
exports.getVerificationStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('verificationStatus isVerified');
        const request = await VerificationRequest.findOne({ user: req.user.id }).sort({ createdAt: -1 });

        res.json({
            status: user.verificationStatus,
            isVerified: user.isVerified,
            details: request
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
