import fs from 'fs';
import path from 'path';
import { escapeHtml } from '../../utils/htmlHelpers.js';
import { formatOrdinalDate } from '../../utils/dateFormatter.js';
import { estimateBlockHeightMm } from './pdfLayout.js';
import { repaginateForFooterSafety } from './pdfPagination.js';

const OFFERLETTER_IMAGE_DIR = path.join(process.cwd(), 'public/images/offerletter');

export function findFirstExistingAsset(candidates) {
    for (const fileName of candidates) {
        const absolutePath = path.join(OFFERLETTER_IMAGE_DIR, fileName);
        if (fs.existsSync(absolutePath)) {
            return absolutePath;
        }
    }

    return null;
}

export function toFileUrl(absolutePath) {
    return `file:///${absolutePath.replace(/\\/g, '/')}`;
}

export function replaceVariables(text, metadata = {}) {
    if (!text || typeof text !== 'string') {
        return text;
    }

    const variables = {
        name: metadata.name || '',
        upperName: metadata.upperName || metadata.name?.toUpperCase() || '',
        gender: metadata.gender || '',
        internType: metadata.internType || '',
        durationType: metadata.durationType || '',
        duration: metadata.duration || '',
        role: metadata.role || '',
        startDate: formatOrdinalDate(metadata.startDate),
        endDate: formatOrdinalDate(metadata.endDate),
        salaryType: metadata.salaryType || '',
        salaryAmount: metadata.salaryAmount || '',
        date: metadata.date || '',
        agreementDate: formatOrdinalDate(metadata.agreementDate),
        termText: metadata.termText || '',
        workerName: metadata.workerName || metadata.name || '',
        workerEmail: metadata.workerEmail || '',
        companyName: metadata.companyName || '',
        companyOffice: metadata.companyOffice || '',
        signatoryName: metadata.signatoryName || '',
        signatoryTitle: metadata.signatoryTitle || ''
    };

    for (const [key, value] of Object.entries(metadata)) {
        if (variables[key] === undefined && ['string', 'number'].includes(typeof value)) {
            variables[key] = value;
        }
    }

    let result = text;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        result = result.replace(regex, value);
    }

    return result;
}

export function resolveOfferLetterAssets() {
    const templatePath = findFirstExistingAsset(['temp.jpg', 'temp.png']);
    const signPath = findFirstExistingAsset(['sign2.png', 'sign.png']);
    const transparentPath = findFirstExistingAsset(['transparent.png']);

    if (!templatePath || !signPath) {
        throw new Error('Missing offer letter assets in backend/public/images/offerletter (expected temp.jpg/temp.png and sign2.png).');
    }

    return {
        templateUrl: toFileUrl(templatePath),
        signUrl: toFileUrl(signPath),
        transparentUrl: transparentPath ? toFileUrl(transparentPath) : null
    };
}

export function buildHtmlContent(data, assets) {
    const { templateUrl, signUrl, transparentUrl } = assets;
    let htmlContent = '';
    const safePages = repaginateForFooterSafety(data.pages || [], data.metadata || {}, estimateBlockHeightMm, replaceVariables);

    console.log('After repagination:', safePages.length, 'pages');
    safePages.forEach((page, idx) => {
        console.log(`  Page ${page.pageNumber}: ${page.paragraphs.length} paragraphs`);
        page.paragraphs.forEach((p, i) => {
            const preview = (p.content || '').substring(0, 40).replace(/\n/g, ' ');
            console.log(`    ${i + 1}. [${p.type}] ${preview}...`);
        });
    });

    safePages.forEach((page, pageIndex) => {
        htmlContent += `<section class="pdf-page ${pageIndex > 0 ? 'next-page' : ''}">`;
        htmlContent += `<div class="page-content">`;

        page.paragraphs.forEach((para) => {
            if (!para.content || para.content.trim() === '') {
                return;
            }

            const processedContent = replaceVariables(para.content, data.metadata);

            switch (para.type) {
                case 'date':
                    htmlContent += `<div class="date">${escapeHtml(processedContent)}</div>`;
                    break;
                case 'to':
                    htmlContent += `<div class="to-line">${processedContent}</div>`;
                    break;
                case 'subject':
                    htmlContent += `<div class="subject">${escapeHtml(processedContent)}</div>`;
                    break;
                case 'paragraph':
                    htmlContent += `<div class="paragraph-block avoid-break"><p>${escapeHtml(processedContent)}</p></div>`;
                    break;
                case 'signature':
                    htmlContent += `<div class="signature-block avoid-break"><div>${processedContent}</div><img src="${signUrl}" class="sign" /></div>`;
                    break;
                case 'company':
                    htmlContent += `<div class="company-name">${escapeHtml(processedContent)}</div>`;
                    break;
                case 'separator':
                    htmlContent += `<div class="center separator">${escapeHtml(processedContent)}</div>`;
                    break;
                case 'footer':
                    htmlContent += `<div class="paragraph-block avoid-break"><p>${escapeHtml(processedContent)}</p></div>`;
                    break;
                case 'image':
                    htmlContent += `<div style="margin:10mm 0;"><img src="${para.content}" style="max-width:100%;height:auto;" /></div>`;
                    break;
                default:
                    htmlContent += `<div class="paragraph-block avoid-break"><p>${escapeHtml(processedContent)}</p></div>`;
            }
        });

        htmlContent += `</div></section>`;
    });

    return `
<!DOCTYPE html>
<html>
<head>
<style>
*{margin:0;padding:0;box-sizing:border-box;}

@page{size:A4;margin:0;}

html, body{margin:0;padding:0;width:210mm;min-height:297mm;}

body{
    font-family:Arial,sans-serif;
    font-size:11pt;
    line-height:1.5;
    color:#000;
    print-color-adjust:exact;
    -webkit-print-color-adjust:exact;
    word-spacing: 0;
    letter-spacing: 0;
}

.pdf-page{
    width:210mm;
    height:297mm;
    min-height:297mm;
    max-height:297mm;
    position:relative;
    overflow:hidden;
    page-break-inside:avoid;
    page-break-after:auto;
    break-inside:avoid-page;
    break-after:auto;
    background-image:url('${templateUrl}');
    background-position:center top;
    background-repeat:no-repeat;
    background-size:210mm 297mm;
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
}

.next-page{page-break-before:always;break-before:page;}

.pdf-page:last-child{page-break-after:avoid;break-after:avoid;}

.pdf-page::after{
    content:'';
    position:absolute;
    inset:0;
    ${transparentUrl ? `background-image:url('${transparentUrl}');` : ''}
    ${transparentUrl ? 'background-repeat:no-repeat;' : ''}
    ${transparentUrl ? 'background-position:center top;' : ''}
    ${transparentUrl ? 'background-size:210mm 297mm;' : ''}
    ${transparentUrl ? 'opacity:1;' : ''}
    pointer-events:none;
    z-index:0;
}

.page-content{
    padding:30mm 25mm 28mm 25mm;
    position:relative;
    z-index:1;
    font-size:11pt;
    line-height:1.5;
    height:239mm;
    max-height:239mm;
    overflow:visible;
    box-sizing:content-box;
}

p{text-align:justify;margin:0;line-height:1.5;word-spacing: 0;letter-spacing: 0;text-justify: inter-word;}

.paragraph-block{margin-bottom:4mm;padding-bottom: 1mm;page-break-inside: avoid;break-inside: avoid;}

.paragraph-block p{text-align:justify;word-spacing: 0;letter-spacing: 0;white-space: normal;margin-bottom: 1mm;}

.avoid-break{page-break-inside:avoid;break-inside:avoid;}

.date{text-align:left;margin-left:125mm;margin-bottom:6mm;padding-bottom: 1mm;}

.subject{text-align:center;font-weight:700;margin-top:4mm;margin-bottom:4mm;padding-bottom: 1mm;}

.to-line{line-height:1.5;margin-bottom:4mm;padding-bottom: 1mm;}

.signature-block{margin-top:6mm;line-height:1.5;margin-bottom: 4mm;padding-bottom: 2mm;page-break-inside: avoid;break-inside: avoid;display: block;}

.signature-block div{margin-bottom: 1mm;}

.signature-block img{display: block;margin-top: 2mm;}

.company-name{margin-top:4mm;margin-bottom: 4mm;padding-bottom: 2mm;}

.separator{margin-top:4mm;margin-bottom:4mm;padding-bottom: 2mm;}

.sign{width:40mm;height:auto;margin-top:0;margin-bottom: 0;image-rendering:auto;}

.center{text-align:center;}

.paragraph-block p, .signature-block, .subject, .to-line{orphans:3;widows:3;}

body::after{content:none;}
</style>
</head>
<body>
${htmlContent}
</body>
</html>
`;
}
