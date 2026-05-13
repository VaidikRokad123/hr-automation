import { sendMessage } from '../services/messaging/messagePublisher.js';
import { publishBroadcast } from '../services/messaging/broadcastPublisher.js';
import { isRabbitMQEnabled } from '../services/messaging/rabbitmqConnection.js';
import { DEFAULT_MESSAGE_QUEUE } from '../services/messaging/queueNames.js';
import Notification from '../models/notificationModel.js';
import User from '../models/userModel.js';

const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

// ─── helpers ────────────────────────────────────────────────────────────────

function validateBroadcastBody({ title, message, priority }) {
    if (!title || typeof title !== 'string' || !title.trim()) {
        return 'title is required';
    }
    if (title.trim().length > 120) {
        return 'title must be 120 characters or fewer';
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
        return 'message is required';
    }
    if (message.trim().length > 2000) {
        return 'message must be 2000 characters or fewer';
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
        return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
    }
    return null;
}

/**
 * Directly persist a broadcast to every user in MongoDB.
 * Used as a fallback when RabbitMQ is unavailable.
 */
async function saveBroadcastDirectly({ title, message, priority, metadata, senderId, sentAt }) {
    const users = await User.find({}, '_id').lean();
    if (!users.length) return { count: 0, via: 'db-direct' };

    const docs = users.map((u) => ({
        title,
        message,
        type: 'broadcast',
        priority: priority || 'normal',
        recipient: u._id,
        sentBy: senderId || null,
        sentAt: sentAt ? new Date(sentAt) : new Date(),
        metadata: metadata || {},
        readAt: null
    }));

    await Notification.insertMany(docs, { ordered: false });
    return { count: docs.length, via: 'db-direct' };
}

// ─── existing handlers (kept intact) ────────────────────────────────────────

export async function createNotification(req, res) {
    try {
        if (!isRabbitMQEnabled()) {
            return res.status(503).json({
                success: false,
                message: 'Queue notifications are disabled. Set RABBITMQ_ENABLED=true and RABBITMQ_URL to enable RabbitMQ.'
            });
        }

        const { title, message, recipientId, metadata = {} } = req.body || {};

        if (!title && !message) {
            return res.status(400).json({
                success: false,
                message: 'Title or message is required'
            });
        }

        const result = await sendMessage({
            queueName: DEFAULT_MESSAGE_QUEUE,
            type: 'notification',
            payload: {
                title,
                message,
                recipientId,
                metadata,
                createdBy: req.user?.userId || req.user?._id || null
            }
        });

        return res.status(202).json({
            success: true,
            message: 'Notification queued successfully',
            data: {
                queueName: result.queueName,
                messageId: result.message.id
            }
        });
    } catch (error) {
        return res.status(503).json({
            success: false,
            message: 'Failed to queue notification',
            error: error.message
        });
    }
}

export function getNotifications(req, res) {
    return res.json({
        success: true,
        message: 'Notification queue is configured',
        queueName: DEFAULT_MESSAGE_QUEUE,
        rabbitmqEnabled: isRabbitMQEnabled()
    });
}

// ─── broadcast ───────────────────────────────────────────────────────────────

/**
 * POST /api/notifications/broadcast
 * CEO / HR only.
 * Strategy:
 *   1. Try to publish via RabbitMQ fanout (consumer will persist to DB)
 *   2. If RabbitMQ is unavailable → save directly to MongoDB as fallback
 */
export async function broadcastNotification(req, res) {
    const {
        title,
        message,
        priority = 'normal',
        metadata = {}
    } = req.body || {};

    const validationError = validateBroadcastBody({ title, message, priority });
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }

    const senderId = req.user?.userId || req.user?._id || null;
    const sentAt   = new Date().toISOString();
    const payload  = {
        title:    title.trim(),
        message:  message.trim(),
        priority,
        metadata,
        sentBy:   senderId,
        sentAt
    };

    // 1️⃣ Try RabbitMQ first
    if (isRabbitMQEnabled()) {
        try {
            const result = await publishBroadcast({ type: 'broadcast', payload });
            return res.status(202).json({
                success: true,
                message: 'Notification broadcast queued via RabbitMQ',
                data: {
                    via:       'rabbitmq',
                    exchange:  result.exchange,
                    messageId: result.message.id,
                    sentAt
                }
            });
        } catch (mqErr) {
            console.warn('[broadcastNotification] RabbitMQ unavailable, falling back to DB direct:', mqErr.message);
        }
    }

    // 2️⃣ Fallback: write straight to MongoDB
    try {
        const { count } = await saveBroadcastDirectly({ ...payload, senderId });
        return res.status(202).json({
            success: true,
            message: `Notification delivered directly to ${count} member(s) (RabbitMQ disabled or offline)`,
            data: {
                via:    'db-direct',
                count,
                sentAt
            }
        });
    } catch (dbErr) {
        console.error('[broadcastNotification] DB fallback also failed:', dbErr.message);
        return res.status(503).json({
            success: false,
            message: 'Failed to broadcast notification — both RabbitMQ and database are unavailable',
            error: dbErr.message
        });
    }
}

// ─── per-user read endpoints ──────────────────────────────────────────────────

/**
 * GET /api/notifications/my?page=1&limit=20&unreadOnly=false
 * Returns the calling user's notifications, newest first.
 */
export async function getMyNotifications(req, res) {
    try {
        const userId = req.user?.userId || req.user?._id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const unreadOnly = req.query.unreadOnly === 'true';

        const filter = { recipient: userId };
        if (unreadOnly) filter.readAt = null;

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(filter)
                .sort({ sentAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('sentBy', 'name role')
                .lean(),
            Notification.countDocuments(filter),
            Notification.countDocuments({ recipient: userId, readAt: null })
        ]);

        return res.json({
            success: true,
            data: {
                notifications,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                },
                unreadCount
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
}

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read for the calling user.
 */
export async function markAsRead(req, res) {
    try {
        const userId = req.user?.userId || req.user?._id;
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: userId, readAt: null },
            { $set: { readAt: new Date() } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found or already read'
            });
        }

        return res.json({ success: true, data: notification });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error.message
        });
    }
}

/**
 * PATCH /api/notifications/read-all
 * Mark all unread notifications for the calling user as read.
 */
export async function markAllRead(req, res) {
    try {
        const userId = req.user?.userId || req.user?._id;
        const result = await Notification.updateMany(
            { recipient: userId, readAt: null },
            { $set: { readAt: new Date() } }
        );

        return res.json({
            success: true,
            message: `${result.modifiedCount} notification(s) marked as read`
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to mark all as read',
            error: error.message
        });
    }
}
