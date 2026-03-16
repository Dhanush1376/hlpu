const mongoose = require('mongoose');

const mentorRequestSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Student is required'],
        },
        alumni: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        message: {
            type: String,
            required: [true, 'Message is required'],
            trim: true,
        },
        preferredDomain: {
            type: String,
            required: [true, 'Preferred domain is required'],
            trim: true,
        },
        preferredMode: {
            type: String,
            enum: ['Chat', 'Video Call', 'In-person'],
            required: [true, 'Preferred mode is required'],
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
            default: 'pending',
        },
        priorityScore: {
            type: Number,
            default: 0,
            index: true
        },
        meetingLink: {
            type: String,
            trim: true,
        },
        rejectedBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: false }
);

// Indexes
mentorRequestSchema.index({ alumni: 1, status: 1 });
mentorRequestSchema.index({ student: 1, status: 1 });
mentorRequestSchema.index({ createdAt: -1 });
mentorRequestSchema.index({ priorityScore: -1 });

module.exports = mongoose.model('MentorRequest', mentorRequestSchema);
