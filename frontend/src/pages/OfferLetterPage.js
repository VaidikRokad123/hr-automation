import React from 'react';
import { useNavigate } from 'react-router-dom';
import OfferLetter from '../modules/OfferLetter/OfferLetter';

export default function OfferLetterPage() {
    const navigate = useNavigate();

    return (
        <main className="offer-letter-page">
            <header className="offer-letter-page-header">
                <div>
                    <p className="eyebrow">Documents</p>
                    <h1>Generate Offer Letter</h1>
                </div>
                <button type="button" className="ghost-btn" onClick={() => navigate('/dashboard')}>
                    Back to Home
                </button>
            </header>

            <OfferLetter />
        </main>
    );
}
