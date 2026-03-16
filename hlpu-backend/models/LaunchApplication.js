const mongoose = require('mongoose');

const launchApplicationSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'LaunchProject',
            required: true,
            index: true
        },
        applicant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        message: {
            type: String,
            trim: true
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

// Performance Indexes
launchApplicationSchema.index({ createdAt: -1 });
launchApplicationSchema.index({ updatedAt: -1 });

// Unique index to prevent duplicate applications
launchApplicationSchema.index({ project: 1, applicant: 1 }, { unique: true });

module.exports = mongoose.model('LaunchApplication', launchApplicationSchema);
