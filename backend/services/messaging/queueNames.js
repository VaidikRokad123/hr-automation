export const DEFAULT_MESSAGE_QUEUE = process.env.RABBITMQ_QUEUE_NAME || 'hr.notifications';
export const BROADCAST_EXCHANGE    = process.env.RABBITMQ_BROADCAST_EXCHANGE || 'hr.broadcast';