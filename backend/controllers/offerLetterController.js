import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store the last generated offer letter data
let lastOfferLetterData = null;

export const generateOfferLetter = async (req, res) => {
    try {
        const {
            name,
            gender,
            internType,
            durationType,
            duration,
            role,
            startDate,
            endDate,
            salaryType,
            salaryAmount
        } = req.body;

        // Validate required fields
        if (!name || !gender || !internType || !durationType || !duration || !role || !startDate || !endDate || !salaryType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const upperName = name.toUpperCase();

        const inpDate = `Date: ${new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).replace(/(\d+)/, (day) => {
            const suffix = day > 3 && day < 21 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10];
            return day + suffix;
        })}`;

        let to = gender === "male" ? `To,\nMr. ${upperName}` : `To,\nMs. ${upperName}`;

        let subject = internType === "internship" ? `Subject: Internship Offer Letter` : `Subject: ${internType.replace('_', ' ')} Job Offer Letter`;

        let firstParagraph = `This letter is in reference to your application related to a request for a ${duration} ${durationType}${duration > 1 ? 's' : ''} ${internType} at our firm. We are pleased to inform you that you have been granted ${duration} ${durationType}${duration > 1 ? 's' : ''} at our company and your designation during the ${internType} shall be addressed as an ${role.toUpperCase()} at our company SAECULUM SOLUTIONS PVT LTD for this ${duration} ${durationType}${duration > 1 ? 's' : ''} period starting ${new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/(\d+)/, (day) => day + (day > 3 && day < 21 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10]))}. Company shall inform your reporting manager at the time of joining. You are required to attend the office (for ${internType}) on all working days (Monday to Friday, except National holidays and company declared holidays) and your timings shall be from 10:00 AM to 7.00 PM (includes lunch break).`;

        let secondParagraph = `Your ${internType} tenure shall be from ${new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/(\d+)/, (day) => day + (day > 3 && day < 21 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10]))} to ${new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/(\d+)/, (day) => day + (day > 3 && day < 21 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10]))}. This association shall be considered as completed on ${new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/(\d+)/, (day) => day + (day > 3 && day < 21 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10]))} or earlier, unless further extension is communicated in writing. Company shall not have any obligation to recruit you post cessation of your ${internType} association with the company.`;

        let salaryParagraph = ``;
        if (salaryType === "paid")
            salaryParagraph = `During the tenure of your ${internType}, you shall be paid a stipend/salary of ${salaryAmount} per month.`;
        else
            salaryParagraph = `This ${internType} shall be unpaid and no stipend/salary shall be provided during the tenure of your association with the company.`;

        let thirdParagraph = `This ${internType} offer is subject to your acceptance to following terms (you joining the company shall mean and be interpreted as acceptance of following terms by you):`;

        let t1 = `1) Company, at its sole and exclusive discretion reserves the right to offer you further ${internType} and/or job offer, subject to complete satisfaction of your performance (Both technical as well as from HR perspective); however, in no way shall company be obligated to provide extension or any further job offer.`;

        let t2 = `2) During the above-mentioned ${internType} period, the company at its sole and exclusive discretion, reserves the right to immediately terminate the ${internType} of the candidate (yours), without assigning any reason thereof.`;

        let t3 = `3) This letter does not construe upon any appointment, offer, contract or any terms that may be associated with employment, labor laws or otherwise as the company has on pro-bono basis accepted to train you and provide a platform to conduct your ${internType} at company's premises. The intern shall adhere and follow the company's HR rule & regulations, code of conduct and other policies applicable in the office. The termination decision of the company shall be final and binding. Candidate (Trainee / Intern / you) hereby confirm and acknowledge that you have read all the above terms and conditions of the company and is deemed to be accepted by you and shall indemnify company under any obligation that may arise due to you joining our company as a Trainee/Intern, upon you joining the company under any capacity / designation. You further shall indemnify the company, its employees, its representatives, its consultants etc., but not limited to, in any matter of dispute and shall here further undertake not to undertake any legal actions, claim, recourse against the company in any manner related to this association, now and in future. Additionally, the company may require the intern to sign/execute an NDA for safeguarding the company and its clients' interests, to which intern shall agree.`;

        let director = `Sincerely,\nHARDIKKUMAR VINZAVA\nDIRECTOR`;

        let companyName = `SAECULUM SOLUTIONS PV LTD`;
        let spac = `--------------------------------X----------------------------X-----------------------`;

        let footer1 = `I, ${upperName}, hereby accept the above - mentioned Internship offer alongwith the terms mentioned therein and acknowledge receiving a copy of the same.`;
        let footer2 = `Signature_____________________`;
        let footer3 = `Name of the Trainee Accepting offer ${upperName}`;
        let footer4 = `Place of sole & exclusive Jurisdiction: Ahmedabad, Gujarat, India`;

        // Structure data as array of pages with paragraphs
        const structuredData = {
            metadata: {
                name,
                upperName,
                gender,
                internType,
                durationType,
                duration,
                role,
                startDate,
                endDate,
                salaryType,
                salaryAmount,
                date: inpDate
            },
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
                        { id: 'separator', content: spac, type: 'separator' },
                        { id: 'footer1', content: footer1, type: 'paragraph' },
                        { id: 'footer2', content: footer2, type: 'paragraph' },
                        { id: 'footer3', content: footer3, type: 'paragraph' },
                        { id: 'footer4', content: footer4, type: 'paragraph' }
                    ]
                }
            ]
        };

        // Store the data for later retrieval
        lastOfferLetterData = structuredData;

        // Generate PDF
        const pdfPath = await generatePDFFromData(structuredData);

        res.status(200).json({
            message: `Offer letter generated successfully`,
            path: pdfPath,
            data: structuredData
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
};

// Get the last generated offer letter data
export const getOfferLetterData = async (req, res) => {
    try {
        if (!lastOfferLetterData) {
            return res.status(404).json({ error: 'No offer letter data found. Please generate an offer letter first.' });
        }

        res.status(200).json({
            success: true,
            data: lastOfferLetterData
        });
    } catch (error) {
        console.error('Error fetching offer letter data:', error);
        res.status(500).json({ error: 'Failed to fetch offer letter data', details: error.message });
    }
};

// Compile edited offer letter
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

        // Generate PDF from edited data
        const pdfPath = await generatePDFFromData(structuredData);

        // Update stored data
        lastOfferLetterData = structuredData;

        res.status(200).json({
            message: 'Offer letter compiled successfully',
            path: pdfPath,
            data: structuredData
        });

    } catch (error) {
        console.error('Error compiling PDF:', error);
        res.status(500).json({ error: 'Failed to compile PDF', details: error.message });
    }
};

// Helper function to generate PDF from structured data
async function generatePDFFromData(data) {
    const doc = new jsPDF();

    // Load images as base64
    const templatePath = path.join(__dirname, '../public/images/offerletter/temp.jpg');
    const signPath = path.join(__dirname, '../public/images/offerletter/sign2.png');
    const transparentPath = path.join(__dirname, '../public/images/offerletter/transparent.png');

    let template, sign, transparent;

    try {
        template = fs.readFileSync(templatePath).toString('base64');
        sign = fs.readFileSync(signPath).toString('base64');
        transparent = fs.readFileSync(transparentPath).toString('base64');
    } catch (error) {
        console.error('Error loading images:', error);
        throw new Error('Failed to load template images');
    }

    // Process each page
    data.pages.forEach((page, pageIndex) => {
        if (pageIndex > 0) {
            doc.addPage();
        }

        doc.addImage(`data:image/png;base64,${template}`, "JPG", 0, 0, 210, 297);
        doc.setFontSize(11);

        let yPosition = 45;

        // if (pageIndex === 0) {
        //     doc.addImage(`data:image/png;base64,${transparent}`, "PNG", 7, 55, 200, 200);
        // } else {
        //     doc.addImage(`data:image/png;base64,${transparent}`, "PNG", 7, 55, 200, 200);
        // }

        // Process each paragraph
        page.paragraphs.forEach((para) => {
            if (!para.content || para.content.trim() === '') return;

            // Check if content is single line (less than 80 characters and no newlines)
            const isSingleLine = para.content.length < 80 && !para.content.includes('\n');
            const isToField = para.type === 'to' || para.id === 'to';

            switch (para.type) {
                case 'date':
                    doc.text(para.content, 150, yPosition);
                    yPosition += 15;
                    break;

                case 'to':
                    // TO field - left aligned, no justify
                    doc.text(para.content, 25, yPosition, { lineHeightFactor: 1.5 });
                    yPosition += 13;
                    break;

                case 'subject':
                    // Subject - center aligned, no justify
                    doc.text(para.content, doc.internal.pageSize.getWidth() / 2, yPosition, { align: "center" });
                    yPosition += 13;
                    break;

                case 'paragraph':
                    // Paragraphs - justify unless single line
                    if (isSingleLine) {
                        doc.text(para.content, 25, yPosition, {
                            maxWidth: 160,
                            align: "left",
                            lineHeightFactor: 1.5
                        });
                    } else {
                        doc.text(para.content, 25, yPosition, {
                            maxWidth: 160,
                            align: "justify",
                            lineHeightFactor: 1.5
                        });
                    }
                    yPosition += doc.splitTextToSize(para.content, 160).length * 6.5 + 5;
                    break;

                case 'signature':
                    doc.text(para.content, 25, yPosition, { lineHeightFactor: 1.5 });
                    yPosition += 15;
                    doc.addImage(`data:image/png;base64,${sign}`, "PNG", 25, yPosition, 40, 20);
                    yPosition += 25;
                    break;

                case 'company':
                    // Company - treat as paragraph
                    if (isSingleLine) {
                        doc.text(para.content, 25, yPosition, {
                            maxWidth: 160,
                            align: "left",
                            lineHeightFactor: 1.5
                        });
                    } else {
                        doc.text(para.content, 25, yPosition, {
                            maxWidth: 160,
                            align: "justify",
                            lineHeightFactor: 1.5
                        });
                    }
                    yPosition += doc.splitTextToSize(para.content, 160).length * 6.5 + 5;
                    break;

                case 'separator':
                    doc.text(para.content, doc.internal.pageSize.getWidth() / 2, yPosition, { align: "center" });
                    yPosition += 10;
                    break;

                case 'footer':
                    // Footer - treat as regular paragraph
                    if (isSingleLine) {
                        doc.text(para.content, 25, yPosition, {
                            maxWidth: 160,
                            align: "left",
                            lineHeightFactor: 1.5
                        });
                    } else {
                        doc.text(para.content, 25, yPosition, {
                            maxWidth: 160,
                            align: "justify",
                            lineHeightFactor: 1.5
                        });
                    }
                    yPosition += doc.splitTextToSize(para.content, 160).length * 6.5 + 5;
                    break;

                case 'image':
                    // Handle custom images
                    try {
                        doc.addImage(para.content, "PNG", 25, yPosition, 160, 80);
                        yPosition += 85;
                    } catch (err) {
                        console.error('Error adding image:', err);
                    }
                    break;

                default:
                    // Default - justify unless single line
                    if (isSingleLine || isToField) {
                        doc.text(para.content, 25, yPosition, {
                            maxWidth: 160,
                            align: "left",
                            lineHeightFactor: 1.5
                        });
                    } else {
                        doc.text(para.content, 25, yPosition, {
                            maxWidth: 160,
                            align: "justify",
                            lineHeightFactor: 1.5
                        });
                    }
                    yPosition += doc.splitTextToSize(para.content, 160).length * 6.5 + 5;
            }
        });
    });

    // Folder path
    const pdfPath = "../backend/GeneratedOfferLetter";
    const folderPath = path.join(process.cwd(), pdfPath);

    // Create folder if not exists
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    // File name with timestamp to avoid caching
    const upperName = data.metadata.upperName || 'UNKNOWN';
    const internType = data.metadata.internType || 'internship';
    const timestamp = Date.now();
    const fileName = `${internType}_Letter_${upperName}_${timestamp}.pdf`;

    // Final output path
    const outputFile = path.join(folderPath, fileName);

    // Generate PDF as buffer and save to file
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    fs.writeFileSync(outputFile, pdfBuffer);

    console.log(`PDF generated: ${outputFile}`);

    return `http://localhost:5000/GeneratedOfferLetter/${fileName}`;
}

