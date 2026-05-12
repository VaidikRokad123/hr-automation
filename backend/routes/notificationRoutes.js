import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { ROLE_CEO, ROLE_HR } from '../constants/roles.js';
import {
    createNotification,
    getNotifications,
    broadcastNotification,
    getMyNotifications,
    markAsRead,
    markAllRead
} from '../controllers/notificationController.js';

const router = express.Router();

// ─── existing routes (kept intact) ──────────────────────────────────────────
router.post('/newNotification', authenticateToken, authorizeRoles(ROLE_CEO, ROLE_HR), createNotification);
router.get('/', authenticateToken, getNotifications);

// ─── broadcast — CEO & HR only ───────────────────────────────────────────────
router.post('/broadcast', authenticateToken, authorizeRoles(ROLE_CEO, ROLE_HR), broadcastNotification);

// ─── per-user read — any authenticated user ──────────────────────────────────
router.get('/my', authenticateToken, getMyNotifications);
router.patch('/read-all', authenticateToken, markAllRead);      // before :id route
router.patch('/:id/read', authenticateToken, markAsRead);

export default router;
