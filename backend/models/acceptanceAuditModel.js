import mongoose from 'mongoose';

const acceptanceAuditSchema = new mongoose.Schema(
    {
        contractId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contract',
            required: true,
            index: true
        },
        workerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        eventType: {
            type: String,
            enum: ['viewed', 'accepted', 'revoked', 'expired'],
            required: true
        },
        evidence: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },
        evidenceHash: {
            type: String,
            required: true
        },
        signature: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);

const AcceptanceAudit = mongoose.model('AcceptanceAudit', acceptanceAuditSchema);

export default AcceptanceAudit;
