const mongoose = require('mongoose');

const savedJobSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound unique index — prevents duplicate saves, enables fast lookup
savedJobSchema.index({ user: 1, job: 1 }, { unique: true });

// Descending createdAt for "most recently saved first"
savedJobSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SavedJob', savedJobSchema);
