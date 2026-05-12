import jwt from 'jsonwebtoken';

const PRE_SESSION_COOKIE = 'contract_pre_session';
const CONTRACT_SESSION_COOKIE = 'contract_session';

function getSessionSecret() {
    return process.env.CONTRACT_SESSION_SECRET || process.env.JWT_SECRET || 'hr-management-dev-secret';
}

function isProduction() {
    return process.env.NODE_ENV === 'production';
}

export function getCookieOptions(maxAgeMs) {
    return {
        httpOnly: true,
        secure: isProduction(),
        sameSite: 'strict',
        maxAge: maxAgeMs,
        path: '/'
    };
}

export function createPreSession(publicId) {
    return jwt.sign(
        { publicId, purpose: 'contract_pre_session' },
        getSessionSecret(),
        { expiresIn: `${Number(process.env.OTP_EXPIRY_MINUTES) || 5}m` }
    );
}

export function verifyPreSession(token) {
    const decoded = jwt.verify(token, getSessionSecret());
    if (decoded.purpose !== 'contract_pre_session') {
        throw new Error('Invalid pre-session purpose');
    }
    return decoded;
}

export function createContractSession(contractId, workerId) {
    const minutes = Number(process.env.CONTRACT_SESSION_EXPIRY_MINUTES) || 30;
    return jwt.sign(
        {
            contractId: contractId.toString(),
            workerId: workerId.toString(),
            verified: true,
            purpose: 'contract_session'
        },
        getSessionSecret(),
        { expiresIn: `${minutes}m` }
    );
}

export function verifyContractSession(token) {
    const decoded = jwt.verify(token, getSessionSecret());
    if (decoded.purpose !== 'contract_session' || decoded.verified !== true) {
        throw new Error('Invalid contract session');
    }
    return decoded;
}

export { PRE_SESSION_COOKIE, CONTRACT_SESSION_COOKIE };
