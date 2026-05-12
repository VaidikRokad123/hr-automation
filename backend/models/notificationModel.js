import mongoose from 'mongoose';

const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const notificationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        },
        type: {
            type: String,
            enum: ['broadcast', 'direct'],
            default: 'broadcast'
        },
        priority: {
            type: String,
            enum: PRIORITIES,
            default: 'normal'
        },
        // The user who receives this notification
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        // The HR/CEO who sent it
        sentBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        sentAt: {
            type: Date,
            default: Date.now
        },
        // Track per-user read status
        readAt: {
            type: Date,
            default: null
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    { timestamps: true }
);

// Fast lookups: "give me all unread for user X, newest first"
notificationSchema.index({ recipient: 1, readAt: 1, sentAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
