import { formatOrdinalDate } from '../utils/dateFormatter.js';

function pluralizeUnit(value, unit) {
    return `${value} ${unit}${Number(value) > 1 ? 's' : ''}`;
}

function clean(value, fallback = '') {
    return String(value || fallback).trim();
}

function buildSalaryText({ salaryType, salaryAmount }) {
    if (salaryType === 'unpaid') {
        return 'no stipend';
    }

    const amount = clean(salaryAmount, 'INR 50,000');
    return amount.toLowerCase().startsWith('inr') ? amount : `INR ${amount}`;
}

const CONTRACT_PAGE_HEIGHT_MM = 297;
const CONTRACT_TOP_PADDING_MM = 38;
const CONTRACT_BOTTOM_PADDING_MM = 18;
const CONTRACT_CONTENT_HEIGHT_MM = CONTRACT_PAGE_HEIGHT_MM - CONTRACT_TOP_PADDING_MM - CONTRACT_BOTTOM_PADDING_MM;
const CONTRACT_CONTENT_WIDTH_MM = 210 - (25 * 2);
const CONTRACT_FONT_SIZE_PT = 11;
const CONTRACT_LINE_HEIGHT = 1.5;
const CONTRACT_FONT_MM = CONTRACT_FONT_SIZE_PT * 0.352778;
const CONTRACT_LINE_MM = CONTRACT_FONT_MM * CONTRACT_LINE_HEIGHT;
const CONTRACT_PACKING_LIMIT_MM = CONTRACT_CONTENT_HEIGHT_MM - 3;

function stripHtml(value = '') {
    return String(value).replace(/<[^>]*>/g, ' ');
}

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

    const unitWidthMm = CONTRACT_FONT_MM * 0.48;
    const maxUnitsPerLine = Math.max(1, CONTRACT_CONTENT_WIDTH_MM / unitWidthMm);
    const words = plain.split(' ');
    let lines = 1;
    let currentUnits = 0;

    for (const word of words) {
        const wordUnits = estimateTextUnits(word);
        const nextUnits = currentUnits === 0 ? wordUnits : wordUnits + 0.33;

        if (nextUnits > maxUnitsPerLine) {
            const forcedLines = Math.max(1, Math.ceil(wordUnits / maxUnitsPerLine));
            lines += forcedLines - (currentUnits === 0 ? 0 : 1);
            currentUnits = wordUnits % maxUnitsPerLine;
            continue;
        }

        if (currentUnits + nextUnits > maxUnitsPerLine) {
            lines += 1;
            currentUnits = wordUnits;
        } else {
            currentUnits += nextUnits;
        }
    }

    return Math.max(1, lines);
}

function estimateContractBlockHeightMm(paragraph) {
    const content = paragraph?.content || '';
    const lineCount = estimateWrappedLineCount(content);

    switch (paragraph?.type) {
        case 'date':
            return CONTRACT_LINE_MM + 7;
        case 'subject':
            return CONTRACT_LINE_MM + 9;
        case 'signature': {
            const explicitLines = Math.max(1, String(content).split(/<br\s*\/?>|\n/i).length);
            return (explicitLines * CONTRACT_LINE_MM) + 13;
        }
        case 'footer':
            return (lineCount * CONTRACT_LINE_MM) + 5;
        case 'image':
            return 65;
        case 'company':
        case 'separator':
            return CONTRACT_LINE_MM + 10;
        case 'to':
            return (Math.max(1, String(content).split(/<br\s*\/?>|\n/i).length) * CONTRACT_LINE_MM) + 5;
        default:
            return (lineCount * CONTRACT_LINE_MM) + 5;
    }
}

function shouldKeepWithNext(paragraph, nextParagraph) {
    return paragraph?.type === 'subject' && nextParagraph?.type === 'paragraph';
}

function paginateContractParagraphs(paragraphs) {
    const pages = [];
    let currentParagraphs = [];
    let currentHeight = 0;

    for (let index = 0; index < paragraphs.length; index += 1) {
        const paragraph = paragraphs[index];
        const nextParagraph = paragraphs[index + 1];
        const blockHeight = estimateContractBlockHeightMm(paragraph);
        const keepWithNextHeight = shouldKeepWithNext(paragraph, nextParagraph)
            ? blockHeight + estimateContractBlockHeightMm(nextParagraph)
            : blockHeight;

        if (currentParagraphs.length > 0 && currentHeight + keepWithNextHeight > CONTRACT_PACKING_LIMIT_MM) {
            pages.push({ pageNumber: pages.length + 1, paragraphs: currentParagraphs });
            currentParagraphs = [];
            currentHeight = 0;
        }

        if (currentParagraphs.length > 0 && currentHeight + blockHeight > CONTRACT_PACKING_LIMIT_MM) {
            pages.push({ pageNumber: pages.length + 1, paragraphs: currentParagraphs });
            currentParagraphs = [];
            currentHeight = 0;
        }

        currentParagraphs.push(paragraph);
        currentHeight += blockHeight;
    }

    if (currentParagraphs.length > 0) {
        pages.push({ pageNumber: pages.length + 1, paragraphs: currentParagraphs });
    }

    return pages;
}

export function buildEmploymentAgreementStructuredData(payload = {}) {
    const employeeName = clean(payload.name || payload.workerName, 'Vaidik Rokad');
    const role = clean(payload.role, 'Software Engineer Intern');
    const startDate = payload.startDate || '2026-06-01';
    const agreementDateValue = payload.agreementDate || payload.date || new Date();
    const agreementDate = formatOrdinalDate(agreementDateValue) || '12 May 2026';
    const commencementDate = formatOrdinalDate(startDate) || '1 June 2026';
    const duration = clean(payload.duration, '6');
    const durationType = clean(payload.durationType, 'month');
    const termText = pluralizeUnit(duration, durationType);
    const salaryText = buildSalaryText(payload);
    const salaryWords = clean(payload.salaryWords, 'Rupees Fifty Thousand Only');
    const salaryLine = payload.salaryType === 'unpaid'
        ? 'The Employee shall not receive a stipend during the term of this Agreement.'
        : `The Employee shall receive a stipend of ${salaryText} (${salaryWords}) per month.`;
    const probationText = clean(payload.probationPeriod, 'three months');
    const companyName = clean(payload.companyName, 'ABC Technologies Private Limited');
    const companyOffice = clean(payload.companyOffice, 'Ahmedabad, Gujarat, India');
    const managerTitle = clean(payload.managerTitle, 'Engineering Manager');
    const signatoryName = clean(payload.signatoryName, 'Rajesh Sharma');
    const signatoryTitle = clean(payload.signatoryTitle, 'Chief Executive Officer');

    const paragraphs = [
        { id: 'agreement-date', content: `Date: ${agreementDate}`, type: 'date' },
        { id: 'title', content: 'EMPLOYMENT AGREEMENT', type: 'subject' },
        { id: 'intro', content: `This Employment Agreement ("Agreement") is made and entered into on ${agreementDate} by and between ${companyName}, a company incorporated under the laws of India and having its registered office at ${companyOffice} (hereinafter referred to as the "Company"), and ${employeeName} (hereinafter referred to as the "Employee").`, type: 'paragraph' },
        { id: 'intent', content: 'The Company desires to employ the Employee, and the Employee agrees to accept employment with the Company, upon the terms and conditions set forth in this Agreement.', type: 'paragraph' },
        { id: 'appointment-heading', content: '1. APPOINTMENT', type: 'subject' },
        { id: 'appointment-1', content: `The Company hereby appoints the Employee to the position of ${role}. The Employee accepts this appointment and agrees to devote their full professional time, attention, and abilities to the duties assigned by the Company.`, type: 'paragraph' },
        { id: 'appointment-2', content: `The Employee shall report to the ${managerTitle} or any other person designated by the Company. The Employee's duties shall include software development, testing, debugging, documentation, collaboration with team members, participation in meetings, and any other responsibilities reasonably assigned by the Company.`, type: 'paragraph' },
        { id: 'term-heading', content: '2. COMMENCEMENT AND TERM', type: 'subject' },
        { id: 'term-1', content: `The employment shall commence on ${commencementDate}.`, type: 'paragraph' },
        { id: 'term-2', content: `The initial term of this Agreement shall be ${termText}, unless terminated earlier in accordance with the provisions of this Agreement. Subject to satisfactory performance and business requirements, the Company may extend the internship or offer full-time employment.`, type: 'paragraph' },
        { id: 'workplace-heading', content: '3. PLACE OF WORK', type: 'subject' },
        { id: 'workplace-1', content: `The Employee's primary place of work shall be the Company's office in ${companyOffice}.`, type: 'paragraph' },
        { id: 'workplace-2', content: 'The Company may require the Employee to work remotely, travel to client sites, or relocate temporarily or permanently, subject to applicable laws and reasonable notice.', type: 'paragraph' },
        { id: 'hours-heading', content: '4. WORKING HOURS', type: 'subject' },
        { id: 'hours-1', content: 'The Employee shall work Monday through Friday from 9:00 AM to 6:00 PM, with a one-hour lunch break.', type: 'paragraph' },
        { id: 'hours-2', content: 'The Employee may be required to work additional hours when necessary to meet project deadlines, resolve production issues, or satisfy business requirements. Such additional hours shall be compensated or adjusted in accordance with Company policy and applicable law.', type: 'paragraph' },
        { id: 'comp-heading', content: '5. COMPENSATION', type: 'subject' },
        { id: 'comp-1', content: salaryLine, type: 'paragraph' },
        { id: 'comp-2', content: 'All payments shall be made by bank transfer after deduction of applicable taxes and statutory contributions.', type: 'paragraph' },
        { id: 'comp-3', content: "The Employee acknowledges that compensation may be revised from time to time at the Company's sole discretion based on performance, market conditions, and business considerations.", type: 'paragraph' },
        { id: 'benefits-heading', content: '6. BENEFITS', type: 'subject' },
        { id: 'benefits-1', content: 'During employment, the Employee may be eligible for benefits including paid public holidays, casual and sick leave in accordance with Company policy, access to internal training programs, and participation in wellness and team engagement activities.', type: 'paragraph' },
        { id: 'benefits-2', content: "Any additional benefits are governed by Company policy and may be modified or withdrawn at the Company's discretion.", type: 'paragraph' },
        { id: 'probation-heading', content: '7. PROBATION', type: 'subject' },
        { id: 'probation-1', content: `The Employee shall be on probation for the first ${probationText} of employment.`, type: 'paragraph' },
        { id: 'probation-2', content: 'During probation, performance, conduct, attendance, and adaptability will be evaluated. The Company may confirm employment, extend probation, or terminate employment depending on the evaluation results.', type: 'paragraph' },
        { id: 'duties-heading', content: '8. DUTIES AND RESPONSIBILITIES', type: 'subject' },
        { id: 'duties-1', content: 'The Employee agrees to perform duties honestly, diligently, and professionally; follow all lawful instructions of the Company; protect Company property and confidential information; maintain accurate records and documentation; comply with all Company policies and procedures; avoid conflicts of interest; and immediately report security incidents, data breaches, or policy violations.', type: 'paragraph' },
        { id: 'performance-heading', content: '9. PERFORMANCE STANDARDS', type: 'subject' },
        { id: 'performance-1', content: 'The Employee is expected to meet established quality and productivity standards. Regular feedback may be provided through code reviews, one-on-one meetings, and formal performance evaluations. Unsatisfactory performance may result in coaching, performance improvement plans, disciplinary action, or termination.', type: 'paragraph' },
        { id: 'confidentiality-heading', content: '10. CONFIDENTIALITY', type: 'subject' },
        { id: 'confidentiality-1', content: 'The Employee acknowledges that they may have access to confidential and proprietary information, including source code and software architecture, business strategies and financial data, customer and employee information, product roadmaps and research, and security procedures and credentials.', type: 'paragraph' },
        { id: 'confidentiality-2', content: 'The Employee agrees not to disclose, copy, or use confidential information except as required for Company duties. These obligations continue after employment ends.', type: 'paragraph' },
        { id: 'ip-heading', content: '11. INTELLECTUAL PROPERTY', type: 'subject' },
        { id: 'ip-1', content: "All inventions, discoveries, designs, software, documentation, and other work products created by the Employee during employment that relate to the Company's business shall be the sole and exclusive property of the Company.", type: 'paragraph' },
        { id: 'ip-2', content: 'The Employee hereby assigns all rights, title, and interest in such work products to the Company and agrees to execute any documents necessary to confirm ownership.', type: 'paragraph' },
        { id: 'data-heading', content: '12. DATA PROTECTION', type: 'subject' },
        { id: 'data-1', content: 'The Employee shall comply with all applicable data protection laws and Company security policies. The Employee shall use strong passwords and multi-factor authentication where required, access systems only for authorized purposes, secure devices and prevent unauthorized access, and promptly report suspected security incidents.', type: 'paragraph' },
        { id: 'non-solicit-heading', content: '13. NON-SOLICITATION', type: 'subject' },
        { id: 'non-solicit-1', content: 'During employment and for twelve months after termination, the Employee shall not solicit Company employees, contractors, or customers to leave the Company or reduce their business relationship with the Company.', type: 'paragraph' },
        { id: 'leave-heading', content: '14. LEAVE AND ABSENCE', type: 'subject' },
        { id: 'leave-1', content: 'The Employee shall be entitled to leave in accordance with Company policy and applicable law. Planned leave should be requested in advance. Unplanned absences must be reported as soon as reasonably possible. Excessive unauthorized absence may result in disciplinary action.', type: 'paragraph' },
        { id: 'property-heading', content: '15. COMPANY PROPERTY', type: 'subject' },
        { id: 'property-1', content: 'All equipment, documents, access cards, devices, and materials provided by the Company remain Company property. Upon termination, the Employee shall immediately return all Company property and delete Company data from personal devices, if any.', type: 'paragraph' },
        { id: 'monitoring-heading', content: '16. MONITORING', type: 'subject' },
        { id: 'monitoring-1', content: 'The Employee understands that Company systems, devices, and communications may be monitored to ensure security, legal compliance, and operational integrity, subject to applicable law.', type: 'paragraph' },
        { id: 'conduct-heading', content: '17. CODE OF CONDUCT', type: 'subject' },
        { id: 'conduct-1', content: 'The Employee shall maintain professional behavior and comply with all workplace conduct policies, including anti-harassment, anti-discrimination, and ethical standards.', type: 'paragraph' },
        { id: 'discipline-heading', content: '18. DISCIPLINARY ACTION', type: 'subject' },
        { id: 'discipline-1', content: 'Violation of this Agreement or Company policies may result in disciplinary measures up to and including termination of employment and legal action.', type: 'paragraph' },
        { id: 'termination-heading', content: '19. TERMINATION', type: 'subject' },
        { id: 'termination-1', content: "Either party may terminate this Agreement by providing thirty (30) days' written notice. The Company may terminate employment immediately for serious misconduct, fraud, confidentiality breaches, data theft, harassment, or other material violations.", type: 'paragraph' },
        { id: 'termination-effect-heading', content: '20. EFFECT OF TERMINATION', type: 'subject' },
        { id: 'termination-effect-1', content: 'Upon termination, salary and benefits will be settled according to applicable law, access to Company systems will be revoked, confidentiality and intellectual property obligations will continue, and Company property must be returned.', type: 'paragraph' },
        { id: 'law-heading', content: '21. GOVERNING LAW', type: 'subject' },
        { id: 'law-1', content: 'This Agreement shall be governed by and interpreted in accordance with the laws of India. Any disputes arising out of this Agreement shall be subject to the exclusive jurisdiction of the courts in Ahmedabad, Gujarat.', type: 'paragraph' },
        { id: 'entire-heading', content: '22. ENTIRE AGREEMENT', type: 'subject' },
        { id: 'entire-1', content: 'This Agreement, together with Company policies incorporated by reference, constitutes the entire agreement between the parties and supersedes all prior discussions and understandings.', type: 'paragraph' },
        { id: 'amend-heading', content: '23. AMENDMENTS', type: 'subject' },
        { id: 'amend-1', content: 'No amendment to this Agreement shall be effective unless made in writing and signed by both parties.', type: 'paragraph' },
        { id: 'sever-heading', content: '24. SEVERABILITY', type: 'subject' },
        { id: 'sever-1', content: 'If any provision of this Agreement is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.', type: 'paragraph' },
        { id: 'waiver-heading', content: '25. WAIVER', type: 'subject' },
        { id: 'waiver-1', content: 'Failure by either party to enforce any provision shall not constitute a waiver of future enforcement.', type: 'paragraph' },
        { id: 'electronic-heading', content: '26. ELECTRONIC ACCEPTANCE', type: 'subject' },
        { id: 'electronic-1', content: 'The parties agree that this Agreement may be executed electronically and that electronic acceptance shall have the same legal effect as a handwritten signature.', type: 'paragraph' },
        { id: 'ack-heading', content: '27. ACKNOWLEDGEMENT', type: 'subject' },
        { id: 'ack-1', content: 'The Employee acknowledges that they have carefully read this Agreement, understand its terms, and have had the opportunity to seek independent advice before accepting it.', type: 'paragraph' },
        { id: 'witness', content: 'IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.', type: 'paragraph' },
        { id: 'company-signature', content: `For ${companyName}<br><br>Authorized Signatory:<br>Name: ${signatoryName}<br>Title: ${signatoryTitle}<br>Date: ${agreementDate}`, type: 'signature' },
        { id: 'employee-signature', content: `Employee<br><br>Name: ${employeeName}<br>Position: ${role}<br>Date: ______________________`, type: 'footer' },
        { id: 'acceptance-heading', content: 'Employee Acceptance Statement', type: 'subject' },
        { id: 'acceptance', content: `I, ${employeeName}, confirm that I have reviewed all pages of this Employment Agreement, understand the terms and conditions described above, consent to receive and sign this document electronically, and voluntarily accept this Agreement in its entirety.`, type: 'paragraph' }
    ];

    return {
        metadata: {
            ...payload,
            name: employeeName,
            upperName: employeeName.toUpperCase(),
            role,
            startDate,
            agreementDate: agreementDateValue,
            date: `Date: ${agreementDate}`,
            duration,
            durationType,
            termText,
            salaryAmount: salaryText,
            companyName,
            companyOffice,
            signatoryName,
            signatoryTitle
        },
        pages: paginateContractParagraphs(paragraphs)
    };
}
