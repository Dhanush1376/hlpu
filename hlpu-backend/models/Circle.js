const mongoose = require('mongoose');

const circleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Circle name is required'],
        trim: true,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        enum: ['Tech', 'Startup', 'Design', 'Career', 'Entrepreneurship', 'Research', 'Other'],
        default: 'Tech'
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    memberCount: {
        type: Number,
        default: 0
    },
    postCount: {
        type: Number,
        default: 0
    },
    activeCount: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Middleware to keep memberCount updated
circleSchema.pre('save', function (next) {
    if (this.members) {
        this.memberCount = this.members.length;
    }
    next();
});

module.exports = mongoose.model('Circle', circleSchema);
