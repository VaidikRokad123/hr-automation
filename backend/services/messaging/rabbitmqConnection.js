import amqp from 'amqplib';

const DEFAULT_RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://127.0.0.1';

let connectionPromise = null;

async function createConnection() {
    const connection = await amqp.connect(DEFAULT_RABBITMQ_URL);

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