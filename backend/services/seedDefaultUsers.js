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

    const workerSeeds = [
        {
            name: 'Aarav Patel',
            email: 'aarav.patel@hrsystem.local',
            summary: 'Frontend developer focused on clean UI and component systems.',
            skills: ['React', 'CSS', 'UI Design'],
            experience: '2 years building internal dashboards.',
            education: 'BSc Computer Science'
        },
        {
            name: 'Meera Shah',
            email: 'meera.shah@hrsystem.local',
            summary: 'QA analyst with strong attention to process and regression coverage.',
            skills: ['Testing', 'Automation', 'Documentation'],
            experience: '3 years in software quality assurance.',
            education: 'BTech Information Technology'
        },
        {
            name: 'Rohan Desai',
            email: 'rohan.desai@hrsystem.local',
            summary: 'Backend developer working on APIs and data workflows.',
            skills: ['Node.js', 'MongoDB', 'API Design'],
            experience: '4 years in backend engineering.',
            education: 'MCA'
        },
        {
            name: 'Isha Mehta',
            email: 'isha.mehta@hrsystem.local',
            summary: 'Operations associate supporting coordination and reporting.',
            skills: ['Operations', 'Excel', 'Planning'],
            experience: '2 years in operations support.',
            education: 'MBA'
        },
        {
            name: 'Karan Joshi',
            email: 'karan.joshi@hrsystem.local',
            summary: 'Support engineer assisting internal users and system checks.',
            skills: ['Support', 'Troubleshooting', 'Communication'],
            experience: '1 year in technical support.',
            education: 'BSc Information Technology'
        }
    ];

    for (const workerSeed of workerSeeds) {
        await createUserIfMissing(
            {
                name: workerSeed.name,
                email: workerSeed.email,
                role: ROLE_WORKER,
                resume: {
                    summary: workerSeed.summary,
                    skills: workerSeed.skills,
                    experience: workerSeed.experience,
                    education: workerSeed.education,
                    updatedAt: now
                }
            },
            hashedPassword
        );
    }
}