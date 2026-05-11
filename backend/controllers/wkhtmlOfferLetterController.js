import { buildOfferLetterStructuredData } from '../services/offerLetter/offerLetterDataBuilder.js';
import { generatePDFFromData } from '../services/offerLetter/pdfGenerator.js';
import { getLastOfferLetterData, setLastOfferLetterData } from '../services/offerLetter/offerLetterState.js';

function sendOfferLetterError(res, error, fallbackMessage) {
    const message = error?.message || fallbackMessage;
    const statusCode = message === 'Missing required fields' ? 400 : 500;
    return res.status(statusCode).json({
        error: statusCode === 400 ? message : fallbackMessage,
        details: statusCode === 500 ? message : undefined
    });
}

export async function generateOfferLetter(req, res) {
    try {
        const structuredData = buildOfferLetterStructuredData(req.body);
        setLastOfferLetterData(structuredData);

        const pdfUrl = await generatePDFFromData(structuredData);

        return res.status(200).json({
            message: 'Offer letter generated successfully',
            path: pdfUrl,
            data: structuredData
        });
    } catch (error) {
        console.error('Error generating offer letter:', error);
        return sendOfferLetterError(res, error, 'Failed to generate offer letter');
    }
}

export async function getOfferLetterData(req, res) {
    try {
        const lastOfferLetterData = getLastOfferLetterData();
        if (!lastOfferLetterData) {
            return res.status(404).json({
                error: 'No offer letter data found. Please generate an offer letter first.'
            });
        }

        return res.status(200).json({
            success: true,
            data: lastOfferLetterData
        });
    } catch (error) {
        console.error('Error fetching offer letter data:', error);
        return res.status(500).json({
            error: 'Failed to fetch offer letter data',
            details: error.message
        });
    }
}

export async function compileOfferLetter(req, res) {
    try {
        const { pages, metadata } = req.body;

        if (!pages || !Array.isArray(pages)) {
            return res.status(400).json({
                error: 'Invalid data format. Pages array is required.'
            });
        }

        const structuredData = {
            metadata: metadata || getLastOfferLetterData()?.metadata || {},
            pages
        };

        setLastOfferLetterData(structuredData);
        const pdfUrl = await generatePDFFromData(structuredData);

        return res.status(200).json({
            message: 'Offer letter compiled successfully',
            path: pdfUrl,
            data: structuredData
        });
    } catch (error) {
        console.error('Error compiling PDF:', error);
        return res.status(500).json({
            error: 'Failed to compile PDF',
            details: error.message
        });
    }
}
