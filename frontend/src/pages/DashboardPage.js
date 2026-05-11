import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OfferLetter from '../modules/OfferLetter/OfferLetter';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [workers, setWorkers] = useState([]);
    const [selectedWorkerId, setSelectedWorkerId] = useState('');
    const [resumeForm, setResumeForm] = useState({ summary: '', skills: '', experience: '', education: '', resumeUrl: '' });
    const [statusMessage, setStatusMessage] = useState('');
    const isPrivileged = ['ceo', 'hr'].includes(user?.role);

    useEffect(() => {
        const loadWorkers = async () => {
            if (!isPrivileged) {
                return;
            }

            try {
                const response = await apiClient.get('/api/users/workers');
                setWorkers(response.data.workers || []);
                if ((response.data.workers || []).length > 0) {
                    selectWorker(response.data.workers[0]);
                }
            } catch (error) {
                setStatusMessage(error.response?.data?.message || 'Failed to load workers');
            }
        };

        loadWorkers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPrivileged]);

    const selectWorker = (worker) => {
        setSelectedWorkerId(worker._id);
        setResumeForm({
            summary: worker.resume?.summary || '',
            skills: Array.isArray(worker.resume?.skills) ? worker.resume.skills.join(', ') : '',
            experience: worker.resume?.experience || '',
            education: worker.resume?.education || '',
            resumeUrl: worker.resume?.resumeUrl || ''
        });
    };

    const handleSaveResume = async (event) => {
        event.preventDefault();

        try {
            await apiClient.patch(`/api/users/workers/${selectedWorkerId}/resume`, {
                ...resumeForm,
                skills: resumeForm.skills.split(',').map((item) => item.trim()).filter(Boolean)
            });

            const response = await apiClient.get('/api/users/workers');
            setWorkers(response.data.workers || []);
            setStatusMessage('Resume updated successfully');
        } catch (error) {
            setStatusMessage(error.response?.data?.message || 'Failed to update resume');
        }
    };

    const selectedWorker = workers.find((worker) => worker._id === selectedWorkerId) || null;

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="dashboard-shell">
            <header className="dashboard-header">
                <div>
                    <p className="eyebrow">Authenticated workspace</p>
                    <h1>{user?.name}</h1>
                    <p>{user?.role?.toUpperCase()} access</p>
                </div>
                <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </header>

            <section className="dashboard-hero">
                <div className="hero-panel">
                    <p className="eyebrow">Workspace overview</p>
                    <h1>Manage people, resumes, and offer letters from one secure place.</h1>
                    <p>
                        This dashboard is designed for quick role switching, worker lookup, and resume maintenance.
                        HR and CEO can edit worker records. Worker users land on a read-only view for now.
                    </p>
                    <div className="hero-actions">
                        <button className="logout-btn" type="button" onClick={() => navigate('/advanced-editor')}>
                            Open offer editor
                        </button>
                        <button className="ghost-btn" type="button" onClick={handleLogout}>
                            Sign out
                        </button>
                    </div>
                    <div className="chip-row">
                        <span className="chip">JWT secured</span>
                        <span className="chip">CEO / HR / Worker roles</span>
                        <span className="chip">Resume review</span>
                    </div>
                </div>

                <aside className="status-panel">
                    <div className="status-card">
                        <span className="status-label">Current role</span>
                        <h3>{user?.role?.toUpperCase()}</h3>
                        <p>{isPrivileged ? 'Full access to workers and resumes.' : 'Read-only access for now.'}</p>
                    </div>

                    <div className="status-card">
                        <span className="status-label">Worker pool</span>
                        <h3>{workers.length}</h3>
                        <p>Available worker profiles loaded from MongoDB.</p>
                    </div>

                    <div className="status-card">
                        <span className="status-label">Session</span>
                        <h3>Live</h3>
                        <p>Token-based authentication is active on this session.</p>
                    </div>
                </aside>
            </section>

            {!isPrivileged ? (
                <section className="empty-state">
                    <h2>Worker dashboard coming soon</h2>
                    <p>You are signed in, but there are no worker actions available yet.</p>
                </section>
            ) : (
                <div className="dashboard-grid">
                    <section className="panel workers-panel">
                        <div className="panel-header">
                            <h2>Workers</h2>
                            <span>{workers.length} total</span>
                        </div>

                        <div className="worker-list">
                            {workers.map((worker) => (
                                <button
                                    key={worker._id}
                                    className={`worker-card ${selectedWorkerId === worker._id ? 'active' : ''}`}
                                    onClick={() => selectWorker(worker)}
                                >
                                    <strong>{worker.name}</strong>
                                    <span>{worker.email}</span>
                                    <span className="role-pill">{worker.role}</span>
                                </button>
                            ))}
                        </div>

                        {!workers.length && <p className="empty-inline">No worker records found.</p>}
                    </section>

                    <section className="panel resume-panel">
                        <div className="panel-header">
                            <h2>Resume Manager</h2>
                            <span>{selectedWorker ? selectedWorker.name : 'Select a worker'}</span>
                        </div>

                        {selectedWorker ? (
                            <form className="resume-form" onSubmit={handleSaveResume}>
                                <label>
                                    Summary
                                    <textarea value={resumeForm.summary} onChange={(e) => setResumeForm({ ...resumeForm, summary: e.target.value })} rows="4" />
                                </label>

                                <label>
                                    Skills
                                    <input value={resumeForm.skills} onChange={(e) => setResumeForm({ ...resumeForm, skills: e.target.value })} placeholder="JavaScript, React, Leadership" />
                                </label>

                                <label>
                                    Experience
                                    <textarea value={resumeForm.experience} onChange={(e) => setResumeForm({ ...resumeForm, experience: e.target.value })} rows="3" />
                                </label>

                                <label>
                                    Education
                                    <input value={resumeForm.education} onChange={(e) => setResumeForm({ ...resumeForm, education: e.target.value })} />
                                </label>

                                <label>
                                    Resume URL
                                    <input value={resumeForm.resumeUrl} onChange={(e) => setResumeForm({ ...resumeForm, resumeUrl: e.target.value })} placeholder="https://..." />
                                </label>

                                {statusMessage && <div className="status-message">{statusMessage}</div>}

                                <button type="submit">Save Resume</button>
                            </form>
                        ) : (
                            <p className="empty-inline">Choose a worker to review resume details.</p>
                        )}

                        {selectedWorker && (
                            <div className="resume-preview">
                                <h3>Preview</h3>
                                <p>{selectedWorker.resume?.summary || 'No summary yet.'}</p>
                                <p><strong>Skills:</strong> {(selectedWorker.resume?.skills || []).join(', ') || 'None'}</p>
                                <p><strong>Experience:</strong> {selectedWorker.resume?.experience || 'None'}</p>
                                <p><strong>Education:</strong> {selectedWorker.resume?.education || 'None'}</p>
                            </div>
                        )}
                    </section>

                    <section className="panel offer-panel">
                        <div className="panel-header">
                            <h2>Offer Letter Tools</h2>
                            <button className="ghost-btn" onClick={() => navigate('/advanced-editor')}>Open Editor</button>
                        </div>
                        <OfferLetter />
                    </section>
                </div>
            )}
        </div>
    );
}
