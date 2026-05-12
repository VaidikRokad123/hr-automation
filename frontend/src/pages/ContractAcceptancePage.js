import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/client';
import ContractViewer from '../modules/Contract/ContractViewer';
import '../modules/Contract/ContractAcceptance.css';

function getErrorMessage(error, fallback) {
    return error.response?.data?.message || fallback;
}

export default function ContractAcceptancePage() {
    const { token } = useParams();
    const [state, setState] = useState(token ? 'init' : 'loading_contract');
    const [maskedEmail, setMaskedEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [contract, setContract] = useState(null);
    const [viewedSections, setViewedSections] = useState(new Set());
    const [electronicConsent, setElectronicConsent] = useState(false);
    const [agreementConsent, setAgreementConsent] = useState(false);
    const [typedName, setTypedName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [resendMessage, setResendMessage] = useState('');

    const requiredPageIds = useMemo(
        () => (contract?.pagesData || []).map((page, index) => `page-${page.pageNumber || index + 1}`),
        [contract]
    );
    const allViewed = requiredPageIds.length > 0 && requiredPageIds.every((pageId) => viewedSections.has(pageId));
    const canAccept = allViewed && electronicConsent && agreementConsent && typedName.trim() && !submitting;

    const fetchContract = useCallback(async () => {
        try {
            setState('loading_contract');
            setError('');
            const response = await apiClient.get('/api/contracts/current/data');
            setContract(response.data.contract);
            setTypedName(response.data.contract.workerName || '');
            setState('review');
        } catch (err) {
            setError(getErrorMessage(err, 'Unable to load contract.'));
            setState('error');
        }
    }, []);

    useEffect(() => {
        let ignore = false;

        async function exchangeToken() {
            if (!token) {
                fetchContract();
                return;
            }

            try {
                window.history.replaceState({}, '', '/accept-contract/review');
                const response = await apiClient.post('/api/contracts/session/exchange', { token });
                if (ignore) return;
                setMaskedEmail(response.data.maskedEmail || '');
                setState('otp_required');
            } catch (err) {
                if (ignore) return;
                setError(getErrorMessage(err, 'This contract link is invalid or expired.'));
                setState('error');
            }
        }

        exchangeToken();

        return () => {
            ignore = true;
        };
    }, [fetchContract, token]);

    const verifyOtp = async (event) => {
        event.preventDefault();
        if (otp.length !== 6) return;

        try {
            setSubmitting(true);
            setError('');
            await apiClient.post('/api/contracts/session/verify-otp', { otp });
            await fetchContract();
        } catch (err) {
            setError(getErrorMessage(err, 'Invalid verification code.'));
        } finally {
            setSubmitting(false);
        }
    };

    const resendOtp = async () => {
        try {
            setSubmitting(true);
            setError('');
            setResendMessage('');
            const response = await apiClient.post('/api/contracts/session/resend-otp');
            setMaskedEmail(response.data.maskedEmail || maskedEmail);
            setResendMessage('A new code has been sent.');
        } catch (err) {
            setError(getErrorMessage(err, 'Unable to resend OTP right now.'));
        } finally {
            setSubmitting(false);
        }
    };

    const acceptContract = async () => {
        try {
            setSubmitting(true);
            setError('');
            await apiClient.post('/api/contracts/current/accept', {
                electronicConsent,
                agreementConsent,
                typedName,
                viewedSections: Array.from(viewedSections)
            });
            setState('accepted');
        } catch (err) {
            setError(getErrorMessage(err, 'Unable to accept contract.'));
        } finally {
            setSubmitting(false);
        }
    };

    if (state === 'init' || state === 'loading_contract') {
        return (
            <main className="contract-acceptance-page">
                <section className="contract-access-panel">
                    <h1>Preparing contract</h1>
                    <p>Please wait while we verify this secure contract session.</p>
                </section>
            </main>
        );
    }

    if (state === 'otp_required') {
        return (
            <main className="contract-acceptance-page">
                <section className="contract-access-panel">
                    <h1>Verify your email</h1>
                    <p>We sent a 6-digit verification code to {maskedEmail || 'your registered email'}.</p>
                    <form onSubmit={verifyOtp}>
                        <input
                            value={otp}
                            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="Enter 6-digit code"
                        />
                        {error && <div className="contract-inline-error">{error}</div>}
                        {resendMessage && <p>{resendMessage}</p>}
                        <button type="submit" disabled={otp.length !== 6 || submitting}>
                            {submitting ? 'Verifying...' : 'Verify & Continue'}
                        </button>
                        <button type="button" className="contract-secondary-btn" onClick={resendOtp} disabled={submitting}>
                            Resend code
                        </button>
                    </form>
                </section>
            </main>
        );
    }

    if (state === 'accepted') {
        return (
            <main className="contract-acceptance-page">
                <section className="contract-success-panel">
                    <h1>Contract accepted</h1>
                    <p>Thank you. Your acceptance has been recorded and HR has been notified.</p>
                </section>
            </main>
        );
    }

    if (state === 'error') {
        return (
            <main className="contract-acceptance-page">
                <section className="contract-error-panel">
                    <h1>Contract unavailable</h1>
                    <p>{error || 'This contract cannot be opened right now.'}</p>
                </section>
            </main>
        );
    }

    return (
        <main className="contract-acceptance-page">
            <header className="contract-review-header">
                <div>
                    <h1>Employment Contract Review</h1>
                    <p>{contract.workerName} | {contract.workerEmail}</p>
                </div>
                <div className="contract-progress-pill">
                    Viewed {viewedSections.size}/{requiredPageIds.length} pages
                </div>
            </header>

            {error && <div className="contract-inline-error">{error}</div>}

            <ContractViewer
                pagesData={contract.pagesData}
                workerName={contract.workerName}
                workerEmail={contract.workerEmail}
                contractId={contract.contractId}
                viewedSections={viewedSections}
                onViewedSectionsChange={setViewedSections}
            />

            <section className="contract-acceptance-bar">
                <strong>{allViewed ? 'Ready to accept' : `View all pages: ${viewedSections.size}/${requiredPageIds.length}`}</strong>
                <div className="contract-checkboxes">
                    <label>
                        <input
                            type="checkbox"
                            checked={electronicConsent}
                            onChange={(event) => setElectronicConsent(event.target.checked)}
                        />
                        I consent to receive and sign this contract electronically.
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={agreementConsent}
                            onChange={(event) => setAgreementConsent(event.target.checked)}
                        />
                        I have read and agree to all terms in this contract.
                    </label>
                </div>
                <input
                    value={typedName}
                    onChange={(event) => setTypedName(event.target.value)}
                    placeholder="Type your full name"
                />
                <button type="button" disabled={!canAccept} onClick={acceptContract}>
                    {submitting ? 'Accepting...' : 'Accept Contract'}
                </button>
            </section>
        </main>
    );
}
