import crypto from 'crypto';

function getPepper() {
    return process.env.TOKEN_PEPPER || process.env.JWT_SECRET || 'hr-management-dev-token-pepper';
}

export function hashTokenSecret(secret) {
    return crypto.createHmac('sha256', getPepper()).update(secret).digest('hex');
}

export function generateContractToken() {
    const publicId = crypto.randomBytes(16).toString('hex');
    const secret = crypto.randomBytes(32).toString('hex');
    const token = `${publicId}.${secret}`;

    return {
        publicId,
        secret,
        token,
        secretHash: hashTokenSecret(secret)
    };
}

export function parseContractToken(token = '') {
    const [publicId, secret, extra] = String(token).split('.');
    if (!publicId || !secret || extra) {
        return null;
    }

    return { publicId, secret };
}

export function validateTokenSecret(secret, storedHash) {
    const computed = hashTokenSecret(secret);
    const computedBuffer = Buffer.from(computed, 'hex');
    const storedBuffer = Buffer.from(storedHash || '', 'hex');

    if (computedBuffer.length !== storedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(computedBuffer, storedBuffer);
}
