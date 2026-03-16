const mongoose = require('mongoose');

const launchProjectSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Project title is required'],
            trim: true
        },
        description: {
            type: String,
            required: [true, 'Project description is required'],
            trim: true
        },
        domain: {
            type: String,
            required: [true, 'Domain is required'],
            trim: true,
            index: true
        },
        projectType: {
            type: String,
            enum: ['idea', 'prototype', 'startup', 'research'],
            required: [true, 'Project type is required'],
            index: true
        },
        skillsRequired: [{
            type: String,
            trim: true
        }],
        teamSizeNeeded: {
            type: Number,
            default: 1
        },
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ['open', 'closed'],
            default: 'open',
            index: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
        isApproved: {
            type: Boolean,
            default: false,
            index: true
        },
        // --- Startup Incubation Dashboard Extensions ---
        stage: {
            type: String,
            enum: [
                'idea_submitted',
                'under_review',
                'shortlisted',
                'mentor_assigned',
                'incubating',
                'investor_ready',
                'funded',
                'graduated',
                'rejected'
            ],
            default: 'idea_submitted',
            index: true
        },
        evaluation: {
            innovationScore: { type: Number, default: 0 },
            marketSize: { type: Number, default: 0 },
            technicalFeasibility: { type: Number, default: 0 },
            teamStrength: { type: Number, default: 0 },
            problemClarity: { type: Number, default: 0 },
            scalability: { type: Number, default: 0 },
            startupScore: { type: Number, default: 0, index: true },
            adminFeedback: String
        },
        team: [{
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            role: { type: String, default: 'Member' },
            joinedAt: { type: Date, default: Date.now }
        }],
        investorReadiness: {
            pitchDeckUploaded: { type: Boolean, default: false },
            tractionMetrics: { type: Boolean, default: false },
            revenueModel: { type: Boolean, default: false },
            teamComplete: { type: Boolean, default: false },
            mvpReady: { type: Boolean, default: false },
            readinessScore: { type: Number, default: 0, index: true }
        },
        milestones: [{
            title: String,
            description: String,
            targetDate: Date,
            status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
            completedAt: Date
        }],
        mentor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            index: true
        },
        startupPitchDeck: String
    },
    {
        timestamps: true
    }
);

// Indexes for performance
launchProjectSchema.index({ createdAt: -1 });

module.exports = mongoose.model('LaunchProject', launchProjectSchema);
