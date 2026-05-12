import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('ceo@hrsystem.local');
    const [password, setPassword] = useState('Password123!');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await apiClient.post('/api/auth/login', { email, password });
            login(response.data.token, response.data.user);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to sign in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            <div className="auth-card">
                <div className="auth-copy">
                    <p className="eyebrow">People ledger</p>
                    <div className="auth-hero">
                        <h1>Open the people ledger.</h1>
                        <p className="auth-note">
                            Sign in with a CEO, HR, or Worker account to enter the workspace and review the people, resumes, and offer-letter tools.
                        </p>
                        <div className="auth-badges">
                            <span className="hero-pill">Token login</span>
                            <span className="hero-pill">Role access</span>
                            <span className="hero-pill">Resume management</span>
                        </div>
                    </div>
                    <div className="demo-box">
                        <strong>Sample accounts</strong>
                        <span>CEO: ceo@hrsystem.local</span>
                        <span>HR: hr@hrsystem.local</span>
                        <span>Worker: worker@hrsystem.local</span>
                        <span>Password: Password123!</span>
                    </div>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-badges demo-actions">
                        <button type="button" className="ghost-btn" onClick={() => { setEmail('ceo@hrsystem.local'); setPassword('Password123!'); }}>
                            CEO demo
                        </button>
                        <button type="button" className="ghost-btn" onClick={() => { setEmail('hr@hrsystem.local'); setPassword('Password123!'); }}>
                            HR demo
                        </button>
                        <button type="button" className="ghost-btn" onClick={() => { setEmail('worker@hrsystem.local'); setPassword('Password123!'); }}>
                            Worker demo
                        </button>
                    </div>

                    <label>
                        Email
                        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" />
                    </label>

                    <label>
                        Password
                        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Your password" />
                    </label>

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Signing in...' : 'Login'}
                    </button>

                    <p className="empty-inline">Use the sample buttons above for a quick role preview.</p>
                </form>
            </div>
        </div>
    );
}
