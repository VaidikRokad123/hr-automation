import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../api/client';

const POLL_INTERVAL_MS = 30_000;

const PRIORITY_CONFIG = {
    urgent: { label: 'Urgent', color: '#f87171' },
    high:   { label: 'High',   color: '#fb923c' },
    normal: { label: 'Normal', color: '#38bdf8' },
    low:    { label: 'Low',    color: '#6b7280' }
};

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
    const [open, setOpen]                 = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount]   = useState(0);
    const [loading, setLoading]           = useState(false);
    const buttonRef = useRef(null);
    const [panelStyle, setPanelStyle] = useState({});

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await apiClient.get('/api/notifications/my?limit=20');
            setNotifications(res.data.data.notifications || []);
            setUnreadCount(res.data.data.unreadCount || 0);
        } catch {
            // silent — RabbitMQ/DB may be down
        }
    }, []);

    // Initial load + polling
    useEffect(() => {
        fetchNotifications();
        const id = setInterval(fetchNotifications, POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [fetchNotifications]);

    const handleMarkRead = async (id) => {
        try {
            await apiClient.patch(`/api/notifications/${id}/read`);
            setNotifications((prev) =>
                prev.map((n) => n._id === id ? { ...n, readAt: new Date().toISOString() } : n)
            );
            setUnreadCount((c) => Math.max(0, c - 1));
        } catch {}
    };

    const handleMarkAllRead = async () => {
        try {
            await apiClient.patch('/api/notifications/read-all');
            setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
            setUnreadCount(0);
        } catch {}
    };

    useLayoutEffect(() => {
        if (!open) {
            return undefined;
        }

        const updatePosition = () => {
            const button = buttonRef.current;
            if (!button) {
                return;
            }

            const rect = button.getBoundingClientRect();
            const panelWidth = window.innerWidth <= 768 ? Math.max(0, window.innerWidth - 28) : 360;
            const rightOffset = window.innerWidth <= 768 ? 14 : Math.max(14, window.innerWidth - rect.right);

            setPanelStyle({
                top: Math.round(rect.bottom + 12),
                right: Math.round(rightOffset),
                width: panelWidth,
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [open]);

    const portalRoot = useMemo(() => {
        if (typeof document === 'undefined') {
            return null;
        }

        return document.body;
    }, []);

    const panel = open && portalRoot ? createPortal(
        <>
            <div className="notif-backdrop" onClick={() => setOpen(false)} />
            <div className="notif-panel" role="dialog" aria-label="Notifications" style={panelStyle}>
                <div className="notif-panel-header">
                    <h3>Notifications</h3>
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            className="notif-mark-all-btn"
                            onClick={handleMarkAllRead}
                        >
                            Mark all read
                        </button>
                    )}
                </div>

                <div className="notif-list">
                    {notifications.length === 0 && (
                        <div className="notif-empty">
                            <p>No notifications yet</p>
                        </div>
                    )}

                    {notifications.map((n) => {
                        const isUnread = !n.readAt;
                        const pConf = PRIORITY_CONFIG[n.priority] || PRIORITY_CONFIG.normal;
                        return (
                            <div
                                key={n._id}
                                className={`notif-item${isUnread ? ' notif-item--unread' : ''}`}
                                onClick={() => isUnread && handleMarkRead(n._id)}
                            >
                                <span
                                    className="notif-priority-dot"
                                    style={{ background: pConf.color }}
                                    title={pConf.label}
                                />
                                <div className="notif-item-body">
                                    <p className="notif-item-title">{n.title}</p>
                                    <p className="notif-item-msg">{n.message}</p>
                                    <div className="notif-item-meta">
                                        <span>{timeAgo(n.sentAt)}</span>
                                        {n.sentBy?.name && <span>from {n.sentBy.name}</span>}
                                    </div>
                                </div>
                                {isUnread && <span className="notif-unread-dot" />}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>,
        portalRoot
    ) : null;

    return (
        <div className="notif-bell-wrapper">
            {/* Bell trigger */}
            <button
                id="notification-bell-btn"
                className="notif-bell-btn"
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>
            {panel}
        </div>
    );
}
