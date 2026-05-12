import express from 'express';
import rateLimit from 'express-rate-limit';
import { ROLE_CEO, ROLE_HR } from '../constants/roles.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import {
    acceptCurrentContract,
    exchangeContractToken,
    generateContractTemplate,
    getCurrentContract,
    resendContractOtp,
    sendContract,
    verifyContractOtp
} from '../controllers/contractController.js';

const router = express.Router();

const publicContractLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/template', authenticateToken, authorizeRoles(ROLE_CEO, ROLE_HR), generateContractTemplate);
router.post('/send', authenticateToken, authorizeRoles(ROLE_CEO, ROLE_HR), sendContract);

router.use('/session', publicContractLimiter);
router.post('/session/exchange', exchangeContractToken);
router.post('/session/resend-otp', resendContractOtp);
router.post('/session/verify-otp', verifyContractOtp);

router.use('/current', publicContractLimiter);
router.get('/current/data', getCurrentContract);
router.post('/current/accept', acceptCurrentContract);

export default router;
