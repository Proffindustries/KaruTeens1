import React, { useState, useEffect } from 'react';
import {
    Video,
    Image,
    Clock,
    MessageSquare,
    Eye,
    EyeOff,
    Trash2,
    ShieldCheck,
    XCircle,
    AlertTriangle,
    User,
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
    AudioLines,
    Tag,
    Star,
    Crown,
    Repeat,
    Sparkles,
    Award,
    Play,
    MapPin,
    Timer,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const StoryManagementTab = () => {
    const [stories, setStories] = useState([]);
    const [filters, setFilters] = useState({
        status: 'all',
        user_id: '',
        media_type: 'all',
        story_type: 'all',
        is_highlight: 'all',
        is_private: 'all',
        spam_score_min: '',
        spam_score_max: '',
        reported_count_min: '',
        date_from: '',
        date_to: '',
        sort_by: 'created_at',
        sort_order: 'desc',
    });

    const [selectedStories, setSelectedStories] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [showModerationModal, setShowModerationModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showHighlightsModal, setShowHighlightsModal] = useState(false);
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    const [moderatingStory, setModeratingStory] = useState(null);
    const [moderationAction, setModerationAction] = useState('approve');
    const [moderationReason, setModerationReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const { showToast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        // Fetch real data from API
        Promise.all([
            api.get('/stories'),
            api.get('/user/stats'),
            api.get('/highlights'),
            api.get('/templates'),
        ])
            .then(([storiesRes, statsRes, highlightsRes, templatesRes]) => {
                setStories(storiesRes.data);
                setUserStats(statsRes.data);
                setHighlights(highlightsRes.data);
                setTemplates(templatesRes.data);
            })
            .catch((error) => {
                console.error('Failed to load story management data:', error);
                // Set appropriate empty states
                setStories([]);
                setUserStats([]);
                setHighlights([]);
                setTemplates([]);
            })
            .finally(() => setIsLoading(false));
    }, [filters]);

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleBulkAction = () => {
        if (selectedStories.length === 0) {
            showToast('Please select stories first', 'warning');
            return;
        }

        if (bulkAction === 'approve') {
            setStories((prev) =>
                prev.map((s) =>
                    selectedStories.includes(s.id) ? { ...s, moderation_status: 'approved' } : s,
                ),
            );
            setSelectedStories([]);
            setBulkAction('');
            showToast('Stories approved', 'success');
        } else if (bulkAction === 'reject') {
            setStories((prev) =>
                prev.map((s) =>
                    selectedStories.includes(s.id) ? { ...s, moderation_status: 'rejected' } : s,
                ),
            );
            setSelectedStories([]);
            setBulkAction('');
            showToast('Stories rejected', 'info');
        } else if (bulkAction === 'delete') {
            if (
                confirm(`Delete ${selectedStories.length} stories? This action cannot be undone.`)
            ) {
                setStories((prev) => prev.filter((s) => !selectedStories.includes(s.id)));
                setSelectedStories([]);
                setBulkAction('');
                showToast('Stories deleted', 'success');
            }
        } else if (bulkAction === 'mark_spam') {
            setStories((prev) =>
                prev.map((s) =>
                    selectedStories.includes(s.id) ? { ...s, moderation_status: 'spam' } : s,
                ),
            );
            setSelectedStories([]);
            setBulkAction('');
            showToast('Stories marked as spam', 'info');
        } else if (bulkAction === 'make_highlight') {
            setStories((prev) =>
                prev.map((s) =>
                    selectedStories.includes(s.id)
                        ? { ...s, is_highlight: true, highlight_category: 'General' }
                        : s,
                ),
            );
            setSelectedStories([]);
            setBulkAction('');
            showToast('Stories added to highlights', 'success');
        }
    };

    const handleModerateStory = (story) => {
        setModeratingStory(story);
        setShowModerationModal(true);
    };

    const confirmModeration = () => {
        if (!moderatingStory || !moderationAction) return;

        setStories((prev) =>
            prev.map((s) =>
                s.id === moderatingStory.id
                    ? {
                          ...s,
                          moderation_status:
                              moderationAction === 'approve'
                                  ? 'approved'
                                  : moderationAction === 'reject'
                                    ? 'rejected'
                                    : moderationAction === 'delete'
                                      ? 'removed'
                                      : moderationAction === 'spam'
                                        ? 'spam'
                                        : s.moderation_status,
                          moderation_notes: moderationReason,
                          updated_at: new Date().toISOString(),
                      }
                    : s,
            ),
        );

        setShowModerationModal(false);
        setModeratingStory(null);
        setModerationAction('approve');
        setModerationReason('');
        showToast(`Story ${moderationAction}ed successfully`, 'success');
    };

    const handleDeleteStory = (storyId) => {
        if (confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
            setStories((prev) => prev.filter((s) => s.id !== storyId));
            showToast('Story deleted', 'success');
        }
    };

    const toggleStorySelection = (storyId) => {
        setSelectedStories((prev) =>
            prev.includes(storyId) ? prev.filter((id) => id !== storyId) : [...prev, storyId],
        );
    };

    const selectAllStories = () => {
        if (selectedStories.length === stories.length) {
            setSelectedStories([]);
        } else {
            setSelectedStories(stories.map((s) => s.id));
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return { color: 'green', text: 'Approved', icon: <CheckCircle size={14} /> };
            case 'pending':
                return { color: 'orange', text: 'Pending', icon: <Clock size={14} /> };
            case 'rejected':
                return { color: 'red', text: 'Rejected', icon: <XCircle size={14} /> };
            case 'spam':
                return { color: 'purple', text: 'Spam', icon: <AlertTriangle size={14} /> };
            case 'removed':
                return { color: 'gray', text: 'Removed', icon: <Trash2 size={14} /> };
            default:
                return { color: 'gray', text: status, icon: <AlertCircle size={14} /> };
        }
    };

    const getMediaTypeBadge = (mediaType) => {
        switch (mediaType) {
            case 'image':
                return { color: 'blue', text: 'Image', icon: <Image size={14} /> };
            case 'video':
                return { color: 'purple', text: 'Video', icon: <Video size={14} /> };
            case 'text':
                return { color: 'green', text: 'Text', icon: <FileText size={14} /> };
            default:
                return { color: 'gray', text: mediaType, icon: <AlertTriangle size={14} /> };
        }
    };

    const getStoryTypeBadge = (storyType) => {
        switch (storyType) {
            case 'normal':
                return { color: 'blue', text: 'Normal', icon: <Play size={14} /> };
            case 'live':
                return { color: 'red', text: 'Live', icon: <Zap size={14} /> };
            case 'poll':
                return { color: 'orange', text: 'Poll', icon: <BarChart3 size={14} /> };
            case 'question':
                return { color: 'green', text: 'Question', icon: <MessageCircle size={14} /> };
            case 'quiz':
                return { color: 'purple', text: 'Quiz', icon: <Award size={14} /> };
            default:
                return { color: 'gray', text: storyType, icon: <AlertTriangle size={14} /> };
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

    const getStoryTypeIcon = (type) => {
        switch (type) {
            case 'live':
                return <Zap size={16} className="live-icon" />;
            case 'poll':
                return <BarChart3 size={16} className="poll-icon" />;
            case 'question':
                return <MessageCircle size={16} className="question-icon" />;
            case 'quiz':
                return <Award size={16} className="quiz-icon" />;
            default:
                return <Play size={16} className="normal-icon" />;
        }
    };

    return (
        <div className="story-management-tab">
            {/* Header */}
            <div className="tab-header">
                <div className="header-left">
                    <h2>Story Management</h2>
                    <p>Manage ephemeral content with 24-hour lifecycle and advanced analytics</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary">
                        <Upload size={18} />
                        Import Stories
                    </button>
                    <button className="btn-secondary">
                        <Download size={18} />
                        Export Stories
                    </button>
                    <button className="btn-primary" onClick={() => setShowTemplatesModal(true)}>
                        <Sparkles size={18} />
                        Story Templates
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
                            placeholder="Search stories by caption or username..."
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
                            <option value="removed">Removed</option>
                        </select>

                        <select
                            value={filters.media_type}
                            onChange={(e) => handleFilterChange('media_type', e.target.value)}
                        >
                            <option value="all">All Media Types</option>
                            <option value="image">Image</option>
                            <option value="video">Video</option>
                            <option value="text">Text</option>
                        </select>

                        <select
                            value={filters.story_type}
                            onChange={(e) => handleFilterChange('story_type', e.target.value)}
                        >
                            <option value="all">All Story Types</option>
                            <option value="normal">Normal</option>
                            <option value="live">Live</option>
                            <option value="poll">Poll</option>
                            <option value="question">Question</option>
                            <option value="quiz">Quiz</option>
                        </select>

                        <select
                            value={filters.is_highlight}
                            onChange={(e) => handleFilterChange('is_highlight', e.target.value)}
                        >
                            <option value="all">All Highlights</option>
                            <option value="true">Highlights Only</option>
                            <option value="false">Regular Stories</option>
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
                        <BarChart3 size={18} />
                        User Stats
                    </button>
                    <button className="btn-secondary" onClick={() => setShowHighlightsModal(true)}>
                        <Star size={18} />
                        Highlights
                    </button>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedStories.length > 0 && (
                <div className="bulk-actions">
                    <div className="selection-info">{selectedStories.length} stories selected</div>
                    <div className="bulk-actions-controls">
                        <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
                            <option value="">Bulk Actions</option>
                            <option value="approve">Approve</option>
                            <option value="reject">Reject</option>
                            <option value="delete">Delete Stories</option>
                            <option value="mark_spam">Mark as Spam</option>
                            <option value="make_highlight">Add to Highlights</option>
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

            {/* Stories Table */}
            <div className="stories-table-container">
                {isLoading ? (
                    <div className="loading-state">
                        <RefreshCw size={32} className="spin-anim" />
                        <p>Loading stories...</p>
                    </div>
                ) : (
                    <>
                        <div className="table-header">
                            <div className="select-all">
                                <input
                                    type="checkbox"
                                    checked={
                                        selectedStories.length === stories.length &&
                                        stories.length > 0
                                    }
                                    onChange={selectAllStories}
                                />
                                <span>Select All</span>
                            </div>
                            <div className="table-actions">
                                <span className="story-count">{stories.length} stories found</span>
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
                                                    selectedStories.length === stories.length &&
                                                    stories.length > 0
                                                }
                                                onChange={selectAllStories}
                                            />
                                        </th>
                                        <th>Story Content</th>
                                        <th>Status & Type</th>
                                        <th>User & Date</th>
                                        <th>Analytics & Engagement</th>
                                        <th>Content Analysis</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stories.map((story) => (
                                        <tr
                                            key={story.id}
                                            className={
                                                story.moderation_status === 'spam'
                                                    ? 'spam-story'
                                                    : story.moderation_status === 'rejected'
                                                      ? 'rejected-story'
                                                      : ''
                                            }
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStories.includes(story.id)}
                                                    onChange={() => toggleStorySelection(story.id)}
                                                />
                                            </td>
                                            <td>
                                                <div className="story-content">
                                                    <div className="story-media-preview">
                                                        {story.media_type === 'image' ? (
                                                            <img
                                                                src={story.media_url}
                                                                alt="Story"
                                                                className="story-thumbnail"
                                                            />
                                                        ) : story.media_type === 'video' ? (
                                                            <div className="video-thumbnail">
                                                                <img
                                                                    src={story.media_url}
                                                                    alt="Story"
                                                                    className="story-thumbnail"
                                                                />
                                                                <div className="video-overlay">
                                                                    <Play size={24} />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-thumbnail">
                                                                <span>T</span>
                                                            </div>
                                                        )}
                                                        {getStoryTypeIcon(story.story_type)}
                                                    </div>
                                                    <div className="story-info">
                                                        <div className="story-caption">
                                                            <p>{story.caption}</p>
                                                            {story.is_highlight && (
                                                                <span className="highlight-badge">
                                                                    Highlight
                                                                </span>
                                                            )}
                                                            {story.is_private && (
                                                                <span className="private-badge">
                                                                    Private
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="story-meta">
                                                            <span className="story-id">
                                                                Story: {story.id}
                                                            </span>
                                                            {story.location && (
                                                                <span className="location-info">
                                                                    <MapPin size={12} />
                                                                    {story.location.label}
                                                                </span>
                                                            )}
                                                            {story.hashtags &&
                                                                story.hashtags.length > 0 && (
                                                                    <span className="hashtags-info">
                                                                        {story.hashtags
                                                                            .map((tag) => `#${tag}`)
                                                                            .join(' ')}
                                                                    </span>
                                                                )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="status-info">
                                                    <div className="status-badge">
                                                        <span
                                                            className={`status-pill ${getStatusBadge(story.moderation_status).color}`}
                                                        >
                                                            {
                                                                getStatusBadge(
                                                                    story.moderation_status,
                                                                ).icon
                                                            }
                                                            {
                                                                getStatusBadge(
                                                                    story.moderation_status,
                                                                ).text
                                                            }
                                                        </span>
                                                        <span
                                                            className={`media-type-pill ${getMediaTypeBadge(story.media_type).color}`}
                                                        >
                                                            {
                                                                getMediaTypeBadge(story.media_type)
                                                                    .icon
                                                            }
                                                            {
                                                                getMediaTypeBadge(story.media_type)
                                                                    .text
                                                            }
                                                        </span>
                                                        <span
                                                            className={`story-type-pill ${getStoryTypeBadge(story.story_type).color}`}
                                                        >
                                                            {
                                                                getStoryTypeBadge(story.story_type)
                                                                    .icon
                                                            }
                                                            {
                                                                getStoryTypeBadge(story.story_type)
                                                                    .text
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="status-dates">
                                                        <div className="status-date">
                                                            <Calendar size={12} />
                                                            <span>
                                                                Created:{' '}
                                                                {new Date(
                                                                    story.created_at,
                                                                ).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="status-date">
                                                            <Timer size={12} />
                                                            <span>
                                                                Expires:{' '}
                                                                {new Date(
                                                                    story.expires_at,
                                                                ).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        {story.is_highlight &&
                                                            story.highlight_category && (
                                                                <div className="highlight-info">
                                                                    <Star size={12} />
                                                                    <span>
                                                                        Category:{' '}
                                                                        {story.highlight_category}
                                                                    </span>
                                                                </div>
                                                            )}
                                                    </div>
                                                    {story.moderation_notes && (
                                                        <div className="moderation-notes">
                                                            <ShieldCheck size={12} />
                                                            <span>{story.moderation_notes}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="user-info">
                                                    <div className="user-details">
                                                        <div className="user-name">
                                                            <User size={14} />
                                                            <span>{story.username}</span>
                                                        </div>
                                                        <div className="user-id">
                                                            <span>ID: {story.user_id}</span>
                                                        </div>
                                                    </div>
                                                    <div className="date-info">
                                                        <div className="created-date">
                                                            <Calendar size={12} />
                                                            <span>
                                                                Created:{' '}
                                                                {new Date(
                                                                    story.created_at,
                                                                ).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="days-since">
                                                            <Clock size={12} />
                                                            <span>
                                                                {getDaysSinceCreated(
                                                                    story.created_at,
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
                                                <div className="analytics-info">
                                                    <div className="analytics-metrics">
                                                        <div className="metric-item">
                                                            <Eye size={14} />
                                                            <span className="metric-value">
                                                                {story.view_count}
                                                            </span>
                                                            <small>Views</small>
                                                        </div>
                                                        <div className="metric-item">
                                                            <MessageCircle size={14} />
                                                            <span className="metric-value">
                                                                {story.reply_count}
                                                            </span>
                                                            <small>Replies</small>
                                                        </div>
                                                        <div className="metric-item">
                                                            <TrendingUp size={14} />
                                                            <span className="metric-value">
                                                                {story.engagement_score.toFixed(2)}
                                                            </span>
                                                            <small>Engagement</small>
                                                        </div>
                                                        <div className="metric-item">
                                                            <Users size={14} />
                                                            <span className="metric-value">
                                                                {story.views.length}
                                                            </span>
                                                            <small>Unique Viewers</small>
                                                        </div>
                                                    </div>
                                                    <div className="analytics-actions">
                                                        <div className="completion-rate">
                                                            <span className="completion-label">
                                                                Completion:
                                                            </span>
                                                            <span className="completion-value">
                                                                {(
                                                                    story.engagement_score * 100
                                                                ).toFixed(0)}
                                                                %
                                                            </span>
                                                        </div>
                                                        <div className="view-duration">
                                                            <span className="duration-label">
                                                                Avg Duration:
                                                            </span>
                                                            <span className="duration-value">
                                                                {story.views.length > 0
                                                                    ? Math.round(
                                                                          story.views.reduce(
                                                                              (acc, v) =>
                                                                                  acc +
                                                                                  (v.view_duration ||
                                                                                      0),
                                                                              0,
                                                                          ) / story.views.length,
                                                                      )
                                                                    : 0}
                                                                s
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="analysis-info">
                                                    <div className="analysis-metrics">
                                                        <div className="metric-item">
                                                            <AlertTriangle size={14} />
                                                            <span
                                                                className={`spam-score ${getSpamLevel(story.spam_score || 0).color}`}
                                                            >
                                                                {formatSpamScore(
                                                                    story.spam_score || 0,
                                                                )}
                                                            </span>
                                                            <small>Spam Score</small>
                                                        </div>
                                                        <div className="metric-item">
                                                            <TrendingUp size={14} />
                                                            <span
                                                                className={`sentiment-score ${getSentimentLevel(story.sentiment_score || 0).color}`}
                                                            >
                                                                {story.sentiment_score > 0
                                                                    ? '+'
                                                                    : ''}
                                                                {(
                                                                    story.sentiment_score || 0
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
                                                                    story.spam_score || 0,
                                                                    story.reported_count,
                                                                ),
                                                            }}
                                                        >
                                                            Priority:{' '}
                                                            {getPriorityColor(
                                                                story.spam_score || 0,
                                                                story.reported_count,
                                                            ) === 'red'
                                                                ? 'High'
                                                                : getPriorityColor(
                                                                        story.spam_score || 0,
                                                                        story.reported_count,
                                                                    ) === 'orange'
                                                                  ? 'Medium'
                                                                  : 'Low'}
                                                        </div>
                                                        <div className="reports-count">
                                                            <AlertCircle size={12} />
                                                            <span>
                                                                {story.reported_count} reports
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="action-btn view"
                                                        onClick={() =>
                                                            window.open(
                                                                `/story/${story.id}`,
                                                                '_blank',
                                                            )
                                                        }
                                                        title="View Story"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        className="action-btn moderate"
                                                        onClick={() => handleModerateStory(story)}
                                                        title="Moderate Story"
                                                    >
                                                        <ShieldCheck size={16} />
                                                    </button>
                                                    {story.moderation_status === 'pending' && (
                                                        <>
                                                            <button
                                                                className="action-btn approve"
                                                                onClick={() => {
                                                                    setModeratingStory(story);
                                                                    setModerationAction('approve');
                                                                    setModerationReason(
                                                                        'Content is appropriate',
                                                                    );
                                                                    confirmModeration();
                                                                }}
                                                                title="Approve Story"
                                                            >
                                                                <CheckCircle size={16} />
                                                            </button>
                                                            <button
                                                                className="action-btn reject"
                                                                onClick={() => {
                                                                    setModeratingStory(story);
                                                                    setModerationAction('reject');
                                                                    setModerationReason(
                                                                        'Inappropriate content',
                                                                    );
                                                                    confirmModeration();
                                                                }}
                                                                title="Reject Story"
                                                            >
                                                                <XCircle size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={() => handleDeleteStory(story.id)}
                                                        title="Delete Story"
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
            {showModerationModal && moderatingStory && (
                <div className="modal-overlay" onClick={() => setShowModerationModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '600px' }}
                    >
                        <div className="modal-header">
                            <h3>Moderate Story</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowModerationModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="moderation-story-preview">
                                <div className="story-preview-header">
                                    <strong>{moderatingStory.username}</strong>
                                    <span className="story-date">
                                        {new Date(moderatingStory.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="story-preview-content">
                                    <div className="story-media">
                                        {moderatingStory.media_type === 'image' ? (
                                            <img src={moderatingStory.media_url} alt="Story" />
                                        ) : (
                                            <video src={moderatingStory.media_url} controls />
                                        )}
                                    </div>
                                    <div className="story-caption">{moderatingStory.caption}</div>
                                    {moderatingStory.story_type !== 'normal' && (
                                        <div className="story-type-info">
                                            <span className="story-type-badge">
                                                {moderatingStory.story_type}
                                            </span>
                                            {moderatingStory.story_data && (
                                                <div className="story-data">
                                                    {JSON.stringify(
                                                        moderatingStory.story_data,
                                                        null,
                                                        2,
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="story-preview-meta">
                                    <span className="spam-score-preview">
                                        Spam Score:{' '}
                                        {formatSpamScore(moderatingStory.spam_score || 0)}
                                    </span>
                                    <span className="reports-count-preview">
                                        Reports: {moderatingStory.reported_count}
                                    </span>
                                    <span className="views-count-preview">
                                        Views: {moderatingStory.view_count}
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
                                                Rejecting this story will mark it as inappropriate
                                            </span>
                                        </div>
                                    )}
                                    {moderationAction === 'delete' && (
                                        <div className="warning-box">
                                            <XCircle size={16} />
                                            <span>
                                                Deleting this story is permanent and cannot be
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
                            <h3>User Story Statistics</h3>
                            <button className="close-btn" onClick={() => setShowStatsModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="stats-grid">
                                {mockUserStats.map((stats) => (
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
                                                    <Video size={20} />
                                                    <div>
                                                        <strong>{stats.total_stories}</strong>
                                                        <span>Total Stories</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <Play size={20} />
                                                    <div>
                                                        <strong>{stats.active_stories}</strong>
                                                        <span>Active</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <Clock size={20} />
                                                    <div>
                                                        <strong>{stats.expired_stories}</strong>
                                                        <span>Expired</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <Star size={20} />
                                                    <div>
                                                        <strong>{stats.highlights}</strong>
                                                        <span>Highlights</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="metric-row">
                                                <div className="metric-item">
                                                    <Eye size={20} />
                                                    <div>
                                                        <strong>{stats.total_views}</strong>
                                                        <span>Total Views</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <MessageCircle size={20} />
                                                    <div>
                                                        <strong>{stats.total_replies}</strong>
                                                        <span>Replies</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <TrendingUp size={20} />
                                                    <div>
                                                        <strong>
                                                            {stats.avg_completion_rate.toFixed(2)}
                                                        </strong>
                                                        <span>Completion Rate</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <Users size={20} />
                                                    <div>
                                                        <strong>
                                                            {stats.avg_engagement_rate.toFixed(2)}%
                                                        </strong>
                                                        <span>Engagement Rate</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="metric-row">
                                                <div className="metric-item">
                                                    <Clock size={20} />
                                                    <div>
                                                        <strong>
                                                            {stats.avg_view_duration.toFixed(1)}s
                                                        </strong>
                                                        <span>Avg Duration</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <Crown size={20} />
                                                    <div>
                                                        <strong>
                                                            {stats.avg_engagement_rate > 0.8
                                                                ? 'Top Creator'
                                                                : stats.avg_engagement_rate > 0.5
                                                                  ? 'Active'
                                                                  : 'New'}
                                                        </strong>
                                                        <span>Creator Level</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="stat-footer">
                                            <span className="last-activity">
                                                Last Story:{' '}
                                                {stats.last_story_at
                                                    ? new Date(stats.last_story_at).toLocaleString()
                                                    : 'Never'}
                                            </span>
                                            <div className="user-reputation">
                                                <span className="reputation-label">
                                                    Reputation:
                                                </span>
                                                <span
                                                    className={`reputation-score ${stats.avg_engagement_rate > 0.7 ? 'excellent' : stats.avg_engagement_rate > 0.5 ? 'good' : 'poor'}`}
                                                >
                                                    {stats.avg_engagement_rate > 0.7
                                                        ? 'Excellent'
                                                        : stats.avg_engagement_rate > 0.5
                                                          ? 'Good'
                                                          : 'Poor'}
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

            {/* Highlights Modal */}
            {showHighlightsModal && (
                <div className="modal-overlay" onClick={() => setShowHighlightsModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '800px' }}
                    >
                        <div className="modal-header">
                            <h3>Story Highlights</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowHighlightsModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="highlights-list">
                                {mockHighlights.map((highlight) => (
                                    <div key={highlight.id} className="highlight-item">
                                        <div className="highlight-header">
                                            <div className="highlight-info">
                                                <strong>{highlight.title}</strong>
                                                <span className="highlight-owner">
                                                    by {highlight.username}
                                                </span>
                                            </div>
                                            <div className="highlight-actions">
                                                <button className="highlight-action-btn">
                                                    Edit
                                                </button>
                                                <button className="highlight-action-btn">
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                        <div className="highlight-cover">
                                            <img
                                                src={highlight.cover_image}
                                                alt="Highlight Cover"
                                            />
                                        </div>
                                        <div className="highlight-stories">
                                            <span className="stories-count">
                                                {highlight.stories.length} stories
                                            </span>
                                            <div className="story-previews">
                                                {highlight.stories.map((storyId, idx) => (
                                                    <div key={idx} className="story-preview">
                                                        <img
                                                            src={
                                                                mockStories.find(
                                                                    (s) => s.id === storyId,
                                                                )?.media_url
                                                            }
                                                            alt="Story"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="highlight-meta">
                                            <span className="highlight-created">
                                                Created:{' '}
                                                {new Date(highlight.created_at).toLocaleString()}
                                            </span>
                                            <span className="highlight-updated">
                                                Updated:{' '}
                                                {new Date(highlight.updated_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Templates Modal */}
            {showTemplatesModal && (
                <div className="modal-overlay" onClick={() => setShowTemplatesModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '1000px' }}
                    >
                        <div className="modal-header">
                            <h3>Story Templates</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowTemplatesModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="templates-list">
                                {mockTemplates.map((template) => (
                                    <div key={template.id} className="template-item">
                                        <div className="template-header">
                                            <div className="template-info">
                                                <strong>{template.name}</strong>
                                                <span className="template-description">
                                                    {template.description}
                                                </span>
                                            </div>
                                            <div className="template-actions">
                                                <button className="template-action-btn">
                                                    Use Template
                                                </button>
                                                <button className="template-action-btn">
                                                    Edit
                                                </button>
                                                <button className="template-action-btn">
                                                    Delete
                                                </button>
                                            </div>
                                        </div>

                                        <div className="template-preview">
                                            <div className="template-design">
                                                <div
                                                    className="template-bg"
                                                    style={{
                                                        backgroundColor: template.background_color,
                                                    }}
                                                >
                                                    <span
                                                        className="template-text"
                                                        style={{
                                                            color: template.text_color,
                                                            fontFamily: template.font_style,
                                                        }}
                                                    >
                                                        {template.name}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="template-details">
                                            <div className="detail-row">
                                                <span className="detail-label">Font:</span>
                                                <span className="detail-value">
                                                    {template.font_style}
                                                </span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Colors:</span>
                                                <span className="detail-value">
                                                    Background: {template.background_color}, Text:{' '}
                                                    {template.text_color}
                                                </span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Stickers:</span>
                                                <span className="detail-value">
                                                    {template.stickers.join(', ')}
                                                </span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Usage:</span>
                                                <span className="detail-value">
                                                    {template.usage_count} times
                                                </span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Visibility:</span>
                                                <span
                                                    className={`detail-value ${template.is_public ? 'public' : 'private'}`}
                                                >
                                                    {template.is_public ? 'Public' : 'Private'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="template-meta">
                                            <span className="template-created">
                                                Created:{' '}
                                                {new Date(template.created_at).toLocaleString()}
                                            </span>
                                            <span className="template-updated">
                                                Updated:{' '}
                                                {new Date(template.updated_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="add-template-form">
                                <h4>Create New Template</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Template Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g., Study Motivation"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Background Color</label>
                                        <input type="color" className="form-input" />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Font Style</label>
                                        <select className="form-input">
                                            <option value="Arial">Arial</option>
                                            <option value="Helvetica">Helvetica</option>
                                            <option value="Times New Roman">Times New Roman</option>
                                            <option value="Courier New">Courier New</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Text Color</label>
                                        <input type="color" className="form-input" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        className="form-input"
                                        rows="2"
                                        placeholder="Describe this template"
                                    ></textarea>
                                </div>
                                <div className="form-actions">
                                    <button className="btn-secondary">Cancel</button>
                                    <button className="btn-primary">Create Template</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StoryManagementTab;
