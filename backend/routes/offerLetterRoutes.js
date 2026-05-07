const express = require('express');
const router = express.Router();
const { generateOfferLetter } = require('../controllers/offerLetterController');

router.post('/generate', generateOfferLetter);

module.exports = router;
