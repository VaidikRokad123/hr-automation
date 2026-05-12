import React, { useState } from 'react';
import apiClient from '../api/client';

const PRIORITIES = [
    { value: 'low',    label: '🟡 Low' },
    { value: 'normal', label: '🔵 Normal' },
    { value: 'high',   label: '🟠 High' },
    { value: 'urgent', label: '🔴 Urgent' }
];

const INITIAL_FORM = { title: '', message: '', priority: 'normal' };

export default function BroadcastModal({ onClose }) {
    const [form, setForm]       = useState(INITIAL_FORM);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.title.trim()) return setError('Title is required');
        if (!form.message.trim()) return setError('Message is required');

        setLoading(true);
        try {
            await apiClient.post('/api/notifications/broadcast', {
                title:    form.title.trim(),
                message:  form.message.trim(),
                priority: form.priority
            });

            setSuccess('Notification broadcast to all members!');
            setForm(INITIAL_FORM);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send notification');
        } finally {
            setLoading(false);
        }
    };

    const charLeft = 2000 - form.message.length;

    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="broadcast-modal-title">
            <div className="modal-card broadcast-modal page-card">
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <p className="eyebrow">HR Broadcast</p>
                        <h2 id="broadcast-modal-title">Send Notification</h2>
                    </div>
                        <button
                        type="button"
                        id="broadcast-modal-close"
                            className="modal-close-btn page-button-secondary"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Info strip */}
                <div className="broadcast-info-strip">
                    <span className="broadcast-icon">📢</span>
                    <p>This notification will be delivered to <strong>all members</strong> via RabbitMQ.</p>
                </div>

                <form className="broadcast-form" onSubmit={handleSubmit}>
                    {/* Priority */}
                    <label>
                        Priority
                        <div className="priority-row">
                            {PRIORITIES.map((p) => (
                                <label key={p.value} className={`priority-chip${form.priority === p.value ? ' priority-chip--active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="priority"
                                        value={p.value}
                                        checked={form.priority === p.value}
                                        onChange={handleChange}
                                    />
                                    {p.label}
                                </label>
                            ))}
                        </div>
                    </label>

                    {/* Title */}
                    <label>
                        Title
                        <input
                            id="broadcast-title"
                            type="text"
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            placeholder="e.g. Server Maintenance Tonight"
                            maxLength={120}
                            autoFocus
                        />
                        <span className="field-hint">{120 - form.title.length} chars remaining</span>
                    </label>

                    {/* Message */}
                    <label>
                        Message
                        <textarea
                            id="broadcast-message"
                            name="message"
                            value={form.message}
                            onChange={handleChange}
                            placeholder="Write your message here..."
                            rows={5}
                            maxLength={2000}
                        />
                        <span className={`field-hint${charLeft < 100 ? ' field-hint--warn' : ''}`}>
                            {charLeft} chars remaining
                        </span>
                    </label>

                    {error   && <div className="auth-error">{error}</div>}
                    {success && <div className="broadcast-success">{success}</div>}

                    <div className="broadcast-actions">
                        <button type="button" className="page-button-secondary" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button
                            id="broadcast-send-btn"
                            type="submit"
                            className="page-button"
                            disabled={loading || !form.title.trim() || !form.message.trim()}
                        >
                            {loading ? 'Sending…' : '📢 Broadcast to All'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
