const mongoose = require('mongoose');

const verificationRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    regNo: {
        type: String,
        required: true,
        trim: true
    },
    passoutYear: {
        type: Number,
        required: true
    },
    proofUrl: {
        type: String, // URL to LinkedIn profile or ID card image
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectionReason: {
        type: String,
        trim: true
    },
    reviewedAt: {
        type: Date
    }
}, { timestamps: true });

// Ensure a user can only have one pending request
verificationRequestSchema.index({ user: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

verificationRequestSchema.index({ status: 1 });
verificationRequestSchema.index({ user: 1 });
verificationRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('VerificationRequest', verificationRequestSchema);
