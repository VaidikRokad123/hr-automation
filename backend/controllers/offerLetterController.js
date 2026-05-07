import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

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

        const doc = new jsPDF();

        // Load images as base64
        const templatePath = path.join(__dirname, '../public/images/offerletter/temp.png');
        const signPath = path.join(__dirname, '../public/images/offerletter/sign2.png');
        const transparentPath = path.join(__dirname, '../public/images/offerletter/transparent.png');

        let template, sign, transparent;
        
        try {
            template = fs.readFileSync(templatePath).toString('base64');
            sign = fs.readFileSync(signPath).toString('base64');
            transparent = fs.readFileSync(transparentPath).toString('base64');
        } catch (error) {
            console.error('Error loading images:', error);
            return res.status(500).json({ error: 'Failed to load template images' });
        }

        doc.addImage(`data:image/png;base64,${template}`, "PNG", 0, 0, 210, 297);
        doc.setFontSize(11);

        let yPosition = 45;

        doc.text(inpDate, 150, yPosition);
        yPosition += 15;
        doc.addImage(`data:image/png;base64,${transparent}`, "PNG", 7, 55, 200, 200);

        doc.text(to, 25, yPosition, { lineHeightFactor: 1.5 });
        yPosition += 13;

        doc.text(subject, doc.internal.pageSize.getWidth() / 2, yPosition, { align: "center" });
        yPosition += 13;

        doc.text(firstParagraph, 25, yPosition, {
            maxWidth: 160,
            align: "justify",
            lineHeightFactor: 1.5
        });
        yPosition += doc.splitTextToSize(firstParagraph, 160).length * 6.5 + 5;

        doc.text(secondParagraph, 25, yPosition, {
            maxWidth: 160,
            align: "justify",
            lineHeightFactor: 1.5
        });
        yPosition += doc.splitTextToSize(secondParagraph, 160).length * 6.5 + 5;

        doc.text(salaryParagraph, 25, yPosition, {
            maxWidth: 160,
            align: "justify",
            lineHeightFactor: 1.5
        });
        yPosition += doc.splitTextToSize(salaryParagraph, 160).length * 6.5 + 5;

        doc.text(thirdParagraph, 25, yPosition, {
            maxWidth: 160,
            align: "justify",
            lineHeightFactor: 1.5
        });
        yPosition += doc.splitTextToSize(thirdParagraph, 160).length * 6.5 + 3;

        doc.text(t1, 25, yPosition, {
            maxWidth: 160,
            align: "justify",
            lineHeightFactor: 1.5
        });
        yPosition += doc.splitTextToSize(t1, 160).length * 6.5 + 3;

        doc.text(t2, 25, yPosition, {
            maxWidth: 160,
            align: "justify",
            lineHeightFactor: 1.5
        });
        yPosition += doc.splitTextToSize(t2, 160).length * 6.5 + 3;

        doc.addPage();
        doc.addImage(`data:image/png;base64,${template}`, "PNG", 0, 0, 210, 297);
        doc.addImage(`data:image/png;base64,${transparent}`, "PNG", 7, 55, 200, 200);
        yPosition = 45;

        doc.text(t3, 25, yPosition, {
            maxWidth: 160,
            align: "justify",
            lineHeightFactor: 1.5
        });
        yPosition += doc.splitTextToSize(t3, 160).length * 6.5 + 3;

        doc.text(director, 25, yPosition, { lineHeightFactor: 1.5 });
        yPosition += 15;

        doc.addImage(`data:image/png;base64,${sign}`, "PNG", 25, yPosition, 40, 20);
        yPosition += 25;

        doc.text(companyName, 25, yPosition);
        yPosition += 10;

        doc.text(spac, doc.internal.pageSize.getWidth() / 2, yPosition, { align: "center" });
        yPosition += 10;

        doc.text(footer1, 25, yPosition, {
            maxWidth: 160,
            align: "justify",
            lineHeightFactor: 1.5
        });
        yPosition += doc.splitTextToSize(footer1, 160).length * 6.5 + 3;

        doc.text(footer2, 25, yPosition);
        yPosition += 10;
        
        doc.text(footer3, 25, yPosition);
        yPosition += 10;

        doc.text(footer4, 25, yPosition);

        // Generate PDF as buffer
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${internType}_Letter_${upperName}.pdf"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
};
