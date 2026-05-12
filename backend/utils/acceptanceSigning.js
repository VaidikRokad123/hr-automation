import crypto from 'crypto';
import fs from 'fs';
import { canonicalJson } from './canonicalJson.js';

let fallbackKeyPair = null;

function readKey(configured) {
    if (!configured) {
        return null;
    }

    if (configured.includes('BEGIN')) {
        return configured.replace(/\\n/g, '\n');
    }

    if (fs.existsSync(configured)) {
        return fs.readFileSync(configured, 'utf8');
    }

    return configured;
}

function getFallbackKeyPair() {
    if (!fallbackKeyPair) {
        fallbackKeyPair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        console.warn('[AcceptanceSigning] ACCEPTANCE_PRIVATE_KEY not configured; using ephemeral development key.');
    }

    return fallbackKeyPair;
}

function getPrivateKey() {
    return readKey(process.env.ACCEPTANCE_PRIVATE_KEY) || getFallbackKeyPair().privateKey;
}

function getPublicKey() {
    return readKey(process.env.ACCEPTANCE_PUBLIC_KEY) || getFallbackKeyPair().publicKey;
}

export function signEvidence(evidence) {
    const payload = canonicalJson(evidence);
    const evidenceHash = crypto.createHash('sha256').update(payload).digest('hex');
    const signature = crypto.sign('RSA-SHA256', Buffer.from(payload), getPrivateKey()).toString('base64');

    return {
        evidenceHash,
        signature,
        payload,
        signingKeyId: process.env.ACCEPTANCE_SIGNING_KEY_ID || 'default'
    };
}

export function verifyEvidence(evidence, signature) {
    const payload = canonicalJson(evidence);
    return crypto.verify(
        'RSA-SHA256',
        Buffer.from(payload),
        getPublicKey(),
        Buffer.from(signature, 'base64')
    );
}
