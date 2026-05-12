import crypto from 'crypto';
import Contract from '../models/contractModel.js';
import ContractInvitation from '../models/contractInvitationModel.js';
import AcceptanceAudit from '../models/acceptanceAuditModel.js';
import Notification from '../models/notificationModel.js';
import User from '../models/userModel.js';
import { ROLE_CEO, ROLE_HR, ROLE_WORKER } from '../constants/roles.js';
import { canonicalJson } from '../utils/canonicalJson.js';
import { encryptPagesData, decryptPagesData } from '../utils/contractEncryption.js';
import {
    generateContractToken,
    parseContractToken,
    validateTokenSecret
} from '../utils/contractToken.js';
import {
    generateOtp,
    verifyOtp,
    canSendOtp,
    MAX_OTP_ATTEMPTS
} from '../services/contractOtpService.js';
import {
    CONTRACT_SESSION_COOKIE,
    PRE_SESSION_COOKIE,
    createContractSession,
    createPreSession,
    getCookieOptions,
    verifyContractSession,
    verifyPreSession
} from '../utils/contractSession.js';
import { signEvidence } from '../utils/acceptanceSigning.js';
import {
    maskEmail,
    sendContractInvitationEmail,
    sendContractOtpEmail
} from '../services/contractEmailService.js';
import { publishBroadcast } from '../services/messaging/broadcastPublisher.js';
import { buildEmploymentAgreementStructuredData } from '../services/contractTemplateBuilder.js';
import { replaceVariables } from '../services/offerLetter/pdfTemplateBuilder.js';

function getTokenExpiry() {
    const days = Number(process.env.CONTRACT_LINK_EXPIRY_DAYS) || 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || req.ip;
}

function normalizeName(name = '') {
    return String(name).trim().replace(/\s+/g, ' ').toLowerCase();
}

function getRequiredPageIds(pagesData = []) {
    return pagesData.map((page, index) => `page-${page.pageNumber || index + 1}`);
}

function applyMetadataToPages(pagesData = [], metadata = {}) {
    return pagesData.map((page, pageIndex) => ({
        ...page,
        pageNumber: page.pageNumber || pageIndex + 1,
        paragraphs: (page.paragraphs || []).map((paragraph) => ({
            ...paragraph,
            content: paragraph.type === 'image'
                ? paragraph.content
                : replaceVariables(paragraph.content, metadata)
        }))
    }));
}

async function saveContractAcceptedNotification({ worker, contract, acceptedAt }) {
    const recipients = await User.find(
        { role: { $in: [ROLE_CEO, ROLE_HR] } },
        '_id'
    ).lean();

    if (!recipients.length) {
        console.warn('[Contracts] No CEO/HR users found for acceptance notification');
        return { count: 0 };
    }

    const metadata = {
        type: 'CONTRACT_ACCEPTED',
        contractId: contract._id.toString(),
        workerId: worker._id.toString(),
        workerName: worker.name,
        workerEmail: worker.email,
        acceptedAt: acceptedAt.toISOString()
    };

    const docs = recipients.map((recipient) => ({
        title: 'Contract accepted',
        message: `${worker.name} has accepted the employment contract.`,
        type: 'broadcast',
        priority: 'high',
        recipient: recipient._id,
        sentBy: contract.createdBy || null,
        sentAt: acceptedAt,
        metadata,
        readAt: null
    }));

    await Notification.insertMany(docs, { ordered: false });
    return { count: docs.length };
}

export async function generateContractTemplate(req, res) {
    try {
        const structuredData = buildEmploymentAgreementStructuredData(req.body || {});
        return res.status(200).json({
            success: true,
            data: structuredData
        });
    } catch (error) {
        console.error('[Contracts] Failed to generate template:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate contract template.',
            error: error.message
        });
    }
}

function validateActiveInvitation(invitation) {
    if (!invitation || invitation.status !== 'active') {
        return 'This contract link is invalid or no longer active.';
    }

    if (invitation.tokenExpiry <= new Date()) {
        return 'This contract link has expired. Please contact HR.';
    }

    return null;
}

function setPreSessionCookie(res, publicId) {
    const token = createPreSession(publicId);
    const maxAge = (Number(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000;
    res.cookie(PRE_SESSION_COOKIE, token, getCookieOptions(maxAge));
}

function setContractSessionCookie(res, contractId, workerId) {
    const token = createContractSession(contractId, workerId);
    const maxAge = (Number(process.env.CONTRACT_SESSION_EXPIRY_MINUTES) || 30) * 60 * 1000;
    res.cookie(CONTRACT_SESSION_COOKIE, token, getCookieOptions(maxAge));
}

function clearContractCookies(res) {
    res.clearCookie(PRE_SESSION_COOKIE, { path: '/' });
    res.clearCookie(CONTRACT_SESSION_COOKIE, { path: '/' });
}

function readContractSession(req) {
    const token = req.cookies?.[CONTRACT_SESSION_COOKIE];
    if (!token) {
        throw new Error('Contract session required');
    }

    return verifyContractSession(token);
}

async function sendOtpForInvitation(invitation, worker) {
    const sendCheck = canSendOtp(invitation);
    if (!sendCheck.allowed) {
        const error = new Error(sendCheck.message);
        error.statusCode = 429;
        throw error;
    }

    const { otp, otpHash, otpExpiry } = generateOtp();
    invitation.otpHash = otpHash;
    invitation.otpExpiry = otpExpiry;
    invitation.otpAttemptCount = 0;
    invitation.otpSendCount = (invitation.otpSendCount || 0) + 1;
    invitation.lastOtpSentAt = new Date();
    await invitation.save();
    await sendContractOtpEmail(worker, otp);
}

function hasUsableOtp(invitation) {
    return Boolean(
        invitation.otpHash
        && invitation.otpExpiry
        && invitation.otpExpiry > new Date()
    );
}

export async function sendContract(req, res) {
    try {
        const { workerId, pagesData, metadata = {} } = req.body;

        if (!workerId || !Array.isArray(pagesData) || pagesData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Worker and contract pages are required.'
            });
        }

        const worker = await User.findOne({ _id: workerId, role: ROLE_WORKER });
        if (!worker) {
            return res.status(404).json({ success: false, message: 'Worker not found.' });
        }

        const contractMetadata = {
            ...metadata,
            name: metadata.name || metadata.workerName || worker.name,
            workerName: metadata.workerName || worker.name,
            workerEmail: metadata.workerEmail || worker.email
        };
        const resolvedPagesData = applyMetadataToPages(pagesData, contractMetadata);
        const { encryptedData, encryptedDataKey } = encryptPagesData(resolvedPagesData);
        const contentHash = crypto.createHash('sha256').update(canonicalJson(resolvedPagesData)).digest('hex');

        const contract = await Contract.create({
            workerId: worker._id,
            createdBy: req.user.userId,
            status: 'sent',
            pagesDataEncrypted: encryptedData,
            encryptedDataKey,
            contentHash,
            metadata: contractMetadata,
            sentAt: new Date()
        });

        const { publicId, token, secretHash } = generateContractToken();
        await ContractInvitation.create({
            contractId: contract._id,
            workerId: worker._id,
            publicId,
            secretHash,
            tokenExpiry: getTokenExpiry(),
            status: 'active'
        });

        worker.onboardingStatus = 'contract_sent';
        await worker.save();

        const emailResult = await sendContractInvitationEmail(worker, token);

        return res.status(201).json({
            success: true,
            message: emailResult.delivered
                ? 'Contract sent successfully.'
                : 'Contract created. SMTP is not configured, so the email was logged on the backend.',
            contractId: contract._id
        });
    } catch (error) {
        console.error('[Contracts] Failed to send contract:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send contract.',
            error: error.message
        });
    }
}

export async function exchangeContractToken(req, res) {
    try {
        const parsed = parseContractToken(req.body.token);
        if (!parsed) {
            return res.status(400).json({ success: false, message: 'Invalid contract link.' });
        }

        const invitation = await ContractInvitation.findOne({ publicId: parsed.publicId });
        const invitationError = validateActiveInvitation(invitation);
        if (invitationError) {
            return res.status(401).json({ success: false, message: invitationError });
        }

        if (!validateTokenSecret(parsed.secret, invitation.secretHash)) {
            return res.status(401).json({ success: false, message: 'Invalid contract link.' });
        }

        const contract = await Contract.findById(invitation.contractId);
        if (!contract || ['accepted', 'revoked', 'expired'].includes(contract.status)) {
            return res.status(410).json({ success: false, message: 'This contract is no longer available.' });
        }

        const worker = await User.findById(invitation.workerId);
        if (!worker) {
            return res.status(404).json({ success: false, message: 'Worker not found.' });
        }

        const reusedExistingOtp = hasUsableOtp(invitation);
        if (!reusedExistingOtp) {
            await sendOtpForInvitation(invitation, worker);
        }
        setPreSessionCookie(res, invitation.publicId);

        return res.json({
            success: true,
            message: reusedExistingOtp
                ? 'OTP was already sent to registered email.'
                : 'OTP sent to registered email.',
            maskedEmail: maskEmail(worker.email)
        });
    } catch (error) {
        console.error('[Contracts] Token exchange failed:', error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to start contract verification.'
        });
    }
}

export async function resendContractOtp(req, res) {
    try {
        const preSession = verifyPreSession(req.cookies?.[PRE_SESSION_COOKIE]);
        const invitation = await ContractInvitation.findOne({ publicId: preSession.publicId, status: 'active' });
        const invitationError = validateActiveInvitation(invitation);
        if (invitationError) {
            return res.status(401).json({ success: false, message: invitationError });
        }

        const worker = await User.findById(invitation.workerId);
        if (!worker) {
            return res.status(404).json({ success: false, message: 'Worker not found.' });
        }

        await sendOtpForInvitation(invitation, worker);
        setPreSessionCookie(res, invitation.publicId);

        return res.json({
            success: true,
            message: 'A new OTP has been sent.',
            maskedEmail: maskEmail(worker.email)
        });
    } catch (error) {
        return res.status(error.statusCode || 401).json({
            success: false,
            message: error.statusCode ? error.message : 'Unable to resend OTP.'
        });
    }
}

export async function verifyContractOtp(req, res) {
    try {
        const { otp } = req.body;
        const preSession = verifyPreSession(req.cookies?.[PRE_SESSION_COOKIE]);
        const invitation = await ContractInvitation.findOne({ publicId: preSession.publicId, status: 'active' });
        const invitationError = validateActiveInvitation(invitation);
        if (invitationError) {
            return res.status(401).json({ success: false, message: invitationError });
        }

        if (!otp || !invitation.otpHash || !invitation.otpExpiry) {
            return res.status(400).json({ success: false, message: 'OTP is required.' });
        }

        if ((invitation.otpAttemptCount || 0) >= MAX_OTP_ATTEMPTS) {
            return res.status(429).json({ success: false, message: 'Too many OTP attempts. Please contact HR.' });
        }

        if (invitation.otpExpiry <= new Date()) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
        }

        if (!verifyOtp(otp, invitation.otpHash)) {
            invitation.otpAttemptCount = (invitation.otpAttemptCount || 0) + 1;
            await invitation.save();
            return res.status(400).json({ success: false, message: 'Invalid verification code.' });
        }

        invitation.otpHash = undefined;
        invitation.otpExpiry = undefined;
        invitation.otpAttemptCount = 0;
        await invitation.save();

        const contract = await Contract.findById(invitation.contractId);
        if (!contract || ['accepted', 'revoked', 'expired'].includes(contract.status)) {
            return res.status(410).json({ success: false, message: 'This contract is no longer available.' });
        }

        if (contract.status === 'sent') {
            contract.status = 'viewed';
            contract.viewedAt = new Date();
            await contract.save();
            await User.updateOne({ _id: contract.workerId }, { onboardingStatus: 'contract_viewed' });
        }

        setContractSessionCookie(res, contract._id, invitation.workerId);
        res.clearCookie(PRE_SESSION_COOKIE, { path: '/' });

        return res.json({ success: true, message: 'OTP verified.' });
    } catch {
        return res.status(401).json({ success: false, message: 'Verification session expired. Please reopen the contract link.' });
    }
}

export async function getCurrentContract(req, res) {
    try {
        const session = readContractSession(req);
        const contract = await Contract.findById(session.contractId);

        if (!contract || contract.workerId.toString() !== session.workerId) {
            return res.status(404).json({ success: false, message: 'Contract not found.' });
        }

        if (['accepted', 'revoked', 'expired'].includes(contract.status)) {
            return res.status(410).json({ success: false, message: 'This contract is no longer available.' });
        }

        const worker = await User.findById(contract.workerId).select('name email');
        const pagesData = decryptPagesData(contract.pagesDataEncrypted, contract.encryptedDataKey);

        return res.json({
            success: true,
            contract: {
                contractId: contract._id,
                workerName: worker.name,
                workerEmail: worker.email,
                pagesData,
                contentHash: contract.contentHash,
                status: contract.status
            }
        });
    } catch {
        return res.status(401).json({ success: false, message: 'Contract session expired. Please reopen the email link.' });
    }
}

export async function acceptCurrentContract(req, res) {
    try {
        const session = readContractSession(req);
        const { electronicConsent, agreementConsent, typedName, viewedSections = [] } = req.body;

        if (!electronicConsent || !agreementConsent) {
            return res.status(400).json({ success: false, message: 'Both consent checkboxes are required.' });
        }

        const contract = await Contract.findById(session.contractId);
        if (!contract || contract.workerId.toString() !== session.workerId) {
            return res.status(404).json({ success: false, message: 'Contract not found.' });
        }

        if (!['sent', 'viewed'].includes(contract.status)) {
            return res.status(409).json({ success: false, message: 'This contract cannot be accepted.' });
        }

        const worker = await User.findById(contract.workerId);
        if (!worker) {
            return res.status(404).json({ success: false, message: 'Worker not found.' });
        }

        if (!typedName || normalizeName(typedName) !== normalizeName(worker.name)) {
            return res.status(400).json({ success: false, message: 'Typed name must match the worker name.' });
        }

        const pagesData = decryptPagesData(contract.pagesDataEncrypted, contract.encryptedDataKey);
        const requiredSections = getRequiredPageIds(pagesData);
        const viewedSet = new Set(Array.isArray(viewedSections) ? viewedSections : []);
        const allViewed = requiredSections.every((sectionId) => viewedSet.has(sectionId));

        if (!allViewed) {
            return res.status(400).json({ success: false, message: 'Please view every contract page before accepting.' });
        }

        const acceptedAt = new Date();
        const evidence = {
            eventType: 'CONTRACT_ACCEPTED',
            contractId: contract._id.toString(),
            contractVersion: contract.version,
            contentHash: contract.contentHash,
            workerId: worker._id.toString(),
            workerEmail: worker.email,
            workerName: worker.name,
            typedAcceptedName: typedName.trim(),
            electronicConsent: true,
            agreementConsent: true,
            viewedSections: requiredSections,
            ip: getClientIp(req),
            userAgent: req.headers['user-agent'] || '',
            acceptedAt: acceptedAt.toISOString()
        };
        const { evidenceHash, signature } = signEvidence(evidence);

        contract.status = 'accepted';
        contract.acceptedAt = acceptedAt;
        contract.acceptedIP = evidence.ip;
        contract.acceptedUserAgent = evidence.userAgent;
        contract.acceptedName = typedName.trim();
        contract.signature = signature;
        await contract.save();

        await AcceptanceAudit.create({
            contractId: contract._id,
            workerId: worker._id,
            eventType: 'accepted',
            evidence,
            evidenceHash,
            signature
        });

        await ContractInvitation.updateOne(
            { contractId: contract._id, status: 'active' },
            { status: 'consumed', consumedAt: acceptedAt }
        );

        await User.updateOne({ _id: worker._id }, { onboardingStatus: 'contract_accepted' });

        try {
            await publishBroadcast({
                payload: {
                    title: 'Contract accepted',
                    message: `${worker.name} has accepted the employment contract.`,
                    priority: 'high',
                    sentBy: contract.createdBy || null,
                    sentAt: acceptedAt.toISOString(),
                    metadata: {
                        type: 'CONTRACT_ACCEPTED',
                        contractId: contract._id.toString(),
                        workerId: worker._id.toString(),
                        workerName: worker.name,
                        workerEmail: worker.email,
                        acceptedAt: acceptedAt.toISOString()
                    }
                }
            });
        } catch (error) {
            console.warn('[Contracts] RabbitMQ notification failed:', error.message);
            try {
                const { count } = await saveContractAcceptedNotification({ worker, contract, acceptedAt });
                console.log(`[Contracts] Saved acceptance notification for ${count} CEO/HR user(s)`);
            } catch (dbError) {
                console.error('[Contracts] Failed to save acceptance notification:', dbError.message);
            }
        }

        clearContractCookies(res);

        return res.json({ success: true, message: 'Contract accepted successfully.' });
    } catch (error) {
        console.error('[Contracts] Acceptance failed:', error);
        return res.status(401).json({
            success: false,
            message: error.message || 'Unable to accept contract.'
        });
    }
}
