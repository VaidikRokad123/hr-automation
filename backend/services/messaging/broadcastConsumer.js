import { BROADCAST_EXCHANGE } from './queueNames.js';
import { getRabbitMQConnection } from './rabbitmqConnection.js';
import Notification from '../../models/notificationModel.js';
import User from '../../models/userModel.js';
import { ROLE_CEO, ROLE_HR } from '../../constants/roles.js';

let consumerChannel = null;

/**
 * Start the broadcast consumer once at server boot.
 * Binds an exclusive, auto-delete queue to the fanout exchange.
 * For every message received:
 *   1. Fetches all user IDs from MongoDB
 *   2. Upserts a Notification document for each user
 */
export async function startBroadcastConsumer() {
    const connection = await getRabbitMQConnection();
    consumerChannel = await connection.createChannel();

    await consumerChannel.assertExchange(BROADCAST_EXCHANGE, 'fanout', { durable: true });

    // Exclusive + auto-delete: the queue lives only as long as this process
    const { queue } = await consumerChannel.assertQueue('', {
        exclusive: true,
        autoDelete: true
    });

    await consumerChannel.bindQueue(queue, BROADCAST_EXCHANGE, '');

    await consumerChannel.prefetch(Number(process.env.RABBITMQ_PREFETCH) || 10);

    consumerChannel.consume(queue, async (msg) => {
        if (!msg) return;

        try {
            const envelope = JSON.parse(msg.content.toString('utf8'));
            await handleBroadcastMessage(envelope);
            consumerChannel.ack(msg);
        } catch (err) {
            console.error('[BroadcastConsumer] Failed to process message:', err.message);
            consumerChannel.nack(msg, false, false); // dead-letter, do not requeue
        }
    });

    console.log(`[BroadcastConsumer] Listening on exchange "${BROADCAST_EXCHANGE}"`);
    return { exchange: BROADCAST_EXCHANGE, queue };
}

/**
 * Persist the broadcast notification for every user in the system.
 */
async function handleBroadcastMessage(envelope) {
    const { payload } = envelope;

    // Fetch all user IDs — we need to fan out to every member
    const isContractAccepted = payload?.metadata?.type === 'CONTRACT_ACCEPTED';
    const users = await User.find(
        isContractAccepted ? { role: { $in: [ROLE_CEO, ROLE_HR] } } : {},
        '_id'
    ).lean();

    if (!users.length) {
        console.warn('[BroadcastConsumer] No users found — notification not saved');
        return;
    }

    const docs = users.map((u) => ({
        title: payload.title,
        message: payload.message,
        type: 'broadcast',
        priority: payload.priority || 'normal',
        recipient: u._id,
        sentBy: payload.sentBy || null,
        sentAt: payload.sentAt ? new Date(payload.sentAt) : new Date(),
        metadata: payload.metadata || {},
        readAt: null
    }));

    await Notification.insertMany(docs, { ordered: false });

    console.log(
        `[BroadcastConsumer] Saved notification "${payload.title}" for ${docs.length} users`
    );
}

export function stopBroadcastConsumer() {
    if (consumerChannel) {
        consumerChannel.close().catch(() => {});
        consumerChannel = null;
    }
}
