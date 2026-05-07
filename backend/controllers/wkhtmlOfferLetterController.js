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

        data.pages.forEach((page, pageIndex) => {
            htmlContent += `<section class="pdf-page ${pageIndex > 0 ? 'next-page' : ''}">`;
            htmlContent += `<div class="page-content">`;

            page.paragraphs.forEach((para) => {
                if (!para.content || para.content.trim() === '') return;

                switch (para.type) {
                    case 'date':
                        htmlContent += `<div class="date">${escapeHtml(para.content)}</div>`;
                        break;
                    case 'to':
                        htmlContent += `<div class="to-line">${para.content}</div>`;
                        break;
                    case 'subject':
                        htmlContent += `<div class="subject">${escapeHtml(para.content)}</div>`;
                        break;
                    case 'paragraph':
                        htmlContent += `<div class="paragraph-block avoid-break"><p>${escapeHtml(para.content)}</p></div>`;
                        break;
                    case 'signature':
                        htmlContent += `<div class="signature-block avoid-break"><div>${para.content}</div><img src="${signUrl}" class="sign" /></div>`;
                        break;
                    case 'company':
                        htmlContent += `<div class="company-name">${escapeHtml(para.content)}</div>`;
                        break;
                    case 'separator':
                        htmlContent += `<div class="center separator">${escapeHtml(para.content)}</div>`;
                        break;
                    case 'footer':
                        htmlContent += `<div class="paragraph-block avoid-break"><p>${escapeHtml(para.content)}</p></div>`;
                        break;
                    case 'image':
                        htmlContent += `<div style="margin:10mm 0;"><img src="${para.content}" style="max-width:100%;height:auto;" /></div>`;
                        break;
                    default:
                        htmlContent += `<div class="paragraph-block avoid-break"><p>${escapeHtml(para.content)}</p></div>`;
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
}

/* Independent fixed-size page container to prevent split/cut backgrounds. */
.pdf-page{
    width:210mm;
    min-height:297mm;
    position:relative;
    overflow:hidden;
    page-break-inside:avoid;
    break-inside:avoid-page;
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
    padding:45mm 25mm 18mm 25mm;
    position:relative;
    z-index:1;
    font-size:11pt;
    line-height:1.5;
}

p{
    text-align:justify;
    margin:0;
    line-height:1.5;
}

.paragraph-block{
    margin-bottom:5mm;
}

.avoid-break{
    page-break-inside:avoid;
    break-inside:avoid;
}

.date{
    text-align:left;
    margin-left:125mm;
    margin-bottom:8mm;
}

.subject{
    text-align:center;
    font-weight:700;
    margin-top:5mm;
    margin-bottom:5mm;
}

.to-line{
    line-height:1.5;
    margin-bottom:5mm;
}

.signature-block{
    margin-top:8mm;
    line-height:1.5;
}

.company-name{
    margin-top:5mm;
}

.separator{
    margin-top:5mm;
    margin-bottom:5mm;
}

.sign{
    width:40mm;
    height:auto;
    margin-top:6mm;
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
            imageQuality: 100
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
