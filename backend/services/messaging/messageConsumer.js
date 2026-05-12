import { DEFAULT_MESSAGE_QUEUE } from './queueNames.js';
import { getRabbitMQChannel } from './rabbitmqConnection.js';

export async function consumeMessages({
    queueName = DEFAULT_MESSAGE_QUEUE,
    prefetch = Number(process.env.RABBITMQ_PREFETCH || 10),
    onMessage = async () => {}
} = {}) {
    const channel = await getRabbitMQChannel(queueName);

    await channel.prefetch(prefetch);

    await channel.consume(queueName, async (message) => {
        if (!message) {
            return;
        }

        try {
            const payload = JSON.parse(message.content.toString('utf8'));
            await onMessage(payload, message);
            channel.ack(message);
        } catch (error) {
            console.error(`RabbitMQ consumer error for ${queueName}:`, error.message);
            channel.nack(message, false, false);
        }
    });

    return { queueName, channel };
}