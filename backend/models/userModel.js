import mongoose from 'mongoose';
import { ROLE_CEO, ROLE_HR, ROLE_WORKER } from '../constants/roles.js';

const resumeSchema = new mongoose.Schema(
    {
        summary: { type: String, default: '' },
        skills: { type: [String], default: [] },
        experience: { type: String, default: '' },
        education: { type: String, default: '' },
        resumeUrl: { type: String, default: '' },
        updatedAt: { type: Date, default: Date.now }
    },
    { _id: false }
);

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        role: {
            type: String,
            enum: [ROLE_CEO, ROLE_HR, ROLE_WORKER],
            default: ROLE_WORKER,
            required: true
        },
        onboardingStatus: {
            type: String,
            enum: ['not_started', 'contract_sent', 'contract_viewed', 'contract_accepted'],
            default: 'not_started'
        },
        resume: { type: resumeSchema, default: () => ({}) }
    },
    { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
