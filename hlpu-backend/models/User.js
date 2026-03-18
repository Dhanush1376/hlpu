const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: 6,
            select: false
        },
        role: {
            type: String,
            enum: ['student', 'alumni', 'admin', 'recruiter'],
            default: 'student'
        },

        phoneNumber: {
            type: String,
            trim: true
        },
        regNo: {
            type: String,
            trim: true
        },
        batch: {
            type: String,
            trim: true
        },
        year: {
            type: Number,
            min: 1,
            max: 4,
            index: true
        },
        stream: {
            type: String,
            trim: true,
            index: true
        },
        department: { // Mapping to "Program" in UI
            type: String,
            trim: true,
            index: true
        },
        specialization: {
            type: String,
            trim: true
        },
        graduationYear: {
            type: Number,
            index: true
        },
        yearsOfExperience: {
            type: Number,
            default: 0
        },
        currentRole: {
            type: String,
            trim: true
        },
        preferenceProfile: {
            primaryStream: String,
            relatedStreams: [String],
            inferredDomains: [String],
            skillVector: {
                type: Map,
                of: Number,
                default: {}
            },
            recommendationWeights: {
                type: Map,
                of: Number,
                default: {
                    stream: 0.5,
                    skills: 0.3,
                    recency: 0.2
                }
            },
            allowCrossStream: {
                type: Boolean,
                default: true
            }
        },
        company: {
            type: String,
            trim: true
        },
        profilePic: {
            type: String
        },
        interviewExpertise: {
            primaryArea: String,
            topics: [String],
            otherTopics: String,
            availability: String
        },
        title: {
            type: String,
            trim: true
        },
        university: {
            type: String,
            trim: true
        },
        about: {
            type: String,
            trim: true
        },
        skills: [{
            type: String,
            trim: true
        }],
        education: [{
            degree: String,
            institution: String,
            period: String,
            gpa: String,
            scholarship: String
        }],
        experience: [{
            title: String,
            company: String,
            period: String,
            description: String
        }],
        projects: [{
            title: String,
            description: String,
            technologies: [String],
            link: String
        }],
        contact: {
            phone: String,
            linkedin: String,
            github: String,
            portfolio: String,
            website: String,
            location: String
        },
        profilePicture: {
            type: String
        },
        resumeTemplate: {
            type: String,
            default: 'modern'
        },
        professionalBadges: [{
            type: String,
            trim: true
        }],
        achievements: [{
            title: String,
            issuer: String,
            date: String
        }],
        mentorship: [{
            role: String,
            organization: String,
            period: String,
            description: String
        }],
        stats: {
            mentees: { type: Number, default: 0 },
            opportunities: { type: Number, default: 0 },
            events: { type: Number, default: 0 }
        },
        isMentorAvailable: {
            type: Boolean,
            default: false,
            index: true
        },
        maxMentees: {
            type: Number,
            default: 5
        },
        currentMentees: {
            type: Number,
            default: 0
        },
        settings: {
            notifications: {
                jobAlerts: { type: Boolean, default: true },
                mentorMessages: { type: Boolean, default: true },
                eventReminders: { type: Boolean, default: true },
                applicationUpdates: { type: Boolean, default: true },
                connectionRequests: { type: Boolean, default: true },
                weeklySummary: { type: Boolean, default: false },
                smsAlerts: { type: Boolean, default: false },
                interviewReminders: { type: Boolean, default: true }
            },
            privacy: {
                profileVisibility: { type: String, enum: ['public', 'connections', 'private'], default: 'public' },
                showEmail: { type: Boolean, default: true },
                dataSharing: { type: Boolean, default: true }
            },
            preferences: {
                dashboardView: { type: String, enum: ['standard', 'compact'], default: 'standard' },
                autoSaveForms: { type: Boolean, default: true },
                showOnlineStatus: { type: Boolean, default: true },
                emailDigest: { type: Boolean, default: true }
            },
            security: {
                twoFactorEnabled: { type: Boolean, default: false },
                sessionTimeout: { type: Number, default: 30 }, // in minutes
                loginNotifications: { type: Boolean, default: true }
            },
            adminMetadata: {
                permissions: [String],
                managedSince: { type: Date, default: Date.now }
            }
        },
        careerInsights: {
            placementProbability: { type: Number, min: 0, max: 100 },
            placementBucket: { type: String, enum: ['High Chance', 'Moderate', 'Needs Improvement'] },
            skillGaps: [{ type: String }],
            lastCalculated: { type: Date }
        },
        accountStatus: {
            isActive: { type: Boolean, default: true },
            status: { type: String, default: 'active' }, // unified status field
            deactivatedAt: { type: Date }
        },
        otp: { type: String },
        otpExpires: { type: Date },
        isVerified: {
            type: Boolean,
            default: false,
            index: true
        },
        verificationStatus: {
            type: String,
            enum: ['none', 'pending', 'approved', 'rejected'],
            default: 'none',
            index: true
        },
        resetPasswordToken: String,
        resetPasswordExpire: Date,
        // --- SaaS & MONETIZATION FIELDS ---
        plan: {
            type: String,
            enum: ['free', 'pro_student', 'pro_alumni', 'recruiter', 'enterprise'],
            default: 'free',
            index: true
        },
        planExpiresAt: {
            type: Date
        },
        featuresUnlocked: [{
            type: String,
            trim: true
        }],
        // --- GROWTH FLYWHEEL FIELDS ---
        referralCode: {
            type: String,
            unique: true,
            sparse: true,
            index: true
        },
        referralsCount: {
            type: Number,
            default: 0
        },
        referredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('User', userSchema);
