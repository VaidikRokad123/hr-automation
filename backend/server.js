import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import mongoose from 'mongoose';

import offerLetterRoutes from './routes/offerLetterRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import contractRoutes from './routes/contractRoutes.js';
import { authenticateToken, authorizeRoles } from './middleware/authMiddleware.js';
import { ROLE_CEO, ROLE_HR } from './constants/roles.js';
import { seedDefaultUsers } from './services/seedDefaultUsers.js';
import { startBroadcastConsumer } from './services/messaging/broadcastConsumer.js';
import { isRabbitMQEnabled } from './services/messaging/rabbitmqConnection.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';

function parseTrustProxy(value) {
    if (value === undefined) {
        return 'loopback';
    }

    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'false' || normalized === '0' || normalized === 'off') {
        return false;
    }

    if (normalized === 'true' || normalized === '1' || normalized === 'on') {
        return 1;
    }

    const hopCount = Number(normalized);
    return Number.isInteger(hopCount) && hopCount > 0 ? hopCount : value;
}

function requireDatabase(req, res, next) {
    if (!req.app.locals.dbReady) {
        return res.status(503).json({
            success: false,
            message: 'Database is not available right now. The backend is running in degraded mode.'
        });
    }

    next();
}

// Middleware
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
app.use(helmet({
    crossOriginResourcePolicy: false,
    xFrameOptions: false
}));
app.use(cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '15mb' }));
app.use(express.static('public'));

// VERY IMPORTANT
app.use(
    '/GeneratedOfferLetter',
    (req, res, next) => {
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
        res.removeHeader('X-Frame-Options');
        res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${frontendUrl}`);
        next();
    },
    express.static(
        path.join(
            process.cwd(),
            'GeneratedOfferLetter'
        )
    )
);

// Routes
app.use('/api/auth', requireDatabase, authRoutes);
app.use('/api/users', requireDatabase, authenticateToken, userRoutes);
app.use('/api/offerletter', authenticateToken, authorizeRoles(ROLE_CEO, ROLE_HR), offerLetterRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/contracts', requireDatabase, contractRoutes);

app.get('/', (req, res) => {
    res.json({
        message: 'HR Management API is running',
        databaseReady: Boolean(req.app.locals.dbReady)
    });
});

async function startServer() {
    app.locals.dbReady = false;

    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            dbName: process.env.MONGODB_DB_NAME || 'hr_management',
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
        });

        console.log('Seeding default users...');
        await seedDefaultUsers();
        app.locals.dbReady = true;

        if (isRabbitMQEnabled()) {
            try {
                await startBroadcastConsumer();
            } catch (err) {
                console.warn('RabbitMQ unavailable - broadcast notifications will use MongoDB fallback:', err.message);
            }
        } else {
            console.log('RabbitMQ disabled - notifications will use MongoDB fallback. Set RABBITMQ_URL to enable it.');
        }

        app.listen(PORT, () => {
            console.log(`Connected to MongoDB: ${process.env.MONGODB_DB_NAME || 'hr_management'}`);
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('MongoDB unavailable, starting backend in degraded mode:', error.message);

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT} (database disabled)`);
        });
    }
}

startServer();
