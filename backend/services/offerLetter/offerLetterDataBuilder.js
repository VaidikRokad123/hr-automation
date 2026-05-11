import { formatOrdinalDate } from '../../utils/dateFormatter.js';

function pluralizeUnit(value, unit) {
    return `${value} ${unit}${Number(value) > 1 ? 's' : ''}`;
}

export function buildOfferLetterStructuredData(payload) {
    const {
        name, gender, internType, durationType, duration,
        role, startDate, endDate, salaryType, salaryAmount
    } = payload;

    if (!name || !gender || !internType || !durationType || !duration || !role || !startDate || !endDate || !salaryType) {
        throw new Error('Missing required fields');
    }

    const upperName = name.toUpperCase();
    const formattedStartDate = formatOrdinalDate(startDate);
    const formattedEndDate = formatOrdinalDate(endDate);
    const tenureText = pluralizeUnit(duration, durationType);
    const internTypeLabel = internType.replace('_', ' ');

    const inpDate = `Date: ${formatOrdinalDate(new Date())}`;
    const to = gender === 'male' ? `To,<br>Mr. ${upperName}` : `To,<br>Ms. ${upperName}`;
    const subject = internType === 'internship'
        ? 'Subject: Internship Offer Letter'
        : `Subject: ${internTypeLabel} Job Offer Letter`;

    const firstParagraph = `This letter is in reference to your application related to a request for a ${tenureText} ${internTypeLabel} at our firm. We are pleased to inform you that you have been granted ${tenureText} at our company and your designation during the ${internTypeLabel} shall be addressed as an ${role.toUpperCase()} at our company SAECULUM SOLUTIONS PVT LTD for this ${tenureText} period starting ${formattedStartDate}. Company shall inform your reporting manager at the time of joining. You are required to attend the office (for ${internTypeLabel}) on all working days (Monday to Friday, except National holidays and company declared holidays) and your timings shall be from 10:00 AM to 7.00 PM (includes lunch break).`;

    const secondParagraph = `Your ${internTypeLabel} tenure shall be from ${formattedStartDate} to ${formattedEndDate}. This association shall be considered as completed on ${formattedEndDate} or earlier, unless further extension is communicated in writing. Company shall not have any obligation to recruit you post cessation of your ${internTypeLabel} association with the company.`;

    const salaryParagraph = salaryType === 'paid'
        ? `During the tenure of your ${internTypeLabel}, you shall be paid a stipend/salary of ${salaryAmount} per month.`
        : `This ${internTypeLabel} shall be unpaid and no stipend/salary shall be provided during the tenure of your association with the company.`;

    const thirdParagraph = `This ${internTypeLabel} offer is subject to your acceptance to following terms (you joining the company shall mean and be interpreted as acceptance of following terms by you):`;
    const t1 = `1) Company, at its sole and exclusive discretion reserves the right to offer you further ${internTypeLabel} and/or job offer, subject to complete satisfaction of your performance (Both technical as well as from HR perspective); however, in no way shall company be obligated to provide extension or any further job offer.`;
    const t2 = `2) During the above-mentioned ${internTypeLabel} period, the company at its sole and exclusive discretion, reserves the right to immediately terminate the ${internTypeLabel} of the candidate (yours), without assigning any reason thereof.`;
    const t3 = `3) This letter does not construe upon any appointment, offer, contract or any terms that may be associated with employment, labor laws or otherwise as the company has on pro-bono basis accepted to train you and provide a platform to conduct your ${internTypeLabel} at company's premises. The intern shall adhere and follow the company's HR rule & regulations, code of conduct and other policies applicable in the office. The termination decision of the company shall be final and binding. Candidate (Trainee / Intern / you) hereby confirm and acknowledge that you have read all the above terms and conditions of the company and is deemed to be accepted by you and shall indemnify company under any obligation that may arise due to you joining our company as a Trainee/Intern, upon you joining the company under any capacity / designation. You further shall indemnify the company, its employees, its representatives, its consultants etc., but not limited to, in any matter of dispute and shall here further undertake not to undertake any legal actions, claim, recourse against the company in any manner related to this association, now and in future. Additionally, the company may require the intern to sign/execute an NDA for safeguarding the company and its clients' interests, to which intern shall agree.`;

    const director = `Sincerely,<br>HARDIKKUMAR VINZAVA<br>DIRECTOR`;
    const companyName = `SAECULUM SOLUTIONS PV LTD`;
    const separator = '--------------------------------X----------------------------X-----------------------';
    const footer1 = `I, ${upperName}, hereby accept the above - mentioned Internship offer alongwith the terms mentioned therein and acknowledge receiving a copy of the same.`;
    const footer2 = 'Signature_____________________' ;
    const footer3 = `Name of the Trainee Accepting offer ${upperName}`;
    const footer4 = 'Place of sole & exclusive Jurisdiction: Ahmedabad, Gujarat, India';

    return {
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
                    { id: 'separator', content: separator, type: 'separator' },
                    { id: 'footer1', content: footer1, type: 'footer' },
                    { id: 'footer2', content: footer2, type: 'footer' },
                    { id: 'footer3', content: footer3, type: 'footer' },
                    { id: 'footer4', content: footer4, type: 'footer' }
                ]
            }
        ]
    };
}
