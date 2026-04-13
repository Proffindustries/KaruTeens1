import React, { useState, useEffect } from 'react';
import api from '../api/client';

import {
    MessageSquare,
    Eye,
    EyeOff,
    Trash2,
    ShieldCheck,
    XCircle,
    AlertTriangle,
    User,
    Clock,
    Calendar,
    TrendingUp,
    BarChart3,
    Filter,
    Search,
    RefreshCw,
    Download,
    Upload,
    Plus,
    Edit,
    CheckCircle,
    Ban,
    Shield,
    Users,
    MessageCircle,
    ThumbsUp,
    MessageCircleMore,
    AlertCircle,
    Zap,
    Globe,
    UserCheck,
    UserX,
    ChevronLeft,
    ChevronRight,
    Copy,
    Share2,
    FileText,
    FileClock,
    FileSearch,
    FileCheck,
    FileSpreadsheet,
    Video,
    Image,
    AudioLines,
    Tag,
    Star,
    Crown,
    Repeat,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const CommentManagementTab = () => {
    const [comments, setComments] = useState([]);
    const [userStats, setUserStats] = useState([]);
    const [filters, setFilters] = useState({
        status: 'all',
        content_type: 'all',
        user_id: '',
        spam_score_min: '',
        spam_score_max: '',
        reported_count_min: '',
        date_from: '',
        date_to: '',
        sort_by: 'created_at',
        sort_order: 'desc',
    });

    const [selectedComments, setSelectedComments] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [showModerationModal, setShowModerationModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showSpamRulesModal, setShowSpamRulesModal] = useState(false);
    const [moderatingComment, setModeratingComment] = useState(null);
    const [moderationAction, setModerationAction] = useState('approve');
    const [moderationReason, setModerationReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const { showToast } = useToast();

    // Comments data will be fetched from API

    // User stats data will be fetched from API

    // Fetch comments from API
    useEffect(() => {
        let isMounted = true;

        const loadComments = async () => {
            setIsLoading(true);
            try {
                const { data } = await api.get('/comments');
                if (isMounted) {
                    setComments(data);
                }
            } catch (error) {
                console.error('Failed to load comments:', error);
                // Keep empty state, UI will handle loading/error states
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadComments();

        return () => {
            isMounted = false;
        };
    }, [filters]);

    // Fetch user stats from API
    useEffect(() => {
        let isMounted = true;

        const loadUserStats = async () => {
            try {
                const { data } = await api.get('/stats/users');
                if (isMounted) {
                    setUserStats(data);
                }
            } catch (error) {
                console.error('Failed to load user stats:', error);
                // Keep empty state
            }
        };

        loadUserStats();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleBulkAction = () => {
        if (selectedComments.length === 0) {
            showToast('Please select comments first', 'warning');
            return;
        }

        if (bulkAction === 'approve') {
            setComments((prev) =>
                prev.map((c) =>
                    selectedComments.includes(c.id) ? { ...c, status: 'approved' } : c,
                ),
            );
            setSelectedComments([]);
            setBulkAction('');
            showToast('Comments approved', 'success');
        } else if (bulkAction === 'reject') {
            setComments((prev) =>
                prev.map((c) =>
                    selectedComments.includes(c.id) ? { ...c, status: 'rejected' } : c,
                ),
            );
            setSelectedComments([]);
            setBulkAction('');
            showToast('Comments rejected', 'info');
        } else if (bulkAction === 'delete') {
            if (
                confirm(`Delete ${selectedComments.length} comments? This action cannot be undone.`)
            ) {
                setComments((prev) => prev.filter((c) => !selectedComments.includes(c.id)));
                setSelectedComments([]);
                setBulkAction('');
                showToast('Comments deleted', 'success');
            }
        } else if (bulkAction === 'mark_spam') {
            setComments((prev) =>
                prev.map((c) => (selectedComments.includes(c.id) ? { ...c, status: 'spam' } : c)),
            );
            setSelectedComments([]);
            setBulkAction('');
            showToast('Comments marked as spam', 'info');
        }
    };

    const handleModerateComment = (comment) => {
        setModeratingComment(comment);
        setShowModerationModal(true);
    };

    const confirmModeration = () => {
        if (!moderatingComment || !moderationAction) return;

        setComments((prev) =>
            prev.map((c) =>
                c.id === moderatingComment.id
                    ? {
                          ...c,
                          status:
                              moderationAction === 'approve'
                                  ? 'approved'
                                  : moderationAction === 'reject'
                                    ? 'rejected'
                                    : moderationAction === 'delete'
                                      ? 'deleted'
                                      : moderationAction === 'spam'
                                        ? 'spam'
                                        : c.status,
                          moderation_notes: moderationReason,
                          updated_at: new Date().toISOString(),
                      }
                    : c,
            ),
        );

        setShowModerationModal(false);
        setModeratingComment(null);
        setModerationAction('approve');
        setModerationReason('');
        showToast(`Comment ${moderationAction}ed successfully`, 'success');
    };

    const handleDeleteComment = (commentId) => {
        if (
            confirm('Are you sure you want to delete this comment? This action cannot be undone.')
        ) {
            setComments((prev) => prev.filter((c) => c.id !== commentId));
            showToast('Comment deleted', 'success');
        }
    };

    const toggleCommentSelection = (commentId) => {
        setSelectedComments((prev) =>
            prev.includes(commentId) ? prev.filter((id) => id !== commentId) : [...prev, commentId],
        );
    };

    const selectAllComments = () => {
        if (selectedComments.length === comments.length) {
            setSelectedComments([]);
        } else {
            setSelectedComments(comments.map((c) => c.id));
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return { color: 'green', text: 'Approved', icon: <CheckCircle size={14} /> };
            case 'pending':
                return { color: 'orange', text: 'Pending', icon: <FileClock size={14} /> };
            case 'rejected':
                return { color: 'red', text: 'Rejected', icon: <XCircle size={14} /> };
            case 'spam':
                return { color: 'purple', text: 'Spam', icon: <AlertTriangle size={14} /> };
            case 'deleted':
                return { color: 'gray', text: 'Deleted', icon: <Trash2 size={14} /> };
            default:
                return { color: 'gray', text: status, icon: <AlertCircle size={14} /> };
        }
    };

    const getContentTypeBadge = (contentType) => {
        switch (contentType) {
            case 'post':
                return { color: 'blue', text: 'Post', icon: <FileText size={14} /> };
            case 'story':
                return { color: 'orange', text: 'Story', icon: <Globe size={14} /> };
            case 'reel':
                return { color: 'purple', text: 'Reel', icon: <Video size={14} /> };
            default:
                return { color: 'gray', text: contentType, icon: <AlertTriangle size={14} /> };
        }
    };

    const getSpamLevel = (score) => {
        if (score >= 0.8) return { level: 'High', color: 'red' };
        if (score >= 0.5) return { level: 'Medium', color: 'orange' };
        if (score >= 0.2) return { level: 'Low', color: 'yellow' };
        return { level: 'None', color: 'green' };
    };

    const getSentimentLevel = (score) => {
        if (score >= 0.5) return { level: 'Positive', color: 'green' };
        if (score >= -0.2) return { level: 'Neutral', color: 'blue' };
        return { level: 'Negative', color: 'red' };
    };

    const formatSpamScore = (score) => {
        return `${(score * 100).toFixed(0)}%`;
    };

    const getDaysSinceCreated = (createdAt) => {
        const now = new Date();
        const created = new Date(createdAt);
        const diffTime = now - created;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const getPriorityColor = (spamScore, reportedCount) => {
        if (spamScore >= 0.8 || reportedCount >= 5) return 'red';
        if (spamScore >= 0.5 || reportedCount >= 2) return 'orange';
        return 'green';
    };

    return (
        <div className="comment-management-tab">
            {/* Header */}
            <div className="tab-header">
                <div className="header-left">
                    <h2>Comment Management</h2>
                    <p>Manage user comments with AI-powered moderation and spam detection</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary">
                        <Upload size={18} />
                        Import Comments
                    </button>
                    <button className="btn-secondary">
                        <Download size={18} />
                        Export Comments
                    </button>
                    <button className="btn-primary" onClick={() => setShowSpamRulesModal(true)}>
                        <ZapIcon size={18} />
                        Spam Rules
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-section">
                <div className="search-filters">
                    <div className="search-box">
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search comments by content or username..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="approved">Approved</option>
                            <option value="pending">Pending Review</option>
                            <option value="rejected">Rejected</option>
                            <option value="spam">Spam</option>
                            <option value="deleted">Deleted</option>
                        </select>

                        <select
                            value={filters.content_type}
                            onChange={(e) => handleFilterChange('content_type', e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value="post">Post</option>
                            <option value="story">Story</option>
                            <option value="reel">Reel</option>
                        </select>

                        <input
                            type="number"
                            placeholder="Min spam score"
                            value={filters.spam_score_min}
                            onChange={(e) => handleFilterChange('spam_score_min', e.target.value)}
                        />

                        <input
                            type="number"
                            placeholder="Min reports"
                            value={filters.reported_count_min}
                            onChange={(e) =>
                                handleFilterChange('reported_count_min', e.target.value)
                            }
                        />
                    </div>
                </div>

                <div className="filter-actions">
                    <button className="refresh-btn" onClick={() => {}}>
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                    <button className="btn-secondary" onClick={() => setShowStatsModal(true)}>
                        <BarChart3Icon size={18} />
                        User Stats
                    </button>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedComments.length > 0 && (
                <div className="bulk-actions">
                    <div className="selection-info">
                        {selectedComments.length} comments selected
                    </div>
                    <div className="bulk-actions-controls">
                        <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
                            <option value="">Bulk Actions</option>
                            <option value="approve">Approve</option>
                            <option value="reject">Reject</option>
                            <option value="delete">Delete Comments</option>
                            <option value="mark_spam">Mark as Spam</option>
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

            {/* Comments Table */}
            <div className="comments-table-container">
                {isLoading ? (
                    <div className="loading-state">
                        <RefreshCw size={32} className="spin-anim" />
                        <p>Loading comments...</p>
                    </div>
                ) : (
                    <>
                        <div className="table-header">
                            <div className="select-all">
                                <input
                                    type="checkbox"
                                    checked={
                                        selectedComments.length === comments.length &&
                                        comments.length > 0
                                    }
                                    onChange={selectAllComments}
                                />
                                <span>Select All</span>
                            </div>
                            <div className="table-actions">
                                <span className="comment-count">
                                    {comments.length} comments found
                                </span>
                                <button className="refresh-btn" onClick={() => {}}>
                                    <RefreshCw size={18} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>
                                            <input
                                                type="checkbox"
                                                checked={
                                                    selectedComments.length === comments.length &&
                                                    comments.length > 0
                                                }
                                                onChange={selectAllComments}
                                            />
                                        </th>
                                        <th>Comment Info</th>
                                        <th>Status & Type</th>
                                        <th>User & Date</th>
                                        <th>Content Analysis</th>
                                        <th>Reports & Actions</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {comments.map((comment) => (
                                        <tr
                                            key={comment.id}
                                            className={
                                                comment.status === 'spam'
                                                    ? 'spam-comment'
                                                    : comment.status === 'rejected'
                                                      ? 'rejected-comment'
                                                      : ''
                                            }
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedComments.includes(comment.id)}
                                                    onChange={() =>
                                                        toggleCommentSelection(comment.id)
                                                    }
                                                />
                                            </td>
                                            <td>
                                                <div className="comment-info">
                                                    <div className="comment-content">
                                                        <p>{comment.content}</p>
                                                        {comment.is_edited && (
                                                            <span className="edited-badge">
                                                                Edited
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="comment-meta">
                                                        <span className="content-id">
                                                            Content: {comment.content_id}
                                                        </span>
                                                        {comment.parent_id && (
                                                            <span className="parent-id">
                                                                Reply to: {comment.parent_id}
                                                            </span>
                                                        )}
                                                        {comment.replies_count > 0 && (
                                                            <span className="replies-count">
                                                                {comment.replies_count} replies
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="status-info">
                                                    <div className="status-badge">
                                                        <span
                                                            className={`status-pill ${getStatusBadge(comment.status).color}`}
                                                        >
                                                            {getStatusBadge(comment.status).icon}
                                                            {getStatusBadge(comment.status).text}
                                                        </span>
                                                        <span
                                                            className={`content-type-pill ${getContentTypeBadge(comment.content_type).color}`}
                                                        >
                                                            {
                                                                getContentTypeBadge(
                                                                    comment.content_type,
                                                                ).icon
                                                            }
                                                            {
                                                                getContentTypeBadge(
                                                                    comment.content_type,
                                                                ).text
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="status-dates">
                                                        <div className="status-date">
                                                            <Calendar size={12} />
                                                            <span>
                                                                Created:{' '}
                                                                {new Date(
                                                                    comment.created_at,
                                                                ).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        {comment.edited_at && (
                                                            <div className="status-date">
                                                                <Repeat size={12} />
                                                                <span>
                                                                    Edited:{' '}
                                                                    {new Date(
                                                                        comment.edited_at,
                                                                    ).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {comment.moderation_notes && (
                                                        <div className="moderation-notes">
                                                            <ShieldCheck size={12} />
                                                            <span>{comment.moderation_notes}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="user-info">
                                                    <div className="user-details">
                                                        <div className="user-name">
                                                            <User size={14} />
                                                            <span>{comment.username}</span>
                                                        </div>
                                                        <div className="user-id">
                                                            <span>ID: {comment.user_id}</span>
                                                        </div>
                                                    </div>
                                                    <div className="date-info">
                                                        <div className="created-date">
                                                            <Calendar size={12} />
                                                            <span>
                                                                Created:{' '}
                                                                {new Date(
                                                                    comment.created_at,
                                                                ).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="days-since">
                                                            <Clock size={12} />
                                                            <span>
                                                                {getDaysSinceCreated(
                                                                    comment.created_at,
                                                                )}{' '}
                                                                days ago
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="user-actions">
                                                        <button className="user-action-btn">
                                                            <UserCheck size={12} />
                                                            View Profile
                                                        </button>
                                                        <button className="user-action-btn">
                                                            <UserX size={12} />
                                                            Block User
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="analysis-info">
                                                    <div className="analysis-metrics">
                                                        <div className="metric-item">
                                                            <AlertTriangle size={14} />
                                                            <span
                                                                className={`spam-score ${getSpamLevel(comment.spam_score || 0).color}`}
                                                            >
                                                                {formatSpamScore(
                                                                    comment.spam_score || 0,
                                                                )}
                                                            </span>
                                                            <small>Spam Score</small>
                                                        </div>
                                                        <div className="metric-item">
                                                            <TrendingUp size={14} />
                                                            <span
                                                                className={`sentiment-score ${getSentimentLevel(comment.sentiment_score || 0).color}`}
                                                            >
                                                                {comment.sentiment_score > 0
                                                                    ? '+'
                                                                    : ''}
                                                                {(
                                                                    comment.sentiment_score || 0
                                                                ).toFixed(1)}
                                                            </span>
                                                            <small>Sentiment</small>
                                                        </div>
                                                    </div>
                                                    <div className="analysis-actions">
                                                        <div
                                                            className="priority-badge"
                                                            style={{
                                                                backgroundColor: getPriorityColor(
                                                                    comment.spam_score || 0,
                                                                    comment.reported_count,
                                                                ),
                                                            }}
                                                        >
                                                            Priority:{' '}
                                                            {getPriorityColor(
                                                                comment.spam_score || 0,
                                                                comment.reported_count,
                                                            ) === 'red'
                                                                ? 'High'
                                                                : getPriorityColor(
                                                                        comment.spam_score || 0,
                                                                        comment.reported_count,
                                                                    ) === 'orange'
                                                                  ? 'Medium'
                                                                  : 'Low'}
                                                        </div>
                                                        <div className="likes-count">
                                                            <ThumbsUp size={12} />
                                                            <span>{comment.likes} likes</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="reports-info">
                                                    <div className="reports-count">
                                                        <AlertCircle size={14} />
                                                        <span>
                                                            {comment.reported_count} reports
                                                        </span>
                                                    </div>
                                                    {comment.reports.length > 0 && (
                                                        <div className="reports-list">
                                                            {comment.reports.map((report, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="report-item"
                                                                >
                                                                    <span className="report-reason">
                                                                        {report.reason}
                                                                    </span>
                                                                    <span className="report-user">
                                                                        by{' '}
                                                                        {
                                                                            report.reported_by_username
                                                                        }
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="moderation-history">
                                                        {comment.moderation_history.length > 0 && (
                                                            <div className="history-item">
                                                                <ShieldCheck size={12} />
                                                                <span>
                                                                    Last action:{' '}
                                                                    {
                                                                        comment.moderation_history[
                                                                            comment
                                                                                .moderation_history
                                                                                .length - 1
                                                                        ].action
                                                                    }
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="action-btn view"
                                                        onClick={() =>
                                                            window.open(
                                                                `/post/${comment.content_id}`,
                                                                '_blank',
                                                            )
                                                        }
                                                        title="View Content"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        className="action-btn moderate"
                                                        onClick={() =>
                                                            handleModerateComment(comment)
                                                        }
                                                        title="Moderate Comment"
                                                    >
                                                        <ShieldCheck size={16} />
                                                    </button>
                                                    {comment.status === 'pending' && (
                                                        <>
                                                            <button
                                                                className="action-btn approve"
                                                                onClick={() => {
                                                                    setModeratingComment(comment);
                                                                    setModerationAction('approve');
                                                                    setModerationReason(
                                                                        'Content is appropriate',
                                                                    );
                                                                    confirmModeration();
                                                                }}
                                                                title="Approve Comment"
                                                            >
                                                                <CheckCircle size={16} />
                                                            </button>
                                                            <button
                                                                className="action-btn reject"
                                                                onClick={() => {
                                                                    setModeratingComment(comment);
                                                                    setModerationAction('reject');
                                                                    setModerationReason(
                                                                        'Inappropriate content',
                                                                    );
                                                                    confirmModeration();
                                                                }}
                                                                title="Reject Comment"
                                                            >
                                                                <XCircle size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={() =>
                                                            handleDeleteComment(comment.id)
                                                        }
                                                        title="Delete Comment"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Moderation Modal */}
            {showModerationModal && moderatingComment && (
                <div className="modal-overlay" onClick={() => setShowModerationModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '600px' }}
                    >
                        <div className="modal-header">
                            <h3>Moderate Comment</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowModerationModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="moderation-comment-preview">
                                <div className="comment-preview-header">
                                    <strong>{moderatingComment.username}</strong>
                                    <span className="comment-date">
                                        {new Date(moderatingComment.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="comment-preview-content">
                                    {moderatingComment.content}
                                </div>
                                <div className="comment-preview-meta">
                                    <span className="spam-score-preview">
                                        Spam Score:{' '}
                                        {formatSpamScore(moderatingComment.spam_score || 0)}
                                    </span>
                                    <span className="reports-count-preview">
                                        Reports: {moderatingComment.reported_count}
                                    </span>
                                </div>
                            </div>

                            <div className="moderation-form">
                                <div className="form-group">
                                    <label>Action</label>
                                    <select
                                        value={moderationAction}
                                        onChange={(e) => setModerationAction(e.target.value)}
                                        className="form-input"
                                    >
                                        <option value="approve">Approve</option>
                                        <option value="reject">Reject</option>
                                        <option value="delete">Delete</option>
                                        <option value="spam">Mark as Spam</option>
                                        <option value="warn">Issue Warning</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Reason/Notes (Optional)</label>
                                    <textarea
                                        className="form-input"
                                        rows="4"
                                        value={moderationReason}
                                        onChange={(e) => setModerationReason(e.target.value)}
                                        placeholder="Enter moderation reason or notes..."
                                    ></textarea>
                                </div>

                                <div className="moderation-warnings">
                                    {moderationAction === 'reject' && (
                                        <div className="warning-box">
                                            <AlertCircle size={16} />
                                            <span>
                                                Rejecting this comment will mark it as inappropriate
                                            </span>
                                        </div>
                                    )}
                                    {moderationAction === 'delete' && (
                                        <div className="warning-box">
                                            <XCircle size={16} />
                                            <span>
                                                Deleting this comment is permanent and cannot be
                                                undone
                                            </span>
                                        </div>
                                    )}
                                    {moderationAction === 'spam' && (
                                        <div className="warning-box">
                                            <AlertTriangle size={16} />
                                            <span>
                                                Marking as spam will affect the user's reputation
                                                score
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setShowModerationModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={confirmModeration}
                            >
                                Apply{' '}
                                {moderationAction.charAt(0).toUpperCase() +
                                    moderationAction.slice(1)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Stats Modal */}
            {showStatsModal && (
                <div className="modal-overlay" onClick={() => setShowStatsModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '1000px' }}
                    >
                        <div className="modal-header">
                            <h3>User Comment Statistics</h3>
                            <button className="close-btn" onClick={() => setShowStatsModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="stats-grid">
                                {userStats.map((stats) => (
                                    <div key={stats.user_id} className="stat-card">
                                        <div className="stat-header">
                                            <div className="user-info">
                                                <strong>{stats.username}</strong>
                                                <span className="user-id">ID: {stats.user_id}</span>
                                            </div>
                                            <div className="stat-actions">
                                                <button className="stat-action-btn">
                                                    View Profile
                                                </button>
                                                <button className="stat-action-btn">
                                                    Block User
                                                </button>
                                            </div>
                                        </div>

                                        <div className="stat-metrics">
                                            <div className="metric-row">
                                                <div className="metric-item">
                                                    <FileText size={20} />
                                                    <div>
                                                        <strong>{stats.total_comments}</strong>
                                                        <span>Total Comments</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <CheckCircle size={20} />
                                                    <div>
                                                        <strong>{stats.approved_comments}</strong>
                                                        <span>Approved</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <XCircle size={20} />
                                                    <div>
                                                        <strong>{stats.rejected_comments}</strong>
                                                        <span>Rejected</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <AlertTriangle size={20} />
                                                    <div>
                                                        <strong>{stats.spam_comments}</strong>
                                                        <span>Spam</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="metric-row">
                                                <div className="metric-item">
                                                    <ThumbsUp size={20} />
                                                    <div>
                                                        <strong>
                                                            {stats.total_likes_received}
                                                        </strong>
                                                        <span>Likes Received</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <MessageCircle size={20} />
                                                    <div>
                                                        <strong>
                                                            {stats.total_replies_received}
                                                        </strong>
                                                        <span>Replies Received</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <AlertTriangle size={20} />
                                                    <div>
                                                        <strong>
                                                            {stats.avg_spam_score
                                                                ? (
                                                                      stats.avg_spam_score * 100
                                                                  ).toFixed(0)
                                                                : '0'}
                                                            %
                                                        </strong>
                                                        <span>Avg Spam Score</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <TrendingUp size={20} />
                                                    <div>
                                                        <strong>
                                                            {stats.avg_sentiment_score
                                                                ? stats.avg_sentiment_score.toFixed(
                                                                      1,
                                                                  )
                                                                : '0.0'}
                                                        </strong>
                                                        <span>Avg Sentiment</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="stat-footer">
                                            <span className="last-activity">
                                                Last Comment:{' '}
                                                {stats.last_comment_at
                                                    ? new Date(
                                                          stats.last_comment_at,
                                                      ).toLocaleString()
                                                    : 'Never'}
                                            </span>
                                            <div className="user-reputation">
                                                <span className="reputation-label">
                                                    Reputation:
                                                </span>
                                                <span
                                                    className={`reputation-score ${stats.avg_spam_score && stats.avg_spam_score > 0.5 ? 'bad' : 'good'}`}
                                                >
                                                    {stats.avg_spam_score &&
                                                    stats.avg_spam_score > 0.5
                                                        ? 'Poor'
                                                        : 'Good'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Spam Rules Modal */}
            {showSpamRulesModal && (
                <div className="modal-overlay" onClick={() => setShowSpamRulesModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '800px' }}
                    >
                        <div className="modal-header">
                            <h3>Spam Detection Rules</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowSpamRulesModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="spam-rules-list">
                                <div className="rule-item">
                                    <div className="rule-header">
                                        <strong>Keyword Detection</strong>
                                        <span className="rule-score">Score: 0.3</span>
                                    </div>
                                    <div className="rule-pattern">
                                        Pattern: (viagra|casino|loan|cheap)
                                    </div>
                                    <div className="rule-description">
                                        Detects common spam keywords in comment content
                                    </div>
                                    <div className="rule-actions">
                                        <button className="rule-action-btn">Edit</button>
                                        <button className="rule-action-btn">Disable</button>
                                    </div>
                                </div>

                                <div className="rule-item">
                                    <div className="rule-header">
                                        <strong>Link Detection</strong>
                                        <span className="rule-score">Score: 0.5</span>
                                    </div>
                                    <div className="rule-pattern">Pattern: (http|www\.)</div>
                                    <div className="rule-description">
                                        Detects URLs in comments from new users
                                    </div>
                                    <div className="rule-actions">
                                        <button className="rule-action-btn">Edit</button>
                                        <button className="rule-action-btn">Disable</button>
                                    </div>
                                </div>

                                <div className="rule-item">
                                    <div className="rule-header">
                                        <strong>Profanity Filter</strong>
                                        <span className="rule-score">Score: 0.4</span>
                                    </div>
                                    <div className="rule-pattern">
                                        Pattern: (badword1|badword2|badword3)
                                    </div>
                                    <div className="rule-description">
                                        Filters offensive language
                                    </div>
                                    <div className="rule-actions">
                                        <button className="rule-action-btn">Edit</button>
                                        <button className="rule-action-btn">Disable</button>
                                    </div>
                                </div>
                            </div>

                            <div className="add-rule-form">
                                <h4>Add New Spam Rule</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Rule Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g., Promotion Detection"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Score</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="1"
                                            className="form-input"
                                            placeholder="0.1 - 1.0"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Pattern (Regex)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., (buy now|click here)"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        className="form-input"
                                        rows="2"
                                        placeholder="What this rule detects"
                                    ></textarea>
                                </div>
                                <div className="form-actions">
                                    <button className="btn-secondary">Cancel</button>
                                    <button className="btn-primary">Add Rule</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommentManagementTab;
