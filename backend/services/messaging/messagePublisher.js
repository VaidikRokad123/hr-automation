import { randomUUID } from 'crypto';
import { DEFAULT_MESSAGE_QUEUE } from './queueNames.js';
import { getRabbitMQChannel } from './rabbitmqConnection.js';

export async function sendMessage({
    queueName = DEFAULT_MESSAGE_QUEUE,
    type = 'event',
    payload = {},
    persistent = true
} = {}) {
    const channel = await getRabbitMQChannel(queueName);
    const message = {
        id: randomUUID(),
        type,
        queuedAt: new Date().toISOString(),
        payload
    };

    const published = channel.sendToQueue(
        queueName,
        Buffer.from(JSON.stringify(message)),
        { persistent }
    );

    await channel.close();

    return {
        queueName,
        published,
        message
    };
}