import crypto from 'crypto';

const MAX_OTP_ATTEMPTS = 5;
const MAX_OTP_SENDS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

function getOtpPepper() {
    return process.env.OTP_PEPPER || process.env.TOKEN_PEPPER || process.env.JWT_SECRET || 'hr-management-dev-otp-pepper';
}

export function hashOtp(otp) {
    return crypto.createHmac('sha256', getOtpPepper()).update(String(otp)).digest('hex');
}

export function generateOtp() {
    const length = Number(process.env.OTP_LENGTH) || 6;
    const min = 10 ** (length - 1);
    const max = 10 ** length;
    const otp = crypto.randomInt(min, max).toString().padStart(length, '0');
    const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES) || 5;

    return {
        otp,
        otpHash: hashOtp(otp),
        otpExpiry: new Date(Date.now() + expiryMinutes * 60 * 1000)
    };
}

export function verifyOtp(otp, storedHash) {
    const computed = Buffer.from(hashOtp(otp), 'hex');
    const stored = Buffer.from(storedHash || '', 'hex');

    if (computed.length !== stored.length) {
        return false;
    }

    return crypto.timingSafeEqual(computed, stored);
}

export function canSendOtp(invitation) {
    if ((invitation.otpSendCount || 0) >= MAX_OTP_SENDS) {
        return { allowed: false, message: 'Maximum OTP sends reached. Please contact HR.' };
    }

    if (invitation.lastOtpSentAt && Date.now() - invitation.lastOtpSentAt.getTime() < RESEND_COOLDOWN_MS) {
        return { allowed: false, message: 'Please wait before requesting another OTP.' };
    }

    return { allowed: true };
}

export { MAX_OTP_ATTEMPTS, MAX_OTP_SENDS, RESEND_COOLDOWN_MS };
