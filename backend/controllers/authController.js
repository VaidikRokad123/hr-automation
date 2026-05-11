import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { sanitizeUser } from '../utils/sanitizeUser.js';

export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            {
                userId: user._id.toString(),
                email: user.email,
                role: user.role,
                name: user.name
            },
            process.env.JWT_SECRET || 'hr-management-dev-secret',
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        return res.json({
            success: true,
            message: 'Login successful',
            token,
            user: sanitizeUser(user)
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to login', error: error.message });
    }
}
