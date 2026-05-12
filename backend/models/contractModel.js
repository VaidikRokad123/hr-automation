import mongoose from 'mongoose';

const contractSchema = new mongoose.Schema(
    {
        workerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        status: {
            type: String,
            enum: ['draft', 'sent', 'viewed', 'accepted', 'expired', 'revoked'],
            default: 'draft',
            index: true
        },
        pagesDataEncrypted: { type: Buffer, required: true },
        encryptedDataKey: { type: Buffer, required: true },
        contentHash: { type: String, required: true },
        version: { type: Number, default: 1 },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        sentAt: Date,
        viewedAt: Date,
        acceptedAt: Date,
        acceptedIP: String,
        acceptedUserAgent: String,
        acceptedName: String,
        signature: String
    },
    { timestamps: true }
);

const Contract = mongoose.model('Contract', contractSchema);

export default Contract;
