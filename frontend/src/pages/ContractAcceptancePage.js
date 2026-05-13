import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/client';
import ContractViewer from '../modules/Contract/ContractViewer';
import './ContractAcceptancePage.css';
import { getContractPageId } from '../modules/Contract/contractLayout';

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
    const [signatureDataUrl, setSignatureDataUrl] = useState('');
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [resendMessage, setResendMessage] = useState('');
    const signatureCanvasRef = useRef(null);
    const signatureDrawingRef = useRef(false);

    const requiredPageIds = useMemo(
        () => (contract?.pagesData || []).map((page, index) => getContractPageId(page, index)),
        [contract]
    );
    const totalPages = requiredPageIds.length;
    const isLastPage = totalPages > 0 && currentPageIndex === totalPages - 1;
    const allViewed = requiredPageIds.length > 0 && requiredPageIds.every((pageId) => viewedSections.has(pageId));
    const canAccept = allViewed && electronicConsent && agreementConsent && typedName.trim() && signatureDataUrl && !submitting;

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
                viewedSections: Array.from(viewedSections),
                signatureDataUrl
            });
            setState('accepted');
        } catch (err) {
            setError(getErrorMessage(err, 'Unable to accept contract.'));
        } finally {
            setSubmitting(false);
        }
    };

    const clearSignature = useCallback(() => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureDataUrl('');
    }, []);

    const resizeSignatureCanvas = useCallback(() => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        const context = canvas.getContext('2d');
        const previousDataUrl = canvas.dataset.signatureDataUrl;

        canvas.width = width * ratio;
        canvas.height = height * ratio;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.lineWidth = 2.5;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = '#1f4e79';

        if (previousDataUrl) {
            const image = new Image();
            image.onload = () => context.drawImage(image, 0, 0, width, height);
            image.src = previousDataUrl;
        }
    }, []);

    useEffect(() => {
        if (!isLastPage) return undefined;

        resizeSignatureCanvas();

        const handleResize = () => resizeSignatureCanvas();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, [isLastPage, resizeSignatureCanvas]);

    const handleSignaturePointerDown = (event) => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        signatureDrawingRef.current = true;
        context.beginPath();
        context.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    };

    const handleSignaturePointerMove = (event) => {
        if (!signatureDrawingRef.current) return;

        const canvas = signatureCanvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        context.lineTo(event.clientX - rect.left, event.clientY - rect.top);
        context.stroke();
        canvas.dataset.signatureDataUrl = canvas.toDataURL('image/png');
        setSignatureDataUrl(canvas.dataset.signatureDataUrl);
    };

    const handleSignaturePointerUp = () => {
        signatureDrawingRef.current = false;
    };

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPageIndex]);

    if (state === 'init' || state === 'loading_contract') {
        return (
            <main className="contract-acceptance-page app-page">
                <section className="contract-access-panel page-card">
                    <h1>Preparing contract</h1>
                    <p>Please wait while we verify this secure contract session.</p>
                </section>
            </main>
        );
    }

    if (state === 'otp_required') {
        return (
            <main className="contract-acceptance-page app-page">
                <section className="contract-access-panel page-card">
                    <h1>Verify your email</h1>
                    <p>We sent a 6-digit verification code to {maskedEmail || 'your registered email'}.</p>
                    <form onSubmit={verifyOtp}>
                        <input
                            className="form-control"
                            value={otp}
                            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="Enter 6-digit code"
                        />
                        {error && <div className="contract-inline-error">{error}</div>}
                        {resendMessage && <p>{resendMessage}</p>}
                        <button type="submit" className="page-button" disabled={otp.length !== 6 || submitting}>
                            {submitting ? 'Verifying...' : 'Verify & Continue'}
                        </button>
                        <button type="button" className="page-button-secondary contract-secondary-btn" onClick={resendOtp} disabled={submitting}>
                            Resend code
                        </button>
                    </form>
                </section>
            </main>
        );
    }

    if (state === 'accepted') {
        return (
            <main className="contract-acceptance-page app-page">
                <section className="contract-success-panel page-card">
                    <h1>Contract accepted</h1>
                    <p>Thank you. Your acceptance has been recorded and HR has been notified.</p>
                </section>
            </main>
        );
    }

    if (state === 'error') {
        return (
            <main className="contract-acceptance-page app-page">
                <section className="contract-error-panel page-card">
                    <h1>Contract unavailable</h1>
                    <p>{error || 'This contract cannot be opened right now.'}</p>
                </section>
            </main>
        );
    }

    return (
        <main className="contract-acceptance-page app-page">
            {error && <div className="contract-inline-error">{error}</div>}

            <ContractViewer
                pagesData={contract.pagesData}
                workerName={contract.workerName}
                workerEmail={contract.workerEmail}
                contractId={contract.contractId}
                viewedSections={viewedSections}
                onViewedSectionsChange={setViewedSections}
                currentPageIndex={currentPageIndex}
                onPageIndexChange={setCurrentPageIndex}
            />

            {isLastPage && (
                <section className="contract-acceptance-bar page-card">
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
                        className="form-control"
                        value={typedName}
                        onChange={(event) => setTypedName(event.target.value)}
                        placeholder="Type your full name"
                    />
                    <div className="contract-signature-box">
                        <div className="contract-signature-header">
                            <strong>Digital Signature</strong>
                            <button type="button" className="contract-secondary-btn" onClick={clearSignature}>
                                Clear
                            </button>
                        </div>
                        <canvas
                            ref={signatureCanvasRef}
                            className="contract-signature-canvas"
                            onPointerDown={handleSignaturePointerDown}
                            onPointerMove={handleSignaturePointerMove}
                            onPointerUp={handleSignaturePointerUp}
                            onPointerLeave={handleSignaturePointerUp}
                        />
                        <p className="contract-signature-help">Use your mouse or touch to sign inside the box.</p>
                    </div>
                    <button type="button" className="page-button" disabled={!canAccept} onClick={acceptContract}>
                        {submitting ? 'Accepting...' : 'Accept Contract'}
                    </button>
                </section>
            )}
        </main>
    );
}
