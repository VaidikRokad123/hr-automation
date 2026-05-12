import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import BroadcastModal from '../components/BroadcastModal';

export default function DashboardPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [broadcastOpen, setBroadcastOpen] = useState(false);
    const [contractPickerOpen, setContractPickerOpen] = useState(false);
    const [workers, setWorkers] = useState([]);
    const [workersLoading, setWorkersLoading] = useState(false);
    const [workerLoadError, setWorkerLoadError] = useState('');
    const isPrivileged = ['ceo', 'hr'].includes(user?.role);

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const openNotifications = () => {
        document.querySelector('.notif-bell-btn')?.click();
    };

    const openContractPicker = async () => {
        setContractPickerOpen(true);

        if (workers.length || workersLoading) {
            return;
        }

        try {
            setWorkersLoading(true);
            setWorkerLoadError('');
            const response = await apiClient.get('/api/users/workers');
            setWorkers(response.data.workers || []);
        } catch (error) {
            setWorkerLoadError(error.response?.data?.message || 'Failed to load workers');
        } finally {
            setWorkersLoading(false);
        }
    };

    const startContractForWorker = (worker) => {
        navigate('/advanced-editor', {
            state: {
                mode: 'contract',
                worker
            }
        });
    };

    const navItems = [
        {
            title: 'Home',
            description: 'Dashboard overview',
            action: () => navigate('/dashboard'),
            available: true
        },
        {
            title: 'Generate Offer Letter',
            description: 'Create and edit an offer letter',
            action: () => navigate('/offer-letter'),
            available: isPrivileged
        },
        {
            title: 'Generate Contract',
            description: 'Choose a worker and draft a contract',
            action: openContractPicker,
            available: isPrivileged
        },
        {
            title: 'Notifications',
            description: 'Open the notification center',
            action: openNotifications,
            available: true
        },
        {
            title: 'Send Notification',
            description: 'Broadcast a message to members',
            action: () => setBroadcastOpen(true),
            available: isPrivileged
        },
        {
            title: 'Sign Out',
            description: 'End this session',
            action: handleLogout,
            available: true
        }
    ].filter((item) => item.available);

    return (
        <div className="dashboard-shell">
            {broadcastOpen && <BroadcastModal onClose={() => setBroadcastOpen(false)} />}
            {contractPickerOpen && (
                <div className="modal-backdrop">
                    <section className="modal-card contract-picker-modal">
                        <div className="modal-header">
                            <div>
                                <p className="eyebrow">Contract</p>
                                <h2>Generate Contract</h2>
                            </div>
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setContractPickerOpen(false)}
                            >
                                x
                            </button>
                        </div>

                        <div className="contract-picker-body">
                            {workersLoading && <p className="empty-inline">Loading workers...</p>}
                            {workerLoadError && <div className="status-message">{workerLoadError}</div>}
                            {!workersLoading && !workerLoadError && workers.length === 0 && (
                                <p className="empty-inline">No worker records found.</p>
                            )}
                            <div className="contract-worker-list">
                                {workers.map((worker) => (
                                    <button
                                        key={worker._id}
                                        type="button"
                                        className="contract-worker-option"
                                        onClick={() => startContractForWorker(worker)}
                                    >
                                        <strong>{worker.name}</strong>
                                        <span>{worker.email}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            )}

            <header className="dashboard-header">
                <div>
                    <p className="eyebrow">Operational console</p>
                    <h1>{user?.name}</h1>
                    <p>{user?.role?.toUpperCase()} access</p>
                </div>
                <div className="header-right-actions">
                    {isPrivileged && (
                        <button
                            id="open-broadcast-btn"
                            type="button"
                            className="ghost-btn broadcast-trigger-btn"
                            onClick={() => setBroadcastOpen(true)}
                        >
                            📢 Send Notification
                        </button>
                    )}
                    <NotificationBell />
                    <button type="button" className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
            </header>

            <section className="dashboard-home">
                <aside className="home-side-panel">
                    <div className="side-panel-header">
                        <p className="eyebrow">Pages</p>
                        <h2>Navigation</h2>
                    </div>

                    <div className="side-panel-links">
                        {navItems.map((item) => (
                            <button
                                key={item.title}
                                type="button"
                                className="side-panel-link"
                                onClick={item.action || undefined}
                                disabled={!item.action}
                            >
                                <strong>{item.title}</strong>
                                <span>{item.description}</span>
                            </button>
                        ))}
                    </div>
                </aside>

                <div className="home-main-panel">
                    <p className="eyebrow">Workspace</p>
                    <h1>Welcome, {user?.name}</h1>
                    <p>
                        Use the side panel to move between the available pages for your role.
                    </p>
                    <div className="home-summary-row">
                        <div>
                            <span>Role</span>
                            <strong>{user?.role?.toUpperCase()}</strong>
                        </div>
                        <div>
                            <span>Session</span>
                            <strong>Live</strong>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
