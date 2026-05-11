import bcrypt from 'bcryptjs';
import User from '../models/userModel.js';
import { ROLE_CEO, ROLE_HR, ROLE_WORKER } from '../constants/roles.js';

async function createUserIfMissing({ name, email, role, resume }, hashedPassword) {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        return;
    }

    await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        resume
    });
}

export async function seedDefaultUsers() {
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const now = new Date();

    await createUserIfMissing(
        {
            name: 'Chief Executive Officer',
            email: 'ceo@hrsystem.local',
            role: ROLE_CEO,
            resume: {
                summary: 'Executive oversight for the HR management system.',
                skills: ['Leadership', 'Strategy', 'Operations'],
                experience: '12+ years in operations and leadership.',
                education: 'MBA',
                updatedAt: now
            }
        },
        hashedPassword
    );

    await createUserIfMissing(
        {
            name: 'Human Resources',
            email: 'hr@hrsystem.local',
            role: ROLE_HR,
            resume: {
                summary: 'Manages workers, offer letters, and candidate workflows.\n',
                skills: ['Recruitment', 'Onboarding', 'Documentation'],
                experience: '8+ years in HR operations.',
                education: 'HR Management',
                updatedAt: now
            }
        },
        hashedPassword
    );

    await createUserIfMissing(
        {
            name: 'Worker User',
            email: 'worker@hrsystem.local',
            role: ROLE_WORKER,
            resume: {
                summary: 'Entry-level team member.',
                skills: ['Communication', 'Teamwork'],
                experience: 'Fresh candidate profile.',
                education: 'Bachelor degree',
                updatedAt: now
            }
        },
        hashedPassword
    );
}