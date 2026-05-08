import wkhtml from 'wkhtmltopdf';
import path from 'path';
import fs from 'fs';

// VERY IMPORTANT
wkhtml.command = 'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe';

const pdfPath = "../backend/GeneratedOfferLetter";
const OFFERLETTER_IMAGE_DIR = path.join(process.cwd(), 'public/images/offerletter');

// Store the last generated offer letter data
let lastOfferLetterData = null;

function findFirstExistingAsset(candidates) {
    for (const fileName of candidates) {
        const absolutePath = path.join(OFFERLETTER_IMAGE_DIR, fileName);
        if (fs.existsSync(absolutePath)) {
            return absolutePath;
        }
    }
    return null;
}

function toFileUrl(absolutePath) {
    return `file:///${absolutePath.replace(/\\/g, '/')}`;
}

function escapeHtml(text = '') {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function stripHtml(text = '') {
    return String(text).replace(/<[^>]*>/g, '');
}

const TOP_PADDING_MM = 30;
const SIDE_PADDING_MM = 25;
const BOTTOM_SAFE_MM = 28;
const PAGE_HEIGHT_MM = 297;
const CONTENT_MAX_HEIGHT_MM = PAGE_HEIGHT_MM - TOP_PADDING_MM - BOTTOM_SAFE_MM;
const CONTENT_WIDTH_MM = 210 - (SIDE_PADDING_MM * 2);
const BASE_FONT_SIZE_PT = 11;
const BASE_FONT_LINE_HEIGHT = 1.5;
const FONT_MM = BASE_FONT_SIZE_PT * 0.352778;
const LINE_MM = FONT_MM * BASE_FONT_LINE_HEIGHT;

function estimateTextUnits(text = '') {
    let units = 0;
    for (const ch of text) {
        if (ch === ' ') units += 0.33;
        else if (/[ilI1\|\.,'`]/.test(ch)) units += 0.35;
        else if (/[mwMW@#%&]/.test(ch)) units += 0.9;
        else if (/[A-Z]/.test(ch)) units += 0.68;
        else if (/[0-9]/.test(ch)) units += 0.56;
        else units += 0.55;
    }
    return units;
}

function estimateWrappedLineCount(text = '') {
    const plain = stripHtml(text).replace(/\s+/g, ' ').trim();
    if (!plain) return 1;

    // Empirical wrap-capacity tuning: lower unitWidthMm => more chars per line => fewer lines.
    const unitWidthMm = FONT_MM * 0.48;
    const maxUnitsPerLine = Math.max(1, CONTENT_WIDTH_MM / unitWidthMm);
    const words = plain.split(' ');

    let lines = 1;
    let currentUnits = 0;
    for (const word of words) {
        const wordUnits = estimateTextUnits(word);
        const withSpace = currentUnits === 0 ? wordUnits : (wordUnits + 0.33);

        if (withSpace > maxUnitsPerLine) {
            const forcedLines = Math.max(1, Math.ceil(wordUnits / maxUnitsPerLine));
            lines += forcedLines - (currentUnits === 0 ? 0 : 1);
            currentUnits = wordUnits % maxUnitsPerLine;
            continue;
        }

        if ((currentUnits + withSpace) > maxUnitsPerLine) {
            lines += 1;
            currentUnits = wordUnits;
        } else {
            currentUnits += withSpace;
        }
    }

    return Math.max(1, lines);
}

function estimateBlockHeightMm(para, metadata) {
    const content = replaceVariables(para.content || '', metadata);
    const plainText = stripHtml(content).trim();

    switch (para.type) {
        case 'date':
            return LINE_MM + 7; // margin-bottom 6 + padding-bottom 1
        case 'to':
            return (Math.max(1, content.split(/<br\s*\/?>/i).length) * LINE_MM) + 5;
        case 'subject':
            return LINE_MM + 9; // margin-top 4 + margin-bottom 4 + padding-bottom 1
        case 'signature':
            return (Math.max(1, content.split(/<br\s*\/?>/i).length) * LINE_MM) + 27; // text + image + margins/padding
        case 'company':
            return LINE_MM + 10;
        case 'separator':
            return LINE_MM + 10;
        case 'footer':
            return (estimateWrappedLineCount(content) * LINE_MM) + 5;
        case 'image':
            return 75; // 55mm image + 10mm top + 10mm bottom margins
        default: {
            const lines = estimateWrappedLineCount(plainText);
            return (lines * LINE_MM) + 5; // paragraph-block and p bottom spacing
        }
    }
}

function splitParagraphToFit(para, metadata, maxHeightMm) {
    const rawText = replaceVariables(para.content || '', metadata);
    const words = stripHtml(rawText).split(/\s+/).filter(Boolean);
    if (words.length === 0) return [para];

    const chunks = [];
    let current = [];
    let index = 1;

    for (const word of words) {
        const next = [...current, word].join(' ');
        const testPara = { ...para, content: next };
        if (estimateBlockHeightMm(testPara, metadata) <= maxHeightMm || current.length === 0) {
            current.push(word);
            continue;
        }

        chunks.push({
            ...para,
            id: `${para.id || 'p'}_part_${index++}`,
            content: current.join(' ')
        });
        current = [word];
    }

    if (current.length > 0) {
        chunks.push({
            ...para,
            id: `${para.id || 'p'}_part_${index}`,
            content: current.join(' ')
        });
    }

    return chunks.length ? chunks : [para];
}

function splitParagraphIntoFitAndRest(para, metadata, maxHeightMm) {
    const rawText = replaceVariables(para.content || '', metadata);
    const words = stripHtml(rawText).split(/\s+/).filter(Boolean);
    if (words.length < 2) return null;

    let fitWords = [];
    for (const word of words) {
        const candidate = [...fitWords, word].join(' ');
        const h = estimateBlockHeightMm({ ...para, content: candidate }, metadata);
        if (h <= maxHeightMm || fitWords.length === 0) {
            fitWords.push(word);
        } else {
            break;
        }
    }

    if (fitWords.length === 0 || fitWords.length >= words.length) {
        return null;
    }

    const restWords = words.slice(fitWords.length);
    return {
        fit: { ...para, content: fitWords.join(' ') },
        rest: { ...para, content: restWords.join(' ') }
    };
}

function repaginateForFooterSafety(pages, metadata) {
    const repaginated = [];
    let pageNumber = 1;
    const MIN_REMAINING_FOR_SPLIT_MM = 4; // Allow tighter packing near the footer

    for (const page of pages) {
        let currentParagraphs = [];
        let currentHeight = 0;

        for (const para of page.paragraphs || []) {
            const pageUsableHeight = CONTENT_MAX_HEIGHT_MM;
            const queue = [para];

            while (queue.length > 0) {
                const block = queue.shift();
                const h = estimateBlockHeightMm(block, metadata);
                const PARAGRAPH_EXTRA_BOTTOM_RESERVE_MM = 4; // Push paragraph text slightly up near the footer.
                const extraReserveForParagraph = block.type === 'paragraph' ? PARAGRAPH_EXTRA_BOTTOM_RESERVE_MM : 0;
                const effectivePageUsableHeight = pageUsableHeight - extraReserveForParagraph;
                const remaining = effectivePageUsableHeight - currentHeight;
                const willOverflow = (currentHeight + h) > effectivePageUsableHeight;

                if (!willOverflow) {
                    currentParagraphs.push(block);
                    currentHeight += h;
                    continue;
                }

                const canSplitParagraph = block.type === 'paragraph' && stripHtml(block.content || '').trim().length > 0;
                if (canSplitParagraph) {
                    // Only split when there's meaningful remaining space; otherwise push to next page.
                    const targetFitHeight = remaining >= MIN_REMAINING_FOR_SPLIT_MM ? remaining : null;
                    const split = targetFitHeight === null
                        ? null
                        : splitParagraphIntoFitAndRest(block, metadata, targetFitHeight);

                    if (split && split.fit?.content) {
                        if (currentParagraphs.length > 0) {
                            currentParagraphs.push(split.fit);
                            currentHeight += estimateBlockHeightMm(split.fit, metadata);
                            repaginated.push({ pageNumber: pageNumber++, paragraphs: currentParagraphs });
                            currentParagraphs = [];
                            currentHeight = 0;
                        } else {
                            const splitBlocks = splitParagraphToFit(block, metadata, pageUsableHeight * 0.92);
                            const firstBlock = splitBlocks.shift();
                            if (firstBlock) {
                                currentParagraphs.push(firstBlock);
                                currentHeight += estimateBlockHeightMm(firstBlock, metadata);
                                repaginated.push({ pageNumber: pageNumber++, paragraphs: currentParagraphs });
                                currentParagraphs = [];
                                currentHeight = 0;
                            }
                            splitBlocks.reverse().forEach((b) => queue.unshift(b));
                            continue;
                        }
                        queue.unshift(split.rest);
                        continue;
                    }
                }

                // Backfill: if a non-paragraph block forces a page break, try splitting the
                // last paragraph already placed on this page to use the remaining space.
                // This avoids under-filled pages (large blank bottom area) before the footer blocks.
                if (currentParagraphs.length > 0 && block.type !== 'paragraph') {
                    const lastPlaced = currentParagraphs[currentParagraphs.length - 1];
                    if (lastPlaced?.type === 'paragraph') {
                        const lastH = estimateBlockHeightMm(lastPlaced, metadata);
                        const heightWithoutLast = currentHeight - lastH;
                        const availableForLastFit = effectivePageUsableHeight - heightWithoutLast;

                        if (availableForLastFit >= MIN_REMAINING_FOR_SPLIT_MM) {
                            const splitLast = splitParagraphIntoFitAndRest(lastPlaced, metadata, availableForLastFit);
                            if (splitLast?.fit?.content && splitLast?.rest?.content) {
                                // Replace last paragraph with its fit portion.
                                currentParagraphs[currentParagraphs.length - 1] = splitLast.fit;
                                currentHeight = heightWithoutLast + estimateBlockHeightMm(splitLast.fit, metadata);

                                // Close current page, and push rest + current block to next page queue.
                                repaginated.push({ pageNumber: pageNumber++, paragraphs: currentParagraphs });
                                currentParagraphs = [];
                                currentHeight = 0;

                                queue.unshift(block);
                                queue.unshift(splitLast.rest);
                                continue;
                            }
                        }
                    }
                }

                if (currentParagraphs.length > 0) {
                    repaginated.push({ pageNumber: pageNumber++, paragraphs: currentParagraphs });
                    currentParagraphs = [];
                    currentHeight = 0;
                    queue.unshift(block);
                } else {
                    currentParagraphs.push(block);
                    currentHeight += h;
                }
            }
        }

        if (currentParagraphs.length > 0) {
            repaginated.push({ pageNumber: pageNumber++, paragraphs: currentParagraphs });
        }
    }

    return repaginated;
}

// Replace template variables with actual values
function replaceVariables(text, metadata) {
    if (!text || typeof text !== 'string') return text;
    
    // Format dates nicely
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).replace(/(\d+)/, (day) => {
            const suffix = day > 3 && day < 21 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10];
            return day + suffix;
        });
    };

    // Create a map of variables to their values
    const variables = {
        name: metadata.name || '',
        upperName: metadata.upperName || metadata.name?.toUpperCase() || '',
        gender: metadata.gender || '',
        internType: metadata.internType || '',
        durationType: metadata.durationType || '',
        duration: metadata.duration || '',
        role: metadata.role || '',
        startDate: formatDate(metadata.startDate),
        endDate: formatDate(metadata.endDate),
        salaryType: metadata.salaryType || '',
        salaryAmount: metadata.salaryAmount || '',
        date: metadata.date || ''
    };

    // Replace all ${variable} patterns
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        result = result.replace(regex, value);
    }

    return result;
}

export const generateOfferLetter = async (req, res) => {
    try {
        const {
            name, gender, internType, durationType, duration,
            role, startDate, endDate, salaryType, salaryAmount
        } = req.body;

        // Validation
        if (!name || !gender || !internType || !durationType || !duration ||
            !role || !startDate || !endDate || !salaryType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const upperName = name.toUpperCase();

        // Date
        const inpDate = `Date: ${new Date().toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
        }).replace(/(\d+)/, (day) => {
            const suffix = day > 3 && day < 21 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10];
            return day + suffix;
        })}`;

        // To
        let to = gender === "male" ? `To,<br>Mr. ${upperName}` : `To,<br>Ms. ${upperName}`;

        // Subject
        let subject = internType === "internship" ? `Subject: Internship Offer Letter` : `Subject: ${internType.replace('_', ' ')} Job Offer Letter`;

        // Paragraphs
        let firstParagraph = `This letter is in reference to your application related to a request for a ${duration} ${durationType}${duration > 1 ? 's' : ''} ${internType} at our firm. We are pleased to inform you that you have been granted ${duration} ${durationType}${duration > 1 ? 's' : ''} at our company and your designation during the ${internType} shall be addressed as an ${role.toUpperCase()} at our company SAECULUM SOLUTIONS PVT LTD for this ${duration} ${durationType}${duration > 1 ? 's' : ''} period starting ${new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/(\d+)/, (day) => day + (day > 3 && day < 21 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10]))}. Company shall inform your reporting manager at the time of joining. You are required to attend the office (for ${internType}) on all working days (Monday to Friday, except National holidays and company declared holidays) and your timings shall be from 10:00 AM to 7.00 PM (includes lunch break).`;

        let secondParagraph = `Your ${internType} tenure shall be from ${new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/(\d+)/, (day) => day + (day > 3 && day < 21 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10]))} to ${new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/(\d+)/, (day) => day + (day > 3 && day < 21 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10]))}. This association shall be considered as completed on ${new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/(\d+)/, (day) => day + (day > 3 && day < 21 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10]))} or earlier, unless further extension is communicated in writing. Company shall not have any obligation to recruit you post cessation of your ${internType} association with the company.`;

        let salaryParagraph = salaryType === "paid" ? `During the tenure of your ${internType}, you shall be paid a stipend/salary of ${salaryAmount} per month.` : `This ${internType} shall be unpaid and no stipend/salary shall be provided during the tenure of your association with the company.`;

        let thirdParagraph = `This ${internType} offer is subject to your acceptance to following terms (you joining the company shall mean and be interpreted as acceptance of following terms by you):`;

        let t1 = `1) Company, at its sole and exclusive discretion reserves the right to offer you further ${internType} and/or job offer, subject to complete satisfaction of your performance (Both technical as well as from HR perspective); however, in no way shall company be obligated to provide extension or any further job offer.`;

        let t2 = `2) During the above-mentioned ${internType} period, the company at its sole and exclusive discretion, reserves the right to immediately terminate the ${internType} of the candidate (yours), without assigning any reason thereof.`;

        let t3 = `3) This letter does not construe upon any appointment, offer, contract or any terms that may be associated with employment, labor laws or otherwise as the company has on pro-bono basis accepted to train you and provide a platform to conduct your ${internType} at company's premises. The intern shall adhere and follow the company's HR rule & regulations, code of conduct and other policies applicable in the office. The termination decision of the company shall be final and binding. Candidate (Trainee / Intern / you) hereby confirm and acknowledge that you have read all the above terms and conditions of the company and is deemed to be accepted by you and shall indemnify company under any obligation that may arise due to you joining our company as a Trainee/Intern, upon you joining the company under any capacity / designation. You further shall indemnify the company, its employees, its representatives, its consultants etc., but not limited to, in any matter of dispute and shall here further undertake not to undertake any legal actions, claim, recourse against the company in any manner related to this association, now and in future. Additionally, the company may require the intern to sign/execute an NDA for safeguarding the company and its clients' interests, to which intern shall agree.`;

        let director = `Sincerely,<br>HARDIKKUMAR VINZAVA<br>DIRECTOR`;
        let companyName = `SAECULUM SOLUTIONS PV LTD`;
        let separator = `--------------------------------X----------------------------X-----------------------`;
        let footer1 = `I, ${upperName}, hereby accept the above - mentioned Internship offer alongwith the terms mentioned therein and acknowledge receiving a copy of the same.`;
        let footer2 = `Signature_____________________`;
        let footer3 = `Name of the Trainee Accepting offer ${upperName}`;
        let footer4 = `Place of sole & exclusive Jurisdiction: Ahmedabad, Gujarat, India`;

        // Structure data as array of pages with paragraphs
        const structuredData = {
            metadata: { name, upperName, gender, internType, durationType, duration, role, startDate, endDate, salaryType, salaryAmount, date: inpDate },
            pages: [
                {
                    pageNumber: 1,
                    paragraphs: [
                        { id: 'date', content: inpDate, type: 'date' },
                        { id: 'to', content: to, type: 'to' },
                        { id: 'subject', content: subject, type: 'subject' },
                        { id: 'p1', content: firstParagraph, type: 'paragraph' },
                        { id: 'p2', content: secondParagraph, type: 'paragraph' },
                        { id: 'p3', content: salaryParagraph, type: 'paragraph' },
                        { id: 'p4', content: thirdParagraph, type: 'paragraph' },
                        { id: 'p5', content: t1, type: 'paragraph' },
                        { id: 'p6', content: t2, type: 'paragraph' }
                    ]
                },
                {
                    pageNumber: 2,
                    paragraphs: [
                        { id: 'p7', content: t3, type: 'paragraph' },
                        { id: 'director', content: director, type: 'signature' },
                        { id: 'company', content: companyName, type: 'company' },
                        { id: 'separator', content: separator, type: 'separator' },
                        { id: 'footer1', content: footer1, type: 'footer' },
                        { id: 'footer2', content: footer2, type: 'footer' },
                        { id: 'footer3', content: footer3, type: 'footer' },
                        { id: 'footer4', content: footer4, type: 'footer' }
                    ]
                }
            ]
        };

        // Store the data
        lastOfferLetterData = structuredData;

        // Generate PDF
        const pdfUrl = await generatePDFFromData(structuredData);

        console.log('Generated PDF with pages:', structuredData.pages.length);
        structuredData.pages.forEach((page, idx) => {
            console.log(`Page ${page.pageNumber}: ${page.paragraphs.length} paragraphs`);
        });

        res.status(200).json({
            message: `Offer letter generated successfully`,
            path: pdfUrl,
            data: structuredData
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get offer letter data
export const getOfferLetterData = async (req, res) => {
    try {
        if (!lastOfferLetterData) {
            return res.status(404).json({ error: 'No offer letter data found. Please generate an offer letter first.' });
        }
        res.status(200).json({ success: true, data: lastOfferLetterData });
    } catch (error) {
        console.error('Error fetching offer letter data:', error);
        res.status(500).json({ error: 'Failed to fetch offer letter data', details: error.message });
    }
};

// Compile offer letter
export const compileOfferLetter = async (req, res) => {
    try {
        const { pages, metadata } = req.body;

        if (!pages || !Array.isArray(pages)) {
            return res.status(400).json({ error: 'Invalid data format. Pages array is required.' });
        }

        const structuredData = {
            metadata: metadata || lastOfferLetterData?.metadata || {},
            pages
        };

        const pdfUrl = await generatePDFFromData(structuredData);
        lastOfferLetterData = structuredData;

        res.status(200).json({
            message: 'Offer letter compiled successfully',
            path: pdfUrl,
            data: structuredData
        });

    } catch (error) {
        console.error('Error compiling PDF:', error);
        res.status(500).json({ error: 'Failed to compile PDF', details: error.message });
    }
};

// Helper function
async function generatePDFFromData(data) {
    return new Promise((resolve, reject) => {
        const folderPath = path.join(process.cwd(), pdfPath);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const upperName = data.metadata.upperName || 'UNKNOWN';
        const internType = data.metadata.internType || 'internship';
        const timestamp = Date.now();
        const fileName = `${internType}_Letter_${upperName}_${timestamp}.pdf`;
        const outputFile = path.join(folderPath, fileName);

        const templatePath = findFirstExistingAsset(['temp.jpg', 'temp.png']);
        const signPath = findFirstExistingAsset(['sign2.png', 'sign.png']);
        const transparentPath = findFirstExistingAsset(['transparent.png']);

        if (!templatePath || !signPath) {
            reject(new Error('Missing offer letter assets in backend/public/images/offerletter (expected temp.jpg/temp.png and sign2.png).'));
            return;
        }

        const templateUrl = toFileUrl(templatePath);
        const signUrl = toFileUrl(signPath);
        const transparentUrl = transparentPath ? toFileUrl(transparentPath) : null;

        let htmlContent = '';
        const safePages = repaginateForFooterSafety(data.pages || [], data.metadata || {});

        console.log('After repagination:', safePages.length, 'pages');
        safePages.forEach((page, idx) => {
            console.log(`  Page ${page.pageNumber}: ${page.paragraphs.length} paragraphs`);
            page.paragraphs.forEach((p, i) => {
                const preview = (p.content || '').substring(0, 40).replace(/\n/g, ' ');
                console.log(`    ${i+1}. [${p.type}] ${preview}...`);
            });
        });

        safePages.forEach((page, pageIndex) => {
            htmlContent += `<section class="pdf-page ${pageIndex > 0 ? 'next-page' : ''}">`;
            htmlContent += `<div class="page-content">`;

            page.paragraphs.forEach((para) => {
                if (!para.content || para.content.trim() === '') return;

                // Replace template variables with actual values
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

        const html = `
<!DOCTYPE html>
<html>
<head>
<style>
*{margin:0;padding:0;box-sizing:border-box;}

@page{
    size:A4;
    margin:0;
}

html, body{
    margin:0;
    padding:0;
    width:210mm;
    min-height:297mm;
}

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

/* Independent fixed-size page container to prevent split/cut backgrounds. */
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

.next-page{
    page-break-before:always;
    break-before:page;
}

.pdf-page:last-child{
    page-break-after:avoid;
    break-after:avoid;
}

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
    padding:${TOP_PADDING_MM}mm ${SIDE_PADDING_MM}mm ${BOTTOM_SAFE_MM}mm ${SIDE_PADDING_MM}mm;
    position:relative;
    z-index:1;
    font-size:11pt;
    line-height:1.5;
    height:${CONTENT_MAX_HEIGHT_MM}mm;
    max-height:${CONTENT_MAX_HEIGHT_MM}mm;
    overflow:visible;
    /* Override global border-box so CONTENT_MAX_HEIGHT_MM represents the content-box height.
       Otherwise padding is double-counted and leaves excessive blank space. */
    box-sizing:content-box;
}

p{
    text-align:justify;
    margin:0;
    line-height:1.5;
    word-spacing: 0;
    letter-spacing: 0;
    text-justify: inter-word;
}

.paragraph-block{
    margin-bottom:4mm;
    padding-bottom: 1mm;
    page-break-inside: avoid;
    break-inside: avoid;
}

.paragraph-block p{
    text-align:justify;
    word-spacing: 0;
    letter-spacing: 0;
    white-space: normal;
    margin-bottom: 1mm;
}

.avoid-break{
    page-break-inside:avoid;
    break-inside:avoid;
}

.date{
    text-align:left;
    margin-left:125mm;
    margin-bottom:6mm;
    padding-bottom: 1mm;
}

.subject{
    text-align:center;
    font-weight:700;
    margin-top:4mm;
    margin-bottom:4mm;
    padding-bottom: 1mm;
}

.to-line{
    line-height:1.5;
    margin-bottom:4mm;
    padding-bottom: 1mm;
}

.signature-block{
    margin-top:6mm;
    line-height:1.5;
    margin-bottom: 4mm;
    padding-bottom: 2mm;
    page-break-inside: avoid;
    break-inside: avoid;
    display: block;
}

.signature-block div{
    margin-bottom: 1mm;
}

.signature-block img{
    display: block;
    margin-top: 2mm;
}

.company-name{
    margin-top:4mm;
    margin-bottom: 4mm;
    padding-bottom: 2mm;
}

.separator{
    margin-top:4mm;
    margin-bottom:4mm;
    padding-bottom: 2mm;
}

.sign{
    width:40mm;
    height:auto;
    margin-top:0;
    margin-bottom: 0;
    image-rendering:auto;
}

.center{
    text-align:center;
}

/* Avoid accidental orphan lines and awkward splits. */
.paragraph-block p, .signature-block, .subject, .to-line{
    orphans:3;
    widows:3;
}

/* Keep legacy class names ignored if present from older template builds. */
body::after{
    content:none;
}

/* Legacy no-op to keep compatibility with old markup */
/*
    background-image:url('${transparentUrl}');
    background-repeat:repeat-y;
    background-position:center center;
    background-size:210mm 297mm;
*/
</style>
</head>
<body>
${htmlContent}
</body>
</html>
`;

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
                console.log(err);
                reject(new Error('PDF generation failed'));
                return;
            }
            console.log(`PDF generated: ${outputFile}`);
            resolve(`http://localhost:5000/GeneratedOfferLetter/${fileName}`);
        });
    });
}

export default {
    generateOfferLetter,
    getOfferLetterData,
    compileOfferLetter
};
