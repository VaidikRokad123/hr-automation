import { randomUUID } from 'crypto';
import { BROADCAST_EXCHANGE } from './queueNames.js';
import { getRabbitMQConnection } from './rabbitmqConnection.js';

/**
 * Publish a message to the hr.broadcast fanout exchange.
 * Every queue bound to this exchange receives a copy — true broadcast.
 */
export async function publishBroadcast({
    type = 'broadcast',
    payload = {},
    persistent = true
} = {}) {
    const connection = await getRabbitMQConnection();
    const channel = await connection.createChannel();

    await channel.assertExchange(BROADCAST_EXCHANGE, 'fanout', { durable: true });

    const message = {
        id: randomUUID(),
        type,
        exchange: BROADCAST_EXCHANGE,
        queuedAt: new Date().toISOString(),
        payload
    };

    channel.publish(
        BROADCAST_EXCHANGE,
        '', // fanout ignores routing key
        Buffer.from(JSON.stringify(message)),
        { persistent }
    );

    await channel.close();

    return { exchange: BROADCAST_EXCHANGE, message };
}
