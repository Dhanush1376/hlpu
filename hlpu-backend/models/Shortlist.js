const mongoose = require('mongoose');

const shortlistSchema = new mongoose.Schema({
    recruiter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Recruiter ID is required']
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student ID is required']
    },
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
    },
    status: {
        type: String,
        enum: ['shortlisted', 'rejected'],
        default: 'shortlisted'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to prevent duplicate shortlisting for the same job/recruiter
shortlistSchema.index({ recruiter: 1, student: 1, job: 1 }, { unique: true });

module.exports = mongoose.model('Shortlist', shortlistSchema);
