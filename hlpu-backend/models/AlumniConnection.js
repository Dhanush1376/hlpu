const mongoose = require('mongoose');

const alumniConnectionSchema = new mongoose.Schema(
    {
        requester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending',
            index: true
        }
    },
    {
        timestamps: true
    }
);

// Unique compound index to prevent duplicate connection requests
alumniConnectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Ensure createdAt index for sorting and scaling
alumniConnectionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AlumniConnection', alumniConnectionSchema);
