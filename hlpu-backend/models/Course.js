const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Course title is required'],
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    summaryLine: {
        type: String,
        required: [true, 'Summary line is required'],
        trim: true,
        maxLength: 150
    },
    description: {
        type: String,
        required: [true, 'Detailed description is required']
    },
    category: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    skillsRequired: [{
        type: String,
        trim: true
    }],
    jobRoles: [{
        type: String,
        trim: true
    }],
    topCompanies: [{
        type: String,
        trim: true
    }],
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        required: true,
        index: true
    },
    durationEstimate: {
        type: String,
        required: true
    },
    eligibleYears: {
        type: [Number],
        validate: {
            validator: function (val) {
                return val.length > 0;
            },
            message: 'At least one eligible year is required'
        },
        index: true
    },
    roadmapPdfUrl: {
        type: String
    },
    isTrending: {
        type: Boolean,
        default: false,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    // Analytics
    viewCount: {
        type: Number,
        default: 0
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    // Future-Ready Hooks
    alumniEndorsementsCount: {
        type: Number,
        default: 0
    },
    aiRecommendedScore: {
        type: Number,
        default: 0
    },
    prerequisiteCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Compound index for search and filtering
courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ category: 1, skillsRequired: 1 }); // Intelligence ranking index

module.exports = mongoose.model('Course', courseSchema);
