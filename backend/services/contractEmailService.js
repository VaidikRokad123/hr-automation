import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
    if (transporter) {
        return transporter;
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return null;
    }

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: String(process.env.SMTP_PORT) === '465',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    return transporter;
}

function getFrontendUrl() {
    return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function maskEmail(email = '') {
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    return `${name.slice(0, 1)}***@${domain}`;
}

async function sendMail({ to, subject, html, text }) {
    const mailer = getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';

    if (!mailer) {
        console.warn(`[ContractEmail] SMTP is not configured. Dev email to ${to}: ${subject}\n${text}`);
        return { delivered: false };
    }

    await mailer.sendMail({ from, to, subject, html, text });
    return { delivered: true };
}

export async function sendContractInvitationEmail(worker, token) {
    const url = `${getFrontendUrl()}/accept-contract/${token}`;
    return sendMail({
        to: worker.email,
        subject: 'Your employment contract is ready for review',
        text: `Hello ${worker.name},\n\nPlease review your employment contract using this secure link:\n${url}\n\nThis link expires in ${Number(process.env.CONTRACT_LINK_EXPIRY_DAYS) || 7} days.`,
        html: `
            <p>Hello ${worker.name},</p>
            <p>Please review your employment contract using the secure link below.</p>
            <p><a href="${url}">Review contract</a></p>
            <p>This link expires in ${Number(process.env.CONTRACT_LINK_EXPIRY_DAYS) || 7} days.</p>
        `
    });
}

export async function sendContractOtpEmail(worker, otp) {
    return sendMail({
        to: worker.email,
        subject: 'Your contract verification code',
        text: `Hello ${worker.name},\n\nYour verification code is ${otp}.\n\nThis code expires in ${Number(process.env.OTP_EXPIRY_MINUTES) || 5} minutes.`,
        html: `
            <p>Hello ${worker.name},</p>
            <p>Your verification code is:</p>
            <h2 style="letter-spacing: 4px;">${otp}</h2>
            <p>This code expires in ${Number(process.env.OTP_EXPIRY_MINUTES) || 5} minutes.</p>
        `
    });
}

export { maskEmail };
