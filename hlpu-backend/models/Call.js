const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
        },
        caller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['audio', 'video'],
            default: 'video',
        },
        status: {
            type: String,
            enum: ['missed', 'completed', 'declined', 'ongoing'],
            default: 'ongoing',
        },
        startedAt: {
            type: Date,
            default: Date.now,
        },
        endedAt: {
            type: Date,
        },
        duration: {
            type: Number, // seconds
        }
    },
    { timestamps: true }
);

callSchema.index({ conversationId: 1 });
callSchema.index({ caller: 1 });
callSchema.index({ receiver: 1 });

module.exports = mongoose.model('Call', callSchema);
