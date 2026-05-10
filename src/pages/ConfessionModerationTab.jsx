import React, { useState, useEffect, useCallback } from 'react';
import {
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    Image as ImageIcon,
    Video,
    Search,
    RefreshCw,
    MessageSquare,
    User,
    Calendar,
    Filter,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

const ConfessionModerationTab = () => {
    const [confessions, setConfessions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState('pending');
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [backendAvailable, setBackendAvailable] = useState(true);
    const { showToast } = useToast();

    const fetchConfessions = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/admin/confessions', { params: { status: filter } });
            setConfessions(Array.isArray(data) ? data : []);
            setBackendAvailable(true);
        } catch (error) {
            if (error.response?.status === 404) {
                setBackendAvailable(false);
            } else {
                showToast('Failed to load confessions', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    }, [filter, showToast]);

    useEffect(() => {
        fetchConfessions();
    }, [fetchConfessions]);

    const handleModeration = async (id, status) => {
        setActionLoading(id);
        try {
            await api.put(`/admin/confessions/${id}`, { status });
            showToast(`Confession ${status === 'approved' ? 'approved' : 'rejected'}`, 'success');
            setConfessions((prev) => prev.filter((c) => c.id !== id));
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to moderate', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const getTimeRemaining = (autoPublishAt) => {
        if (!autoPublishAt) return null;
        const diff = new Date(autoPublishAt) - Date.now();
        if (diff <= 0) return { total: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
        return {
            total: diff,
            hours: Math.floor(diff / 3600000),
            minutes: Math.floor((diff % 3600000) / 60000),
            seconds: Math.floor((diff % 60000) / 1000),
            expired: false,
        };
    };

    const Countdown = ({ autoPublishAt }) => {
        const [timeLeft, setTimeLeft] = useState(() => getTimeRemaining(autoPublishAt));
        useEffect(() => {
            if (!autoPublishAt) return;
            const interval = setInterval(() => {
                setTimeLeft(getTimeRemaining(autoPublishAt));
            }, 1000);
            return () => clearInterval(interval);
        }, [autoPublishAt]);
        if (!timeLeft) return null;
        if (timeLeft.expired) return <span style={{ color: '#2ecc71' }}>Auto-published</span>;
        return (
            <span>
                {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
            </span>
        );
    };

    if (!backendAvailable) {
        return (
            <div className="content-moderation-tab">
                <div className="tab-header">
                    <div className="header-left">
                        <h2>Confession Moderation</h2>
                        <p>Review and approve pending confessions</p>
                    </div>
                </div>
                <div
                    className="loading-state"
                    style={{ textAlign: 'center', padding: '4rem 1rem' }}
                >
                    <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <h3>Backend endpoint not available</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        The admin confessions moderation API endpoint needs to be implemented on the
                        backend.
                        <br />
                        Expected endpoint: <code>GET /api/admin/confessions</code>
                    </p>
                </div>
            </div>
        );
    }

    const filtered = confessions.filter(
        (c) => !search || c.content?.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div className="content-moderation-tab">
            <div className="tab-header">
                <div className="header-left">
                    <h2>Confession Moderation</h2>
                    <p>Review and approve pending confessions</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={fetchConfessions}>
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="filters-section">
                <div className="search-filters">
                    <div className="search-box">
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search confession content..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="all">All</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="moderation-queue">
                {isLoading ? (
                    <div className="loading-state">
                        <RefreshCw size={32} className="spin-anim" />
                        <p>Loading confessions...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="loading-state">
                        <MessageSquare size={40} style={{ opacity: 0.3 }} />
                        <p>No confessions found.</p>
                    </div>
                ) : (
                    <div className="queue-list">
                        {filtered.map((c) => (
                            <div key={c.id} className={`moderation-item ${c.status || 'pending'}`}>
                                <div className="item-header">
                                    <div className="item-type">
                                        <MessageSquare size={20} color="var(--admin-primary)" />
                                        <span className="type-label">CONFESSION</span>
                                        {c.status && (
                                            <span
                                                className="status-badge"
                                                style={{
                                                    backgroundColor:
                                                        c.status === 'approved'
                                                            ? '#2ecc7120'
                                                            : c.status === 'rejected'
                                                              ? '#e74c3c20'
                                                              : '#f1c40f20',
                                                    color:
                                                        c.status === 'approved'
                                                            ? '#2ecc71'
                                                            : c.status === 'rejected'
                                                              ? '#e74c3c'
                                                              : '#f1c40f',
                                                }}
                                            >
                                                {c.status.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    {c.status === 'pending' && (
                                        <div className="action-buttons">
                                            <button
                                                className="action-btn approve"
                                                onClick={() => handleModeration(c.id, 'approved')}
                                                disabled={actionLoading === c.id}
                                            >
                                                <CheckCircle size={16} />
                                                {actionLoading === c.id ? '...' : 'Approve'}
                                            </button>
                                            <button
                                                className="action-btn reject"
                                                onClick={() => handleModeration(c.id, 'rejected')}
                                                disabled={actionLoading === c.id}
                                            >
                                                <XCircle size={16} />
                                                {actionLoading === c.id ? '...' : 'Reject'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="item-main">
                                    <p className="item-text">
                                        {c.content
                                            ? c.content.length > 200
                                                ? c.content.substring(0, 200) + '...'
                                                : c.content
                                            : 'No content'}
                                    </p>
                                </div>

                                <div className="item-content">
                                    {c.media_url && (
                                        <div
                                            className="media-preview"
                                            style={{ marginBottom: '0.75rem' }}
                                        >
                                            {c.media_type === 'video' ? (
                                                <video
                                                    src={c.media_url}
                                                    controls
                                                    preload="metadata"
                                                    style={{
                                                        maxHeight: '200px',
                                                        width: '100%',
                                                        objectFit: 'contain',
                                                        borderRadius: '8px',
                                                        background: '#000',
                                                    }}
                                                />
                                            ) : (
                                                <img
                                                    src={c.media_url}
                                                    alt="Confession media"
                                                    style={{
                                                        maxHeight: '200px',
                                                        width: '100%',
                                                        objectFit: 'contain',
                                                        borderRadius: '8px',
                                                        background: '#000',
                                                    }}
                                                />
                                            )}
                                        </div>
                                    )}

                                    <div className="content-meta">
                                        <div className="meta-item">
                                            <User size={16} />
                                            <span>
                                                {c.is_anonymous || c.isAnonymous
                                                    ? 'Anonymous'
                                                    : c.author_name || 'Unknown'}
                                            </span>
                                        </div>
                                        {c.auto_publish_at && (
                                            <div className="meta-item">
                                                <Clock size={16} />
                                                <Countdown autoPublishAt={c.auto_publish_at} />
                                            </div>
                                        )}
                                        <div className="meta-item">
                                            <Calendar size={16} />
                                            <span>
                                                {c.created_at
                                                    ? new Date(c.created_at).toLocaleString()
                                                    : 'Just now'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConfessionModerationTab;
