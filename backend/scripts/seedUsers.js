import 'dotenv/config';
import mongoose from 'mongoose';
import { seedDefaultUsers } from '../services/seedDefaultUsers.js';

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017', {
            dbName: process.env.MONGODB_DB_NAME || 'hr_management',
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
        });

        await seedDefaultUsers();
        console.log('Default users seeded');
    } catch (error) {
        console.error('Failed to seed users:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

seed();