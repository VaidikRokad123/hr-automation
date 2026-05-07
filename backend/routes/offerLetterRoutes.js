import express from 'express';
import { generateOfferLetter, getOfferLetterData, compileOfferLetter } from '../controllers/wkhtmlOfferLetterController.js';

const router = express.Router();

router.post('/generate', generateOfferLetter);
router.get('/data', getOfferLetterData);
router.post('/compile', compileOfferLetter);

export default router;
