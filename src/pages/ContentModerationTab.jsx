import React, { useState, useEffect } from 'react';
import { 
    FileText, AlertTriangle, Eye, EyeOff, Shield, CheckCircle, XCircle,
    Search, Filter, Clock, User, Flag, MessageSquare, Image as ImageIcon,
    Video, Calendar, RefreshCw, Download, Upload, Plus, Edit, Trash2,
    TrendingUp, BarChart3, PieChart, Users, Globe
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

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

    // Mock data for moderation queue
    const mockModerationQueue = [
        {
            id: 'post_001',
            type: 'post',
            content: 'This is a potentially inappropriate post content...',
            author: 'user123',
            reportedBy: ['user456', 'user789'],
            reports: 3,
            severity: 'high',
            status: 'pending',
            createdAt: '2024-01-15T10:30:00Z',
            category: 'spam',
            flaggedWords: ['spam', 'advertisement'],
            media: null
        },
        {
            id: 'comment_002',
            type: 'comment',
            content: 'Offensive comment content here...',
            author: 'user_anon',
            reportedBy: ['user123'],
            reports: 1,
            severity: 'medium',
            status: 'pending',
            createdAt: '2024-01-15T09:15:00Z',
            category: 'harassment',
            flaggedWords: ['offensive', 'hate'],
            media: null
        },
        {
            id: 'story_003',
            type: 'story',
            content: 'Story with inappropriate content',
            author: 'user_premium',
            reportedBy: ['user456', 'user789', 'user101'],
            reports: 5,
            severity: 'high',
            status: 'pending',
            createdAt: '2024-01-15T08:45:00Z',
            category: 'inappropriate',
            flaggedWords: ['inappropriate'],
            media: 'https://example.com/story_image.jpg'
        }
    ];

    useEffect(() => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setModerationQueue(mockModerationQueue);
            setIsLoading(false);
        }, 1000);
    }, [filters]);

    const handleModerationAction = (itemId, action) => {
        const item = moderationQueue.find(q => q.id === itemId);
        if (!item) return;

        let message = '';
        let type = 'success';

        switch (action) {
            case 'approve':
                message = `Content ${itemId} approved`;
                break;
            case 'reject':
                message = `Content ${itemId} rejected and removed`;
                type = 'warning';
                break;
            case 'warn':
                message = `Warning issued to ${item.author}`;
                break;
            case 'ban':
                message = `User ${item.author} banned`;
                type = 'danger';
                break;
            default:
                return;
        }

        showToast(message, type);
        
        // Update the queue
        setModerationQueue(prev => prev.map(q => 
            q.id === itemId ? { ...q, status: action === 'approve' ? 'approved' : 'rejected' } : q
        ));
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
                            onChange={(e) => setFilters({...filters, search: e.target.value})}
                        />
                    </div>
                    
                    <div className="filter-group">
                        <select 
                            value={filters.contentType}
                            onChange={(e) => setFilters({...filters, contentType: e.target.value})}
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
                            onChange={(e) => setFilters({...filters, status: e.target.value})}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        
                        <select 
                            value={filters.severity}
                            onChange={(e) => setFilters({...filters, severity: e.target.value})}
                        >
                            <option value="all">All Severity</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                </div>

                <div className="filter-actions">
                    <button className="refresh-btn" onClick={() => {}}>
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
                                    <div key={item.id} className={`moderation-item ${item.status}`}>
                                        <div className="item-header">
                                            <div className="item-type">
                                                <Icon size={20} color={getSeverityColor(item.severity)} />
                                                <span className="type-label">{item.type.toUpperCase()}</span>
                                                <span 
                                                    className="severity-badge"
                                                    style={{ backgroundColor: `${getSeverityColor(item.severity)}20`, color: getSeverityColor(item.severity) }}
                                                >
                                                    {item.severity.toUpperCase()}
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
                                                    onClick={() => handleModerationAction(item.id, 'approve')}
                                                >
                                                    <CheckCircle size={16} />
                                                    Approve
                                                </button>
                                                <button 
                                                    className="action-btn reject"
                                                    onClick={() => handleModerationAction(item.id, 'reject')}
                                                >
                                                    <XCircle size={16} />
                                                    Reject
                                                </button>
                                                <button 
                                                    className="action-btn warn"
                                                    onClick={() => handleModerationAction(item.id, 'warn')}
                                                >
                                                    <AlertTriangle size={16} />
                                                    Warn
                                                </button>
                                                <button 
                                                    className="action-btn ban"
                                                    onClick={() => handleModerationAction(item.id, 'ban')}
                                                >
                                                    <Shield size={16} />
                                                    Ban User
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="item-content">
                                            <div className="content-preview">
                                                <p>{item.content}</p>
                                                {item.media && (
                                                    <div className="media-preview">
                                                        <img src={item.media} alt="Content media" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="content-meta">
                                                <div className="meta-item">
                                                    <User size={16} />
                                                    <span>Author: {item.author}</span>
                                                </div>
                                                <div className="meta-item">
                                                    <Flag size={16} />
                                                    <span>{item.reports} reports</span>
                                                </div>
                                                <div className="meta-item">
                                                    <Calendar size={16} />
                                                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                                                </div>
                                                <div className="meta-item">
                                                    <MessageSquare size={16} />
                                                    <span>Category: {item.category}</span>
                                                </div>
                                            </div>
                                            
                                            {item.flaggedWords.length > 0 && (
                                                <div className="flagged-words">
                                                    <strong>Flagged Words:</strong>
                                                    <div className="words-list">
                                                        {item.flaggedWords.map((word, index) => (
                                                            <span key={index} className="flagged-word">{word}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="reported-by">
                                                <strong>Reported by:</strong>
                                                <div className="reporters">
                                                    {item.reportedBy.map((reporter, index) => (
                                                        <span key={index} className="reporter">{reporter}</span>
                                                    ))}
                                                </div>
                                            </div>
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