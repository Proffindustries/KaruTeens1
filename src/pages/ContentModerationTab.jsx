import React, { useState, useEffect } from 'react';
import {
    FileText, AlertTriangle, Eye, EyeOff, Shield, CheckCircle, XCircle,
    Search, Filter, Clock, User, Flag, MessageSquare, Image as ImageIcon,
    Video, Calendar, RefreshCw, Download, Upload, Plus, Edit, Trash2,
    TrendingUp, BarChart3, PieChart, Users, Globe
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

import api from '../api/client';

const ContentModerationTab = () => {
    const [moderationQueue, setModerationQueue] = useState([]);
    const [filters, setFilters] = useState({
        contentType: 'all',
        status: 'pending',
        severity: 'all',
        dateRange: 'week',
        search: ''
    });

    const [selectedItems, setSelectedItems] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { showToast } = useToast();

    // Vuta data ya kweli kutoka backend
    const fetchModerationQueue = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/admin/moderation');
            setModerationQueue(data);
        } catch (error) {
            console.error("Failed to fetch moderation queue:", error);
            showToast('Failed to load reports', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchModerationQueue();
    }, [filters]);

    const handleModerationAction = async (itemId, action) => {
        try {
            // Ramani ya action kwenda status
            const statusMap = {
                'approve': 'approved',
                'reject': 'rejected',
                'warn': 'warned',
                'ban': 'banned'
            };

            const status = statusMap[action];
            await api.put(`/admin/moderation/${itemId}`, { status });

            showToast(`Content ${action === 'approve' ? 'approved' : 'processed'} successfully`, 'success');

            // Ondoa iliyokwishela process kwenye list
            setModerationQueue(prev => prev.filter(item => (item.id || item._id) !== itemId));
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to process item', 'error');
        }
    };

    const handleBulkAction = () => {
        if (selectedItems.length === 0) {
            showToast('Please select items first', 'warning');
            return;
        }

        selectedItems.forEach(itemId => {
            handleModerationAction(itemId, bulkAction);
        });

        setSelectedItems([]);
        setBulkAction('');
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'high': return '#e74c3c';
            case 'medium': return '#f1c40f';
            case 'low': return '#2ecc71';
            default: return '#95a5a6';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return '#2ecc71';
            case 'rejected': return '#e74c3c';
            case 'pending': return '#f1c40f';
            default: return '#95a5a6';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'post': return FileText;
            case 'comment': return MessageSquare;
            case 'story': return Eye;
            case 'reel': return Video;
            case 'image': return ImageIcon;
            default: return FileText;
        }
    };

    return (
        <div className="content-moderation-tab">
            {/* Header */}
            <div className="tab-header">
                <div className="header-left">
                    <h2>Content Moderation</h2>
                    <p>Review and manage reported content</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn-secondary"
                        onClick={() => setShowAnalytics(!showAnalytics)}
                    >
                        <BarChart3 size={18} />
                        {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
                    </button>
                    <button className="btn-primary">
                        <Download size={18} />
                        Export Reports
                    </button>
                </div>
            </div>

            {/* Analytics Dashboard */}
            {showAnalytics && (
                <div className="analytics-dashboard">
                    <div className="analytics-grid">
                        <div className="analytics-card">
                            <div className="analytics-header">
                                <h3>Content Overview</h3>
                                <TrendingUp size={24} />
                            </div>
                            <div className="analytics-content">
                                <div className="metric">
                                    <span className="metric-label">Total Reports</span>
                                    <span className="metric-value">156</span>
                                </div>
                                <div className="metric">
                                    <span className="metric-label">Pending Review</span>
                                    <span className="metric-value">23</span>
                                </div>
                                <div className="metric">
                                    <span className="metric-label">Resolved</span>
                                    <span className="metric-value">133</span>
                                </div>
                            </div>
                        </div>

                        <div className="analytics-card">
                            <div className="analytics-header">
                                <h3>Severity Breakdown</h3>
                                <AlertTriangle size={24} />
                            </div>
                            <div className="severity-breakdown">
                                <div className="severity-item">
                                    <div className="severity-bar high"></div>
                                    <span>High (15%)</span>
                                </div>
                                <div className="severity-item">
                                    <div className="severity-bar medium"></div>
                                    <span>Medium (35%)</span>
                                </div>
                                <div className="severity-item">
                                    <div className="severity-bar low"></div>
                                    <span>Low (50%)</span>
                                </div>
                            </div>
                        </div>

                        <div className="analytics-card">
                            <div className="analytics-header">
                                <h3>Content Types</h3>
                                <PieChart size={24} />
                            </div>
                            <div className="content-types">
                                <div className="type-item">
                                    <span className="type-icon"><FileText size={16} /></span>
                                    <span>Posts (45%)</span>
                                </div>
                                <div className="type-item">
                                    <span className="type-icon"><MessageSquare size={16} /></span>
                                    <span>Comments (35%)</span>
                                </div>
                                <div className="type-item">
                                    <span className="type-icon"><Eye size={16} /></span>
                                    <span>Stories (15%)</span>
                                </div>
                                <div className="type-item">
                                    <span className="type-icon"><Video size={16} /></span>
                                    <span>Reels (5%)</span>
                                </div>
                            </div>
                        </div>

                        <div className="analytics-card">
                            <div className="analytics-header">
                                <h3>Moderation Stats</h3>
                                <Shield size={24} />
                            </div>
                            <div className="moderation-stats">
                                <div className="stat-item">
                                    <span className="stat-icon approved"><CheckCircle size={20} /></span>
                                    <div>
                                        <span className="stat-label">Approved</span>
                                        <span className="stat-value">85%</span>
                                    </div>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-icon rejected"><XCircle size={20} /></span>
                                    <div>
                                        <span className="stat-label">Rejected</span>
                                        <span className="stat-value">12%</span>
                                    </div>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-icon warned"><AlertTriangle size={20} /></span>
                                    <div>
                                        <span className="stat-label">Warnings</span>
                                        <span className="stat-value">3%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="filters-section">
                <div className="search-filters">
                    <div className="search-box">
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search content, authors, or reports..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>

                    <div className="filter-group">
                        <select
                            value={filters.contentType}
                            onChange={(e) => setFilters({ ...filters, contentType: e.target.value })}
                        >
                            <option value="all">All Content Types</option>
                            <option value="post">Posts</option>
                            <option value="comment">Comments</option>
                            <option value="story">Stories</option>
                            <option value="reel">Reels</option>
                            <option value="image">Images</option>
                        </select>

                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>

                        <select
                            value={filters.severity}
                            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                        >
                            <option value="all">All Severity</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                </div>

                <div className="filter-actions">
                    <button className="refresh-btn" onClick={() => { }}>
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
                <div className="bulk-actions">
                    <div className="selection-info">
                        {selectedItems.length} items selected
                    </div>
                    <div className="bulk-actions-controls">
                        <select
                            value={bulkAction}
                            onChange={(e) => setBulkAction(e.target.value)}
                        >
                            <option value="">Bulk Actions</option>
                            <option value="approve">Approve Selected</option>
                            <option value="reject">Reject Selected</option>
                            <option value="warn">Issue Warnings</option>
                            <option value="ban">Ban Users</option>
                        </select>
                        <button
                            className="btn-primary"
                            onClick={handleBulkAction}
                            disabled={!bulkAction}
                        >
                            Apply Action
                        </button>
                    </div>
                </div>
            )}

            {/* Moderation Queue */}
            <div className="moderation-queue">
                {isLoading ? (
                    <div className="loading-state">
                        <RefreshCw size={32} className="spin-anim" />
                        <p>Loading moderation queue...</p>
                    </div>
                ) : (
                    <>
                        <div className="queue-header">
                            <div className="queue-stats">
                                <span className="queue-count">{moderationQueue.length} items in queue</span>
                                <span className="queue-time">Updated 2 minutes ago</span>
                            </div>
                        </div>

                        <div className="queue-list">
                            {moderationQueue.map(item => {
                                const Icon = getTypeIcon(item.type);
                                return (
                                    <div key={item._id} className={`moderation-item ${item.status}`}>
                                        <div className="item-header">
                                            <div className="item-type">
                                                <Icon size={20} color={getSeverityColor(item.severity || 'low')} />
                                                <span className="type-label">{(item.content_type || 'post').toUpperCase()}</span>
                                                <span
                                                    className="severity-badge"
                                                    style={{ backgroundColor: `${getSeverityColor(item.severity || 'low')}20`, color: getSeverityColor(item.severity || 'low') }}
                                                >
                                                    {(item.severity || 'low').toUpperCase()}
                                                </span>
                                                <span
                                                    className="status-badge"
                                                    style={{ backgroundColor: `${getStatusColor(item.status)}20`, color: getStatusColor(item.status) }}
                                                >
                                                    {item.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="item-actions">
                                                <button
                                                    className="action-btn approve"
                                                    onClick={() => handleModerationAction(item._id, 'approve')}
                                                >
                                                    <CheckCircle size={16} />
                                                    Approve
                                                </button>
                                                <button
                                                    className="action-btn reject"
                                                    onClick={() => handleModerationAction(item._id, 'reject')}
                                                >
                                                    <XCircle size={16} />
                                                    Reject
                                                </button>
                                                <button
                                                    className="action-btn warn"
                                                    onClick={() => handleModerationAction(item._id, 'warn')}
                                                >
                                                    <AlertTriangle size={16} />
                                                    Warn
                                                </button>
                                                <button
                                                    className="action-btn ban"
                                                    onClick={() => handleModerationAction(item._id, 'ban')}
                                                >
                                                    <Shield size={16} />
                                                    Ban User
                                                </button>
                                            </div>
                                        </div>

                                        <div className="item-main">
                                            <div className="item-type-badge">{item.content_type}</div>
                                            <p className="item-text">
                                                {item.content_text ? (
                                                    item.content_text.length > 100
                                                        ? item.content_text.substring(0, 100) + '...'
                                                        : item.content_text
                                                ) : 'No content preview'}
                                            </p>
                                            <div className="item-reason">
                                                <AlertTriangle size={14} />
                                                <span>Reason: {item.reported_reason || 'Not specified'}</span>
                                            </div>
                                        </div>

                                        <div className="item-content">
                                            <div className="content-preview">
                                                {item.media_url && (
                                                    <div className="media-preview">
                                                        <img src={item.media_url} alt="Content media" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="content-meta">
                                                <div className="meta-item">
                                                    <User size={16} />
                                                    <span>Content ID: {item.content_id || 'Unknown'}</span>
                                                </div>
                                                <div className="meta-item">
                                                    <Flag size={16} />
                                                    <span>Reported by: {item.reported_by || 'System'}</span>
                                                </div>
                                                <div className="meta-item">
                                                    <Calendar size={16} />
                                                    <span>{item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now'}</span>
                                                </div>
                                            </div>

                                            {item.flaggedWords && item.flaggedWords.length > 0 && (
                                                <div className="flagged-words">
                                                    <strong>Flagged Words:</strong>
                                                    <div className="words-list">
                                                        {item.flaggedWords.map((word, index) => (
                                                            <span key={index} className="flagged-word">{word}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ContentModerationTab;