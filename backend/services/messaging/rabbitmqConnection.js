import amqp from 'amqplib';

let connectionPromise = null;

export function isRabbitMQEnabled() {
    const enabled = String(process.env.RABBITMQ_ENABLED || '').trim().toLowerCase();
    if (['false', '0', 'off', 'no'].includes(enabled)) {
        return false;
    }

    return Boolean(process.env.RABBITMQ_URL);
}

export function getRabbitMQUrl() {
    return process.env.RABBITMQ_URL;
}

async function createConnection() {
    if (!isRabbitMQEnabled()) {
        throw new Error('RabbitMQ is disabled. Set RABBITMQ_ENABLED=true and RABBITMQ_URL to enable queue-backed notifications.');
    }

    const connection = await amqp.connect(getRabbitMQUrl());

    connection.once('close', () => {
        connectionPromise = null;
    });

    connection.once('error', () => {
        connectionPromise = null;
    });

    return connection;
}

export async function getRabbitMQConnection() {
    if (!connectionPromise) {
        connectionPromise = createConnection();
    }

    return connectionPromise;
}

export async function getRabbitMQChannel(queueName) {
    const connection = await getRabbitMQConnection();
    const channel = await connection.createChannel();

    await channel.assertQueue(queueName, { durable: true });

    return channel;
}

export async function closeRabbitMQConnection() {
    if (!connectionPromise) {
        return;
    }

    const connection = await connectionPromise;
    connectionPromise = null;
    await connection.close();
}
