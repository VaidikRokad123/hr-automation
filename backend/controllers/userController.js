import User from '../models/userModel.js';
import { ROLE_CEO, ROLE_HR, ROLE_WORKER } from '../constants/roles.js';
import { sanitizeUser } from '../utils/sanitizeUser.js';

export async function getMe(req, res) {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.json({ success: true, user: sanitizeUser(user) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to load user profile', error: error.message });
    }
}

export async function getWorkers(req, res) {
    try {
        if (![ROLE_CEO, ROLE_HR].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'You do not have permission to access this resource' });
        }

        const workers = await User.find({ role: ROLE_WORKER }).sort({ createdAt: 1 });

        return res.json({
            success: true,
            workers: workers.map(sanitizeUser)
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to load workers', error: error.message });
    }
}

export async function updateWorkerResume(req, res) {
    try {
        if (![ROLE_CEO, ROLE_HR].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'You do not have permission to access this resource' });
        }

        const worker = await User.findOne({ _id: req.params.id, role: ROLE_WORKER });

        if (!worker) {
            return res.status(404).json({ success: false, message: 'Worker not found' });
        }

        worker.resume = {
            summary: req.body.summary || '',
            skills: Array.isArray(req.body.skills) ? req.body.skills : [],
            experience: req.body.experience || '',
            education: req.body.education || '',
            resumeUrl: req.body.resumeUrl || '',
            updatedAt: new Date()
        };

        await worker.save();

        return res.json({ success: true, worker: sanitizeUser(worker) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update resume', error: error.message });
    }
}
