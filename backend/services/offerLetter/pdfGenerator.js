import fs from 'fs';
import path from 'path';
import wkhtml from 'wkhtmltopdf';
import { buildHtmlContent, resolveOfferLetterAssets } from './pdfTemplateBuilder.js';

wkhtml.command = process.env.WKHTMLTOPDF_PATH || 'wkhtmltopdf';

const OUTPUT_DIR = process.env.OFFER_LETTER_OUTPUT_DIR || 'GeneratedOfferLetter';

function safeFilePart(value) {
    return String(value || 'offer')
        .trim()
        .replace(/[^a-z0-9_-]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        || 'offer';
}

export async function generatePDFFromData(data) {
    return new Promise((resolve, reject) => {
        const folderPath = path.join(process.cwd(), OUTPUT_DIR);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const upperName = data.metadata.upperName || data.metadata.name?.toUpperCase() || 'UNKNOWN';
        const internType = data.metadata.internType || 'internship';
        const timestamp = Date.now();
        const fileName = `${safeFilePart(internType)}_Letter_${safeFilePart(upperName)}_${timestamp}.pdf`;
        const outputFile = path.join(folderPath, fileName);

        let assets;
        try {
            assets = resolveOfferLetterAssets();
        } catch (error) {
            reject(error);
            return;
        }

        const html = buildHtmlContent(data, assets);

        wkhtml(html, {
            output: outputFile,
            enableLocalFileAccess: true,
            pageSize: 'A4',
            marginTop: '0',
            marginBottom: '0',
            marginLeft: '0',
            marginRight: '0',
            enableJavascript: false,
            noStopSlowScripts: true,
            printMediaType: true,
            background: true,
            disableSmartShrinking: true,
            dpi: 300,
            imageDpi: 300,
            imageQuality: 100,
            encoding: 'UTF-8',
            minimumFontSize: 11
        }, function (err) {
            if (err) {
                reject(new Error('PDF generation failed'));
                return;
            }

            const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
            resolve(`${baseUrl}/${OUTPUT_DIR}/${fileName}`);
        });
    });
}
