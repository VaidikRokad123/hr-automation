import express from 'express';
import { getMe, getWorkers, updateWorkerResume } from '../controllers/userController.js';

const router = express.Router();

router.get('/me', getMe);

router.get('/workers', getWorkers);

router.patch('/workers/:id/resume', updateWorkerResume);

export default router;
