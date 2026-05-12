import mongoose from 'mongoose';

const contractInvitationSchema = new mongoose.Schema(
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
        publicId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        secretHash: { type: String, required: true },
        tokenExpiry: { type: Date, required: true, index: true },
        otpHash: String,
        otpExpiry: Date,
        otpAttemptCount: { type: Number, default: 0 },
        otpSendCount: { type: Number, default: 0 },
        lastOtpSentAt: Date,
        status: {
            type: String,
            enum: ['active', 'consumed', 'expired', 'revoked'],
            default: 'active',
            index: true
        },
        consumedAt: Date
    },
    { timestamps: true }
);

const ContractInvitation = mongoose.model('ContractInvitation', contractInvitationSchema);

export default ContractInvitation;
