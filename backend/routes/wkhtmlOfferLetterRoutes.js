import express from 'express';
import { generateOfferLetter } from '../controllers/wkhtmlOfferLetterController.js';

const router = express.Router();

router.post('/generate', generateOfferLetter);

export default router;
