import React, { useState, useEffect } from 'react';
import api from '../api/client';

import {
    Video,
    Image,
    Clock,
    Calendar,
    Eye,
    EyeOff,
    Trash2,
    ShieldCheck,
    XCircle,
    AlertTriangle,
    User,
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
    ThumbsUp as ThumbsUp,
    AlertCircle,
    Zap,
    Globe,
    Repeat,
    FileCheck,
    FileClock,
    FileSearch,
    Play,
    Pause,
    RotateCcw,
    Share2,
    Heart,
    MessageSquare,
    Share,
    Star,
    Crown,
    Sparkles,
    Timer,
    MapPin,
    Hash,
    AtSign,
    Smartphone,
    Tablet,
    Laptop,
    Award,
    Trophy,
    Rocket,
    Flame,
    Sparkle,
    Gift,
    Film,
    Clapperboard,
    Scissors,
    Settings,
    Database,
    Cpu,
    Wifi,
    WifiOff,
    FileMinus,
    FilePlus,
    FileStack,
    FileWarning,
    FileX,
    FileSymlink,
    HardDrive,
    Cloud,
    Server,
    Battery,
    BatteryCharging,
    BatteryFull,
    BatteryLow,
    BatteryMedium,
    BatteryWarning,
    Network,
    Zap as ZapIcon,
    Music,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const ReelManagementTab = () => {
    const [reels, setReels] = useState([]);
    const [filters, setFilters] = useState({
        status: 'all',
        user_id: '',
        resolution: 'all',
        duration_min: '',
        duration_max: '',
        size_min: '',
        size_max: '',
        duet_enabled: 'all',
        stitch_enabled: 'all',
        comments_enabled: 'all',
        spam_score_min: '',
        spam_score_max: '',
        reported_count_min: '',
        trending_score_min: '',
        transcoding_status: 'all',
        date_from: '',
        date_to: '',
        sort_by: 'created_at',
        sort_order: 'desc',
    });

    const [selectedReels, setSelectedReels] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [showModerationModal, setShowModerationModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showTranscodingModal, setShowTranscodingModal] = useState(false);
    const [showTrendingModal, setShowTrendingModal] = useState(false);
    const [moderatingReel, setModeratingReel] = useState(null);
    const [moderationAction, setModerationAction] = useState('approve');
    const [moderationReason, setModerationReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const { showToast } = useToast();

    // Mock user stats
    const mockUserStats = [
        {
            user_id: 'user_001',
            username: 'VideoCreator',
            total_reels: 15,
            active_reels: 12,
            deleted_reels: 3,
            total_views: 75000,
            total_likes: 18000,
            total_comments: 1200,
            total_shares: 3500,
            total_duets: 85,
            total_stitches: 42,
            total_saves: 5000,
            avg_completion_rate: 0.85,
            avg_engagement_rate: 0.24,
            avg_trending_score: 0.65,
            avg_virality_score: 0.55,
            avg_view_duration: 45.2,
            top_reel_id: 'reel_001',
            follower_growth: 1500,
            last_reel_at: '2024-01-20T10:00:00Z',
        },
        {
            user_id: 'user_002',
            username: 'VideoSpammer',
            total_reels: 8,
            active_reels: 1,
            deleted_reels: 7,
            total_views: 125,
            total_likes: 0,
            total_comments: 0,
            total_shares: 0,
            total_duets: 0,
            total_stitches: 0,
            total_saves: 0,
            avg_completion_rate: 0.15,
            avg_engagement_rate: 0.02,
            avg_trending_score: 0.05,
            avg_virality_score: 0.02,
            avg_view_duration: 5.2,
            top_reel_id: null,
            follower_growth: -50,
            last_reel_at: '2024-01-16T14:30:00Z',
        },
        {
            user_id: 'user_003',
            username: 'MusicCreator',
            total_reels: 25,
            active_reels: 22,
            deleted_reels: 3,
            total_views: 250000,
            total_likes: 60000,
            total_comments: 4500,
            total_shares: 15000,
            total_duets: 200,
            total_stitches: 120,
            total_saves: 25000,
            avg_completion_rate: 0.92,
            avg_engagement_rate: 0.28,
            avg_trending_score: 0.78,
            avg_virality_score: 0.65,
            avg_view_duration: 52.8,
            top_reel_id: 'reel_003',
            follower_growth: 5000,
            last_reel_at: '2024-01-17T09:15:00Z',
        },
    ];

    // Mock transcoding jobs
    const mockTranscodingJobs = [
        {
            id: 'job_001',
            reel_id: 'reel_001',
            original_video_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
            target_qualities: ['360p', '480p', '720p', '1080p'],
            current_quality: '1080p',
            progress: 1.0,
            status: 'completed',
            started_at: '2024-01-15T09:55:00Z',
            completed_at: '2024-01-15T10:00:00Z',
            error_message: null,
            worker_id: 'worker_001',
        },
        {
            id: 'job_002',
            reel_id: 'reel_002',
            original_video_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
            target_qualities: ['360p', '480p', '720p'],
            current_quality: null,
            progress: 0.0,
            status: 'failed',
            started_at: '2024-01-16T14:25:00Z',
            completed_at: null,
            error_message: 'Video format not supported',
            worker_id: 'worker_002',
        },
        {
            id: 'job_003',
            reel_id: 'reel_003',
            original_video_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4',
            target_qualities: ['360p', '480p', '720p', '1080p', '4K'],
            current_quality: '4K',
            progress: 1.0,
            status: 'completed',
            started_at: '2024-01-17T09:10:00Z',
            completed_at: '2024-01-17T09:15:00Z',
            error_message: null,
            worker_id: 'worker_003',
        },
        {
            id: 'job_004',
            reel_id: 'reel_004',
            original_video_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_3mb.mp4',
            target_qualities: ['360p', '480p', '720p'],
            current_quality: '480p',
            progress: 0.6,
            status: 'processing',
            started_at: '2024-01-18T10:00:00Z',
            completed_at: null,
            error_message: null,
            worker_id: 'worker_004',
        },
    ];

    // Mock trending reels
    const mockTrendingReels = [
        {
            reel_id: 'reel_003',
            trending_score: 0.88,
            virality_score: 0.75,
            category: 'music',
            region: 'Kenya',
            trending_at: '2024-01-17T12:00:00Z',
            peak_trending_at: '2024-01-17T18:00:00Z',
            trending_duration: 48,
        },
        {
            reel_id: 'reel_001',
            trending_score: 0.75,
            virality_score: 0.65,
            category: 'dance',
            region: 'Kenya',
            trending_at: '2024-01-15T15:00:00Z',
            peak_trending_at: '2024-01-15T20:00:00Z',
            trending_duration: 24,
        },
        {
            reel_id: 'reel_005',
            trending_score: 0.65,
            virality_score: 0.55,
            category: 'comedy',
            region: 'Kenya',
            trending_at: '2024-01-18T09:00:00Z',
            peak_trending_at: '2024-01-18T14:00:00Z',
            trending_duration: 12,
        },
    ];

    useEffect(() => {
        setIsLoading(true);
        // Fetch real data from API
        Promise.all([
            api.get('/reels'),
            api.get('/reel/user/stats'),
            api.get('/reel/transcoding-jobs'),
            api.get('/reel/trending'),
        ])
            .then(([reelsRes, statsRes, jobsRes, trendingRes]) => {
                setReels(reelsRes.data);
                setUserStats(statsRes.data);
                setTranscodingJobs(jobsRes.data);
                setTrendingReels(trendingRes.data);
            })
            .catch((error) => {
                console.error('Failed to load reel management data:', error);
                // Set appropriate empty states
                setReels([]);
                setUserStats([]);
                setTranscodingJobs([]);
                setTrendingReels([]);
            })
            .finally(() => setIsLoading(false));
    }, [filters]);

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleBulkAction = () => {
        if (selectedReels.length === 0) {
            showToast('Please select reels first', 'warning');
            return;
        }

        if (bulkAction === 'approve') {
            setReels((prev) =>
                prev.map((r) =>
                    selectedReels.includes(r.id) ? { ...r, moderation_status: 'approved' } : r,
                ),
            );
            setSelectedReels([]);
            setBulkAction('');
            showToast('Reels approved', 'success');
        } else if (bulkAction === 'reject') {
            setReels((prev) =>
                prev.map((r) =>
                    selectedReels.includes(r.id) ? { ...r, moderation_status: 'rejected' } : r,
                ),
            );
            setSelectedReels([]);
            setBulkAction('');
            showToast('Reels rejected', 'info');
        } else if (bulkAction === 'delete') {
            if (confirm(`Delete ${selectedReels.length} reels? This action cannot be undone.`)) {
                setReels((prev) => prev.filter((r) => !selectedReels.includes(r.id)));
                setSelectedReels([]);
                setBulkAction('');
                showToast('Reels deleted', 'success');
            }
        } else if (bulkAction === 'mark_spam') {
            setReels((prev) =>
                prev.map((r) =>
                    selectedReels.includes(r.id) ? { ...r, moderation_status: 'spam' } : r,
                ),
            );
            setSelectedReels([]);
            setBulkAction('');
            showToast('Reels marked as spam', 'info');
        } else if (bulkAction === 'enable_duet') {
            setReels((prev) =>
                prev.map((r) => (selectedReels.includes(r.id) ? { ...r, duet_enabled: true } : r)),
            );
            setSelectedReels([]);
            setBulkAction('');
            showToast('Duet enabled for selected reels', 'success');
        } else if (bulkAction === 'disable_comments') {
            setReels((prev) =>
                prev.map((r) =>
                    selectedReels.includes(r.id) ? { ...r, comments_enabled: false } : r,
                ),
            );
            setSelectedReels([]);
            setBulkAction('');
            showToast('Comments disabled for selected reels', 'info');
        }
    };

    const handleModerateReel = (reel) => {
        setModeratingReel(reel);
        setShowModerationModal(true);
    };

    const confirmModeration = () => {
        if (!moderatingReel || !moderationAction) return;

        setReels((prev) =>
            prev.map((r) =>
                r.id === moderatingReel.id
                    ? {
                          ...r,
                          moderation_status:
                              moderationAction === 'approve'
                                  ? 'approved'
                                  : moderationAction === 'reject'
                                    ? 'rejected'
                                    : moderationAction === 'delete'
                                      ? 'removed'
                                      : moderationAction === 'spam'
                                        ? 'spam'
                                        : r.moderation_status,
                          moderation_notes: moderationReason,
                          updated_at: new Date().toISOString(),
                      }
                    : r,
            ),
        );

        setShowModerationModal(false);
        setModeratingReel(null);
        setModerationAction('approve');
        setModerationReason('');
        showToast(`Reel ${moderationAction}ed successfully`, 'success');
    };

    const handleDeleteReel = (reelId) => {
        if (confirm('Are you sure you want to delete this reel? This action cannot be undone.')) {
            setReels((prev) => prev.filter((r) => r.id !== reelId));
            showToast('Reel deleted', 'success');
        }
    };

    const toggleReelSelection = (reelId) => {
        setSelectedReels((prev) =>
            prev.includes(reelId) ? prev.filter((id) => id !== reelId) : [...prev, reelId],
        );
    };

    const selectAllReels = () => {
        if (selectedReels.length === reels.length) {
            setSelectedReels([]);
        } else {
            setSelectedReels(reels.map((r) => r.id));
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
            case 'removed':
                return { color: 'gray', text: 'Removed', icon: <Trash2 size={14} /> };
            default:
                return { color: 'gray', text: status, icon: <AlertCircle size={14} /> };
        }
    };

    const getTranscodingStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return { color: 'green', text: 'Completed', icon: <CheckCircle size={14} /> };
            case 'processing':
                return { color: 'blue', text: 'Processing', icon: <RefreshCw size={14} /> };
            case 'pending':
                return { color: 'orange', text: 'Pending', icon: <FileClock size={14} /> };
            case 'failed':
                return { color: 'red', text: 'Failed', icon: <XCircle size={14} /> };
            default:
                return { color: 'gray', text: status, icon: <AlertCircle size={14} /> };
        }
    };

    const getResolutionBadge = (resolution) => {
        switch (resolution) {
            case '4K':
                return { color: 'purple', text: '4K', icon: <Video size={14} /> };
            case '1080p':
                return { color: 'blue', text: '1080p', icon: <Video size={14} /> };
            case '720p':
                return { color: 'green', text: '720p', icon: <Video size={14} /> };
            case '480p':
                return { color: 'yellow', text: '480p', icon: <Video size={14} /> };
            case '360p':
                return { color: 'orange', text: '360p', icon: <Video size={14} /> };
            default:
                return { color: 'gray', text: resolution, icon: <AlertTriangle size={14} /> };
        }
    };

    const getSpamLevel = (score) => {
        if (score >= 0.8) return { level: 'High', color: 'red' };
        if (score >= 0.5) return { level: 'Medium', color: 'orange' };
        if (score >= 0.2) return { level: 'Low', color: 'yellow' };
        return { level: 'None', color: 'green' };
    };

    const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getPriorityColor = (spamScore, reportedCount, transcodingStatus) => {
        if (spamScore >= 0.8 || reportedCount >= 5 || transcodingStatus === 'failed') return 'red';
        if (spamScore >= 0.5 || reportedCount >= 2 || transcodingStatus === 'processing')
            return 'orange';
        return 'green';
    };

    const getReelTypeIcon = (hasMusic, hasEffects, hasFilters) => {
        if (hasMusic) return <Music size={16} className="music-icon" />;
        if (hasEffects) return <Scissors size={16} className="effects-icon" />;
        if (hasFilters) return <Settings size={16} className="filters-icon" />;
        return <Film size={16} className="normal-icon" />;
    };

    const formatSpamScore = (score) => {
        const level = getSpamLevel(score);
        return `${score.toFixed(2)} (${level.level})`;
    };

    const getSentimentLevel = (score) => {
        if (score >= 0.5) return { level: 'Positive', color: 'green' };
        if (score >= -0.5) return { level: 'Neutral', color: 'yellow' };
        return { level: 'Negative', color: 'red' };
    };

    return (
        <div className="reel-management-tab">
            {/* Header */}
            <div className="tab-header">
                <div className="header-left">
                    <h2>Reel Management</h2>
                    <p>
                        Manage video content with advanced transcoding, social features, and
                        engagement tracking
                    </p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary">
                        <Upload size={18} />
                        Import Reels
                    </button>
                    <button className="btn-secondary">
                        <Download size={18} />
                        Export Reels
                    </button>
                    <button className="btn-primary" onClick={() => setShowTranscodingModal(true)}>
                        <Cpu size={18} />
                        Transcoding Jobs
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
                            placeholder="Search reels by title, description, or username..."
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
                            value={filters.resolution}
                            onChange={(e) => handleFilterChange('resolution', e.target.value)}
                        >
                            <option value="all">All Resolutions</option>
                            <option value="4K">4K</option>
                            <option value="1080p">1080p</option>
                            <option value="720p">720p</option>
                            <option value="480p">480p</option>
                            <option value="360p">360p</option>
                        </select>

                        <select
                            value={filters.transcoding_status}
                            onChange={(e) =>
                                handleFilterChange('transcoding_status', e.target.value)
                            }
                        >
                            <option value="all">All Transcoding</option>
                            <option value="completed">Completed</option>
                            <option value="processing">Processing</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                        </select>

                        <input
                            type="number"
                            placeholder="Min duration (sec)"
                            value={filters.duration_min}
                            onChange={(e) => handleFilterChange('duration_min', e.target.value)}
                        />

                        <input
                            type="number"
                            placeholder="Max duration (sec)"
                            value={filters.duration_max}
                            onChange={(e) => handleFilterChange('duration_max', e.target.value)}
                        />

                        <input
                            type="number"
                            placeholder="Min spam score"
                            value={filters.spam_score_min}
                            onChange={(e) => handleFilterChange('spam_score_min', e.target.value)}
                        />

                        <input
                            type="number"
                            placeholder="Min trending score"
                            value={filters.trending_score_min}
                            onChange={(e) =>
                                handleFilterChange('trending_score_min', e.target.value)
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
                    <button className="btn-secondary" onClick={() => setShowTrendingModal(true)}>
                        <TrendingUp size={18} />
                        Trending Reels
                    </button>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedReels.length > 0 && (
                <div className="bulk-actions">
                    <div className="selection-info">{selectedReels.length} reels selected</div>
                    <div className="bulk-actions-controls">
                        <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
                            <option value="">Bulk Actions</option>
                            <option value="approve">Approve</option>
                            <option value="reject">Reject</option>
                            <option value="delete">Delete Reels</option>
                            <option value="mark_spam">Mark as Spam</option>
                            <option value="enable_duet">Enable Duet</option>
                            <option value="disable_comments">Disable Comments</option>
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

            {/* Reels Table */}
            <div className="reels-table-container">
                {isLoading ? (
                    <div className="loading-state">
                        <RefreshCw size={32} className="spin-anim" />
                        <p>Loading reels...</p>
                    </div>
                ) : (
                    <>
                        <div className="table-header">
                            <div className="select-all">
                                <input
                                    type="checkbox"
                                    checked={
                                        selectedReels.length === reels.length && reels.length > 0
                                    }
                                    onChange={selectAllReels}
                                />
                                <span>Select All</span>
                            </div>
                            <div className="table-actions">
                                <span className="reel-count">{reels.length} reels found</span>
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
                                                    selectedReels.length === reels.length &&
                                                    reels.length > 0
                                                }
                                                onChange={selectAllReels}
                                            />
                                        </th>
                                        <th>Reel Content</th>
                                        <th>Status & Quality</th>
                                        <th>User & Date</th>
                                        <th>Engagement & Analytics</th>
                                        <th>Content Analysis</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reels.map((reel) => (
                                        <tr
                                            key={reel.id}
                                            className={
                                                reel.moderation_status === 'spam'
                                                    ? 'spam-reel'
                                                    : reel.moderation_status === 'rejected'
                                                      ? 'rejected-reel'
                                                      : ''
                                            }
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedReels.includes(reel.id)}
                                                    onChange={() => toggleReelSelection(reel.id)}
                                                />
                                            </td>
                                            <td>
                                                <div className="reel-content">
                                                    <div className="reel-media-preview">
                                                        <img
                                                            src={reel.thumbnail_url}
                                                            alt="Reel Thumbnail"
                                                            className="reel-thumbnail"
                                                        />
                                                        <div className="video-overlay">
                                                            <Play size={24} />
                                                        </div>
                                                        <div className="duration-overlay">
                                                            {formatDuration(reel.duration)}
                                                        </div>
                                                        {getReelTypeIcon(
                                                            !!reel.music_track,
                                                            !!reel.effects,
                                                            !!reel.filters,
                                                        )}
                                                    </div>
                                                    <div className="reel-info">
                                                        <div className="reel-title">
                                                            <strong>
                                                                {reel.title || 'Untitled Reel'}
                                                            </strong>
                                                            {reel.is_private && (
                                                                <span className="private-badge">
                                                                    Private
                                                                </span>
                                                            )}
                                                            {reel.age_restriction !== 'none' && (
                                                                <span className="age-restriction-badge">
                                                                    {reel.age_restriction}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="reel-description">
                                                            <p>{reel.description}</p>
                                                        </div>
                                                        <div className="reel-meta">
                                                            <span className="reel-id">
                                                                Reel: {reel.id}
                                                            </span>
                                                            {reel.location && (
                                                                <span className="location-info">
                                                                    <MapPin size={12} />
                                                                    {reel.location.label}
                                                                </span>
                                                            )}
                                                            {reel.hashtags &&
                                                                reel.hashtags.length > 0 && (
                                                                    <span className="hashtags-info">
                                                                        {reel.hashtags
                                                                            .map((tag) => `#${tag}`)
                                                                            .join(' ')}
                                                                    </span>
                                                                )}
                                                            {reel.music_track && (
                                                                <span className="music-info">
                                                                    <Music size={12} />
                                                                    {reel.music_track}
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
                                                            className={`status-pill ${getStatusBadge(reel.moderation_status).color}`}
                                                        >
                                                            {
                                                                getStatusBadge(
                                                                    reel.moderation_status,
                                                                ).icon
                                                            }
                                                            {
                                                                getStatusBadge(
                                                                    reel.moderation_status,
                                                                ).text
                                                            }
                                                        </span>
                                                        <span
                                                            className={`transcoding-pill ${getTranscodingStatusBadge(reel.transcoding_status).color}`}
                                                        >
                                                            {
                                                                getTranscodingStatusBadge(
                                                                    reel.transcoding_status,
                                                                ).icon
                                                            }
                                                            {
                                                                getTranscodingStatusBadge(
                                                                    reel.transcoding_status,
                                                                ).text
                                                            }
                                                        </span>
                                                        <span
                                                            className={`resolution-pill ${getResolutionBadge(reel.resolution).color}`}
                                                        >
                                                            {
                                                                getResolutionBadge(reel.resolution)
                                                                    .icon
                                                            }
                                                            {
                                                                getResolutionBadge(reel.resolution)
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
                                                                    reel.created_at,
                                                                ).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="status-date">
                                                            <Timer size={12} />
                                                            <span>
                                                                Duration:{' '}
                                                                {formatDuration(reel.duration)}
                                                            </span>
                                                        </div>
                                                        <div className="status-date">
                                                            <Database size={12} />
                                                            <span>
                                                                Size:{' '}
                                                                {formatFileSize(reel.video_size)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="feature-flags">
                                                        <span
                                                            className={`feature-flag ${reel.duet_enabled ? 'enabled' : 'disabled'}`}
                                                        >
                                                            Duet: {reel.duet_enabled ? 'Yes' : 'No'}
                                                        </span>
                                                        <span
                                                            className={`feature-flag ${reel.stitch_enabled ? 'enabled' : 'disabled'}`}
                                                        >
                                                            Stitch:{' '}
                                                            {reel.stitch_enabled ? 'Yes' : 'No'}
                                                        </span>
                                                        <span
                                                            className={`feature-flag ${reel.comments_enabled ? 'enabled' : 'disabled'}`}
                                                        >
                                                            Comments:{' '}
                                                            {reel.comments_enabled ? 'Yes' : 'No'}
                                                        </span>
                                                    </div>
                                                    {reel.moderation_notes && (
                                                        <div className="moderation-notes">
                                                            <ShieldCheck size={12} />
                                                            <span>{reel.moderation_notes}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="user-info">
                                                    <div className="user-details">
                                                        <div className="user-name">
                                                            <User size={14} />
                                                            <span>{reel.username}</span>
                                                        </div>
                                                        <div className="user-id">
                                                            <span>ID: {reel.user_id}</span>
                                                        </div>
                                                    </div>
                                                    <div className="date-info">
                                                        <div className="created-date">
                                                            <Calendar size={12} />
                                                            <span>
                                                                Created:{' '}
                                                                {new Date(
                                                                    reel.created_at,
                                                                ).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="published-date">
                                                            <Clock size={12} />
                                                            <span>
                                                                Published:{' '}
                                                                {reel.published_at
                                                                    ? new Date(
                                                                          reel.published_at,
                                                                      ).toLocaleDateString()
                                                                    : 'Not published'}
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
                                                                {reel.view_count.toLocaleString()}
                                                            </span>
                                                            <small>Views</small>
                                                        </div>
                                                        <div className="metric-item">
                                                            <ThumbsUp size={14} />
                                                            <span className="metric-value">
                                                                {reel.like_count.toLocaleString()}
                                                            </span>
                                                            <small>Likes</small>
                                                        </div>
                                                        <div className="metric-item">
                                                            <MessageCircle size={14} />
                                                            <span className="metric-value">
                                                                {reel.comment_count}
                                                            </span>
                                                            <small>Comments</small>
                                                        </div>
                                                        <div className="metric-item">
                                                            <Share2 size={14} />
                                                            <span className="metric-value">
                                                                {reel.share_count}
                                                            </span>
                                                            <small>Shares</small>
                                                        </div>
                                                    </div>
                                                    <div className="analytics-metrics">
                                                        <div className="metric-item">
                                                            <Video size={14} />
                                                            <span className="metric-value">
                                                                {reel.duet_count}
                                                            </span>
                                                            <small>Duets</small>
                                                        </div>
                                                        <div className="metric-item">
                                                            <Scissors size={14} />
                                                            <span className="metric-value">
                                                                {reel.stitch_count}
                                                            </span>
                                                            <small>Stitches</small>
                                                        </div>
                                                        <div className="metric-item">
                                                            <Download size={14} />
                                                            <span className="metric-value">
                                                                {reel.save_count}
                                                            </span>
                                                            <small>Saves</small>
                                                        </div>
                                                        <div className="metric-item">
                                                            <TrendingUp size={14} />
                                                            <span className="metric-value">
                                                                {reel.engagement_score.toFixed(2)}
                                                            </span>
                                                            <small>Engagement</small>
                                                        </div>
                                                    </div>
                                                    <div className="analytics-actions">
                                                        <div className="trending-score">
                                                            <span className="trending-label">
                                                                Trending:
                                                            </span>
                                                            <span className="trending-value">
                                                                {reel.trending_score.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="virality-score">
                                                            <span className="virality-label">
                                                                Virality:
                                                            </span>
                                                            <span className="virality-value">
                                                                {reel.virality_score.toFixed(2)}
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
                                                                className={`spam-score ${getSpamLevel(reel.spam_score || 0).color}`}
                                                            >
                                                                {formatSpamScore(
                                                                    reel.spam_score || 0,
                                                                )}
                                                            </span>
                                                            <small>Spam Score</small>
                                                        </div>
                                                        <div className="metric-item">
                                                            <TrendingUp size={14} />
                                                            <span
                                                                className={`sentiment-score ${getSentimentLevel(reel.sentiment_score || 0).color}`}
                                                            >
                                                                {reel.sentiment_score > 0
                                                                    ? '+'
                                                                    : ''}
                                                                {(
                                                                    reel.sentiment_score || 0
                                                                ).toFixed(1)}
                                                            </span>
                                                            <small>Sentiment</small>
                                                        </div>
                                                        <div className="metric-item">
                                                            <Clock size={14} />
                                                            <span className="transcoding-progress">
                                                                {reel.transcoding_progress
                                                                    ? `${(reel.transcoding_progress * 100).toFixed(0)}%`
                                                                    : 'N/A'}
                                                            </span>
                                                            <small>Progress</small>
                                                        </div>
                                                    </div>
                                                    <div className="analysis-actions">
                                                        <div
                                                            className="priority-badge"
                                                            style={{
                                                                backgroundColor: getPriorityColor(
                                                                    reel.spam_score || 0,
                                                                    reel.reported_count,
                                                                    reel.transcoding_status,
                                                                ),
                                                            }}
                                                        >
                                                            Priority:{' '}
                                                            {getPriorityColor(
                                                                reel.spam_score || 0,
                                                                reel.reported_count,
                                                                reel.transcoding_status,
                                                            ) === 'red'
                                                                ? 'High'
                                                                : getPriorityColor(
                                                                        reel.spam_score || 0,
                                                                        reel.reported_count,
                                                                        reel.transcoding_status,
                                                                    ) === 'orange'
                                                                  ? 'Medium'
                                                                  : 'Low'}
                                                        </div>
                                                        <div className="reports-count">
                                                            <AlertCircle size={12} />
                                                            <span>
                                                                {reel.reported_count} reports
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
                                                                `/reel/${reel.id}`,
                                                                '_blank',
                                                            )
                                                        }
                                                        title="View Reel"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        className="action-btn moderate"
                                                        onClick={() => handleModerateReel(reel)}
                                                        title="Moderate Reel"
                                                    >
                                                        <ShieldCheck size={16} />
                                                    </button>
                                                    {reel.moderation_status === 'pending' && (
                                                        <>
                                                            <button
                                                                className="action-btn approve"
                                                                onClick={() => {
                                                                    setModeratingReel(reel);
                                                                    setModerationAction('approve');
                                                                    setModerationReason(
                                                                        'Content is appropriate',
                                                                    );
                                                                    confirmModeration();
                                                                }}
                                                                title="Approve Reel"
                                                            >
                                                                <CheckCircle size={16} />
                                                            </button>
                                                            <button
                                                                className="action-btn reject"
                                                                onClick={() => {
                                                                    setModeratingReel(reel);
                                                                    setModerationAction('reject');
                                                                    setModerationReason(
                                                                        'Inappropriate content',
                                                                    );
                                                                    confirmModeration();
                                                                }}
                                                                title="Reject Reel"
                                                            >
                                                                <XCircle size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={() => handleDeleteReel(reel.id)}
                                                        title="Delete Reel"
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
            {showModerationModal && moderatingReel && (
                <div className="modal-overlay" onClick={() => setShowModerationModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '800px' }}
                    >
                        <div className="modal-header">
                            <h3>Moderate Reel</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowModerationModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="moderation-reel-preview">
                                <div className="reel-preview-header">
                                    <strong>{moderatingReel.username}</strong>
                                    <span className="reel-date">
                                        {new Date(moderatingReel.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="reel-preview-content">
                                    <div className="reel-media">
                                        <img
                                            src={moderatingReel.thumbnail_url}
                                            alt="Reel Thumbnail"
                                        />
                                        <div className="video-overlay">
                                            <Play size={32} />
                                        </div>
                                        <div className="duration-overlay">
                                            {formatDuration(moderatingReel.duration)}
                                        </div>
                                    </div>
                                    <div className="reel-info">
                                        <div className="reel-title">
                                            <strong>
                                                {moderatingReel.title || 'Untitled Reel'}
                                            </strong>
                                        </div>
                                        <div className="reel-description">
                                            {moderatingReel.description}
                                        </div>
                                        <div className="reel-meta">
                                            <span className="reel-resolution">
                                                {moderatingReel.resolution}
                                            </span>
                                            <span className="reel-duration">
                                                {formatDuration(moderatingReel.duration)}
                                            </span>
                                            <span className="reel-size">
                                                {formatFileSize(moderatingReel.video_size)}
                                            </span>
                                        </div>
                                        {moderatingReel.music_track && (
                                            <div className="reel-music">
                                                <span className="music-label">Music:</span>
                                                <span className="music-title">
                                                    {moderatingReel.music_track}
                                                </span>
                                            </div>
                                        )}
                                        {moderatingReel.effects &&
                                            moderatingReel.effects.length > 0 && (
                                                <div className="reel-effects">
                                                    <span className="effects-label">Effects:</span>
                                                    <span className="effects-list">
                                                        {moderatingReel.effects.join(', ')}
                                                    </span>
                                                </div>
                                            )}
                                        {moderatingReel.filters &&
                                            moderatingReel.filters.length > 0 && (
                                                <div className="reel-filters">
                                                    <span className="filters-label">Filters:</span>
                                                    <span className="filters-list">
                                                        {moderatingReel.filters.join(', ')}
                                                    </span>
                                                </div>
                                            )}
                                    </div>
                                </div>
                                <div className="reel-preview-meta">
                                    <span className="spam-score-preview">
                                        Spam Score:{' '}
                                        {formatSpamScore(moderatingReel.spam_score || 0)}
                                    </span>
                                    <span className="reports-count-preview">
                                        Reports: {moderatingReel.reported_count}
                                    </span>
                                    <span className="views-count-preview">
                                        Views: {moderatingReel.view_count.toLocaleString()}
                                    </span>
                                    <span className="engagement-preview">
                                        Engagement: {moderatingReel.engagement_score.toFixed(2)}
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
                                                Rejecting this reel will mark it as inappropriate
                                            </span>
                                        </div>
                                    )}
                                    {moderationAction === 'delete' && (
                                        <div className="warning-box">
                                            <XCircle size={16} />
                                            <span>
                                                Deleting this reel is permanent and cannot be undone
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
                        style={{ maxWidth: '1200px' }}
                    >
                        <div className="modal-header">
                            <h3>User Reel Statistics</h3>
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
                                                        <strong>{stats.total_reels}</strong>
                                                        <span>Total Reels</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <Play size={20} />
                                                    <div>
                                                        <strong>{stats.active_reels}</strong>
                                                        <span>Active</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <Clock size={20} />
                                                    <div>
                                                        <strong>{stats.deleted_reels}</strong>
                                                        <span>Deleted</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <Crown size={20} />
                                                    <div>
                                                        <strong>
                                                            {stats.top_reel_id || 'N/A'}
                                                        </strong>
                                                        <span>Top Reel</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="metric-row">
                                                <div className="metric-item">
                                                    <Eye size={20} />
                                                    <div>
                                                        <strong>
                                                            {stats.total_views.toLocaleString()}
                                                        </strong>
                                                        <span>Total Views</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <ThumbsUp size={20} />
                                                    <div>
                                                        <strong>
                                                            {stats.total_likes.toLocaleString()}
                                                        </strong>
                                                        <span>Total Likes</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <MessageCircle size={20} />
                                                    <div>
                                                        <strong>{stats.total_comments}</strong>
                                                        <span>Comments</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <Share2 size={20} />
                                                    <div>
                                                        <strong>{stats.total_shares}</strong>
                                                        <span>Shares</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="metric-row">
                                                <div className="metric-item">
                                                    <Video size={20} />
                                                    <div>
                                                        <strong>{stats.total_duets}</strong>
                                                        <span>Duets</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <Scissors size={20} />
                                                    <div>
                                                        <strong>{stats.total_stitches}</strong>
                                                        <span>Stitches</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <Download size={20} />
                                                    <div>
                                                        <strong>{stats.total_saves}</strong>
                                                        <span>Saves</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <TrendingUp size={20} />
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
                                                    <TrendingUp size={20} />
                                                    <div>
                                                        <strong>
                                                            {stats.avg_trending_score.toFixed(2)}
                                                        </strong>
                                                        <span>Avg Trending</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <Rocket size={20} />
                                                    <div>
                                                        <strong>
                                                            {stats.avg_virality_score.toFixed(2)}
                                                        </strong>
                                                        <span>Avg Virality</span>
                                                    </div>
                                                </div>
                                                <div className="metric-item">
                                                    <Users size={20} />
                                                    <div>
                                                        <strong>{stats.follower_growth}</strong>
                                                        <span>Follower Growth</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="stat-footer">
                                            <span className="last-activity">
                                                Last Reel:{' '}
                                                {stats.last_reel_at
                                                    ? new Date(stats.last_reel_at).toLocaleString()
                                                    : 'Never'}
                                            </span>
                                            <div className="user-reputation">
                                                <span className="reputation-label">
                                                    Creator Level:
                                                </span>
                                                <span
                                                    className={`reputation-score ${stats.avg_engagement_rate > 0.25 ? 'excellent' : stats.avg_engagement_rate > 0.15 ? 'good' : 'poor'}`}
                                                >
                                                    {stats.avg_engagement_rate > 0.25
                                                        ? 'Top Creator'
                                                        : stats.avg_engagement_rate > 0.15
                                                          ? 'Active'
                                                          : 'New'}
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

            {/* Transcoding Jobs Modal */}
            {showTranscodingModal && (
                <div className="modal-overlay" onClick={() => setShowTranscodingModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '1000px' }}
                    >
                        <div className="modal-header">
                            <h3>Reel Transcoding Jobs</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowTranscodingModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="transcoding-jobs-list">
                                {mockTranscodingJobs.map((job) => (
                                    <div key={job.id} className="transcoding-job-item">
                                        <div className="job-header">
                                            <div className="job-info">
                                                <strong>Job: {job.id}</strong>
                                                <span className="job-reel-id">
                                                    Reel: {job.reel_id}
                                                </span>
                                            </div>
                                            <div className="job-status">
                                                <span
                                                    className={`status-pill ${getTranscodingStatusBadge(job.status).color}`}
                                                >
                                                    {getTranscodingStatusBadge(job.status).icon}
                                                    {getTranscodingStatusBadge(job.status).text}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="job-details">
                                            <div className="job-meta">
                                                <span className="job-worker">
                                                    Worker: {job.worker_id}
                                                </span>
                                                <span className="job-started">
                                                    Started:{' '}
                                                    {new Date(job.started_at).toLocaleString()}
                                                </span>
                                                {job.completed_at && (
                                                    <span className="job-completed">
                                                        Completed:{' '}
                                                        {new Date(
                                                            job.completed_at,
                                                        ).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="job-qualities">
                                                <span className="qualities-label">
                                                    Target Qualities:
                                                </span>
                                                <div className="qualities-list">
                                                    {job.target_qualities.map((quality) => (
                                                        <span key={quality} className="quality-tag">
                                                            {quality}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="job-progress">
                                                <div className="progress-bar">
                                                    <div
                                                        className="progress-fill"
                                                        style={{ width: `${job.progress * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className="progress-text">
                                                    {(job.progress * 100).toFixed(0)}% Complete
                                                </span>
                                            </div>

                                            {job.current_quality && (
                                                <div className="current-quality">
                                                    <span className="quality-label">Current:</span>
                                                    <span className="quality-value">
                                                        {job.current_quality}
                                                    </span>
                                                </div>
                                            )}

                                            {job.error_message && (
                                                <div className="job-error">
                                                    <span className="error-label">Error:</span>
                                                    <span className="error-message">
                                                        {job.error_message}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="transcoding-actions">
                                <button className="btn-secondary">Retry Failed Jobs</button>
                                <button className="btn-secondary">Clear Completed Jobs</button>
                                <button className="btn-primary">Start New Job</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Trending Reels Modal */}
            {showTrendingModal && (
                <div className="modal-overlay" onClick={() => setShowTrendingModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '800px' }}
                    >
                        <div className="modal-header">
                            <h3>Trending Reels</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowTrendingModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="trending-reels-list">
                                {mockTrendingReels.map((trending) => (
                                    <div key={trending.reel_id} className="trending-reel-item">
                                        <div className="trending-header">
                                            <div className="trending-info">
                                                <strong>Reel: {trending.reel_id}</strong>
                                                <span className="trending-category">
                                                    Category: {trending.category}
                                                </span>
                                                <span className="trending-region">
                                                    Region: {trending.region}
                                                </span>
                                            </div>
                                            <div className="trending-scores">
                                                <span className="trending-score">
                                                    Trending: {trending.trending_score.toFixed(2)}
                                                </span>
                                                <span className="virality-score">
                                                    Virality: {trending.virality_score.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="trending-meta">
                                            <span className="trending-started">
                                                Started:{' '}
                                                {new Date(trending.trending_at).toLocaleString()}
                                            </span>
                                            <span className="trending-peak">
                                                Peak:{' '}
                                                {trending.peak_trending_at
                                                    ? new Date(
                                                          trending.peak_trending_at,
                                                      ).toLocaleString()
                                                    : 'N/A'}
                                            </span>
                                            <span className="trending-duration">
                                                Duration: {trending.trending_duration} hours
                                            </span>
                                        </div>

                                        <div className="trending-actions">
                                            <button className="trending-action-btn">
                                                View Reel
                                            </button>
                                            <button className="trending-action-btn">
                                                Boost Trending
                                            </button>
                                            <button className="trending-action-btn">
                                                Remove from Trending
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReelManagementTab;
