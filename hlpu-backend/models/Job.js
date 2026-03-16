const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
    {
        title: { type: String, required: [true, 'Job title is required'], trim: true },
        company: { type: String, required: [true, 'Company name is required'], trim: true },
        companyName: { type: String }, // Made optional to fix validation on existing jobs
        companyLogo: { type: String },
        description: { type: String, required: [true, 'Job description is required'] },
        department: { type: String, trim: true },
        experienceLevel: {
            type: String,
            enum: ['No Experience', '0-1 Years', '1-3 Years', '3+ Years'],
            default: 'No Experience'
        },
        jobType: {
            type: String,
            enum: ['Full Time', 'Part Time', 'Internship', 'Contract', 'Full-time', 'full-time', 'internship', 'part-time', 'Mentorship'],
            required: true
        },
        workMode: {
            type: String,
            enum: ['Remote', 'Hybrid', 'Onsite'],
            required: true,
            default: 'Onsite'
        },
        location: { type: String, trim: true },
        skills: [{ type: String }],
        tags: [{ type: String }], // e.g., Undergraduate, Campus Ambassador
        salaryMin: Number,
        salaryMax: Number,
        salaryPeriod: {
            type: String,
            enum: ['Month', 'Year', 'Hour'],
            default: 'Month'
        },
        deadline: { type: Date },
        applicationDeadline: { type: Date }, // Support both for compatibility
        status: {
            type: String,
            enum: ['draft', 'active', 'paused', 'closed', 'expired'],
            default: 'active',
            index: true
        },
        expiresAt: { type: Date, index: true },
        link: { type: String, trim: true },
        postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        applicants: [{
            student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

            status: {
                type: String,
                enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
                default: 'pending'
            },
            appliedAt: { type: Date, default: Date.now }
        }],

        createdAt: { type: Date, default: Date.now },

        moderation: {
            flags: [{
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                reason: String,
                createdAt: { type: Date, default: Date.now }
            }],
            reviewStatus: {
                type: String,
                enum: ['pending', 'approved', 'rejected', 'flagged'],
                default: 'pending'
            },
            adminNote: String
        }
    },
    { timestamps: false }
);

// Indexes for common queries
jobSchema.index({ title: 'text', company: 'text', companyName: 'text' });
jobSchema.index({ postedBy: 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ workMode: 1 }); // New index
jobSchema.index({ location: 1 }); // New index
jobSchema.index({ department: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ applicationDeadline: 1 });


jobSchema.index({ 'moderation.reviewStatus': 1 });
jobSchema.index({ 'moderation.flags.user': 1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ 'applicants.student': 1 });
jobSchema.index({ experienceLevel: 1 });
jobSchema.index({ status: 1, expiresAt: 1 });
jobSchema.index({ 'applicants.status': 1 });

module.exports = mongoose.model('Job', jobSchema);
