import React from 'react';
import { useNavigate } from 'react-router-dom';
import OfferLetter from '../modules/OfferLetter/OfferLetter';

export default function OfferLetterPage() {
    const navigate = useNavigate();

    return (
        <main className="offer-letter-page app-page">
            <header className="offer-letter-page-header page-header">
                <div className="page-title">
                    <p className="eyebrow">Documents</p>
                    <h1>Generate Offer Letter</h1>
                </div>
                <button type="button" className="page-button-secondary" onClick={() => navigate('/dashboard')}>
                    Back to Home
                </button>
            </header>

            <div className="page-card">
                <OfferLetter />
            </div>
        </main>
    );
}
