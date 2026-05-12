import crypto from 'crypto';

function getMasterKey() {
    const configured = process.env.CONTRACT_MASTER_KEY;

    if (configured) {
        const key = Buffer.from(configured, 'base64');
        if (key.length === 32) {
            return key;
        }

        console.warn('[ContractEncryption] CONTRACT_MASTER_KEY must decode to 32 bytes; using derived fallback key.');
    }

    return crypto
        .createHash('sha256')
        .update(process.env.JWT_SECRET || 'hr-management-dev-secret')
        .digest();
}

function encryptWithKey(buffer, key) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
}

function decryptWithKey(payload, key) {
    const iv = payload.subarray(0, 12);
    const authTag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function encryptPagesData(pagesData) {
    const dataKey = crypto.randomBytes(32);
    const plaintext = Buffer.from(JSON.stringify(pagesData), 'utf8');

    return {
        encryptedData: encryptWithKey(plaintext, dataKey),
        encryptedDataKey: encryptWithKey(dataKey, getMasterKey())
    };
}

export function decryptPagesData(encryptedData, encryptedDataKey) {
    const dataKey = decryptWithKey(Buffer.from(encryptedDataKey), getMasterKey());
    const plaintext = decryptWithKey(Buffer.from(encryptedData), dataKey);
    return JSON.parse(plaintext.toString('utf8'));
}
