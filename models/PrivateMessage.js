const mongoose = require('mongoose');

const privateMessageSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        default: 'text',
        enum: ['text', 'image', 'file', 'audio']
    },
    fileName: {
        type: String
    },
    isRead: {
        type: Boolean,
        default: false
    },
    edited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    },
    conversationId: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Index for faster queries
privateMessageSchema.index({ conversationId: 1, createdAt: 1 });
privateMessageSchema.index({ to: 1, isRead: 1 });

module.exports = mongoose.model('PrivateMessage', privateMessageSchema); 