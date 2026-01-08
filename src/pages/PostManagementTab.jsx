import React, { useState, useEffect } from 'react';
import {
    FileText, Plus, Edit, Trash2, Eye, EyeOff, Download, Upload, RefreshCw, Search,
    Filter, Clock, Calendar, User, Users, TrendingUp, BarChart3, FileSpreadsheet,
    AlertTriangle, CheckCircle, XCircle, UserCheck, UserX, ShieldCheck, AlertCircle,
    Zap, Repeat, FileCheck, FileClock, FileSearch,
    Globe, Video, Image, AudioLines, Tag, Star, Crown, Shield, MessageSquare,
    ChevronLeft, ChevronRight, Copy, Share2, ThumbsUp,
    MessageCircle, Share
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const PostManagementTab = () => {
    const [posts, setPosts] = useState([]);
    const [filters, setFilters] = useState({
        status: 'all',
        post_type: 'all',
        category: 'all',
        author: 'all',
        search: '',
        sortBy: 'created_at',
        sortOrder: 'desc'
    });

    const [selectedPosts, setSelectedPosts] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showWorkflowModal, setShowWorkflowModal] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const { showToast } = useToast();

    // Mock data for posts
    const mockPosts = [
        {
            id: 'post_001',
            title: 'The Future of AI in Education',
            content: 'Artificial intelligence is revolutionizing the education sector...',
            excerpt: 'AI is transforming how we learn and teach in the digital age.',
            slug: 'future-of-ai-in-education',
            status: 'published',
            post_type: 'article',
            category: 'Technology',
            tags: ['AI', 'Education', 'Technology', 'Future'],
            author_id: 'user_001',
            author_name: 'Sarah Johnson',
            featured_image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3',
            gallery_images: ['https://images.unsplash.com/photo-1516321318423-f06f85e504b3'],
            video_url: null,
            audio_url: null,
            scheduled_publish_date: null,
            published_at: '2024-01-15T10:00:00Z',
            approved_at: '2024-01-14T16:30:00Z',
            approved_by: 'admin_001',
            rejected_at: null,
            rejected_by: null,
            rejection_reason: null,
            view_count: 1250,
            like_count: 89,
            comment_count: 23,
            share_count: 15,
            reading_time: 8,
            language: 'en',
            is_featured: true,
            is_premium: false,
            allow_comments: true,
            allow_sharing: true,
            seo_title: 'The Future of AI in Education - KaruTeens',
            seo_description: 'Discover how artificial intelligence is transforming education and what it means for students and teachers.',
            seo_keywords: ['AI', 'education', 'technology', 'future'],
            source_url: null,
            source_author: null,
            plagiarism_score: 2.1,
            content_rating: 'PG',
            created_at: '2024-01-10T08:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
            analytics: {
                total_views: 1250,
                unique_views: 980,
                total_likes: 89,
                total_comments: 23,
                total_shares: 15,
                avg_reading_time: 4.5,
                engagement_rate: 10.2
            }
        },
        {
            id: 'post_002',
            title: 'Healthy Eating Habits for Students',
            content: 'Maintaining a balanced diet is crucial for academic success...',
            excerpt: 'Learn how proper nutrition can boost your academic performance.',
            slug: 'healthy-eating-habits-students',
            status: 'approved',
            post_type: 'blog',
            category: 'Health',
            tags: ['Health', 'Nutrition', 'Students', 'Lifestyle'],
            author_id: 'user_002',
            author_name: 'Dr. Michael Chen',
            featured_image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061',
            gallery_images: [],
            video_url: 'https://youtube.com/watch?v=example',
            audio_url: null,
            scheduled_publish_date: '2024-01-20T09:00:00Z',
            published_at: null,
            approved_at: '2024-01-18T14:20:00Z',
            approved_by: 'admin_002',
            rejected_at: null,
            rejected_by: null,
            rejection_reason: null,
            view_count: 0,
            like_count: 0,
            comment_count: 0,
            share_count: 0,
            reading_time: 5,
            language: 'en',
            is_featured: false,
            is_premium: true,
            allow_comments: true,
            allow_sharing: true,
            seo_title: 'Healthy Eating Habits for Students - KaruTeens',
            seo_description: 'Discover the best eating habits to improve your focus and academic performance.',
            seo_keywords: ['health', 'nutrition', 'students', 'eating'],
            source_url: null,
            source_author: null,
            plagiarism_score: 1.8,
            content_rating: 'G',
            created_at: '2024-01-12T09:30:00Z',
            updated_at: '2024-01-18T14:20:00Z',
            analytics: {
                total_views: 0,
                unique_views: 0,
                total_likes: 0,
                total_comments: 0,
                total_shares: 0,
                avg_reading_time: null,
                engagement_rate: 0.0
            }
        },
        {
            id: 'post_003',
            title: 'Breaking: New Campus Policy Announced',
            content: 'The university administration has announced a new policy...',
            excerpt: 'Important policy changes that will affect all students.',
            slug: 'new-campus-policy-announced',
            status: 'pending_review',
            post_type: 'announcement',
            category: 'News',
            tags: ['Announcement', 'Policy', 'Campus'],
            author_id: 'user_003',
            author_name: 'Campus Admin',
            featured_image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644',
            gallery_images: [],
            video_url: null,
            audio_url: null,
            scheduled_publish_date: null,
            published_at: null,
            approved_at: null,
            approved_by: null,
            rejected_at: null,
            rejected_by: null,
            rejection_reason: null,
            view_count: 0,
            like_count: 0,
            comment_count: 0,
            share_count: 0,
            reading_time: 3,
            language: 'en',
            is_featured: false,
            is_premium: false,
            allow_comments: false,
            allow_sharing: true,
            seo_title: 'New Campus Policy Announced - KaruTeens',
            seo_description: 'Important announcement regarding new campus policies.',
            seo_keywords: ['announcement', 'policy', 'campus'],
            source_url: null,
            source_author: null,
            plagiarism_score: 0.5,
            content_rating: 'G',
            created_at: '2024-01-19T11:00:00Z',
            updated_at: '2024-01-19T11:00:00Z',
            analytics: {
                total_views: 0,
                unique_views: 0,
                total_likes: 0,
                total_comments: 0,
                total_shares: 0,
                avg_reading_time: null,
                engagement_rate: 0.0
            }
        },
        {
            id: 'post_004',
            title: 'How to Master Programming in 2024',
            content: 'Programming skills are in high demand in today\'s job market...',
            excerpt: 'Essential programming skills you need to master this year.',
            slug: 'master-programming-2024',
            status: 'draft',
            post_type: 'tutorial',
            category: 'Technology',
            tags: ['Programming', 'Tutorial', 'Skills', 'Career'],
            author_id: 'user_004',
            author_name: 'Alex Rodriguez',
            featured_image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97',
            gallery_images: [],
            video_url: null,
            audio_url: 'https://example.com/audio/podcast.mp3',
            scheduled_publish_date: null,
            published_at: null,
            approved_at: null,
            approved_by: null,
            rejected_at: null,
            rejected_by: null,
            rejection_reason: null,
            view_count: 0,
            like_count: 0,
            comment_count: 0,
            share_count: 0,
            reading_time: 12,
            language: 'en',
            is_featured: false,
            is_premium: false,
            allow_comments: true,
            allow_sharing: true,
            seo_title: 'How to Master Programming in 2024 - KaruTeens',
            seo_description: 'Complete guide to mastering programming skills in the current year.',
            seo_keywords: ['programming', 'tutorial', 'skills', 'career'],
            source_url: null,
            source_author: null,
            plagiarism_score: 3.2,
            content_rating: 'PG',
            created_at: '2024-01-20T14:00:00Z',
            updated_at: '2024-01-20T14:00:00Z',
            analytics: {
                total_views: 0,
                unique_views: 0,
                total_likes: 0,
                total_comments: 0,
                total_shares: 0,
                avg_reading_time: null,
                engagement_rate: 0.0
            }
        },
        {
            id: 'post_005',
            title: 'Rejected: Controversial Topic Article',
            content: 'This article was rejected due to policy violations...',
            excerpt: 'Content that violates our community guidelines.',
            slug: 'rejected-controversial-topic',
            status: 'rejected',
            post_type: 'article',
            category: 'Opinion',
            tags: ['Controversial', 'Rejected', 'Policy'],
            author_id: 'user_005',
            author_name: 'Guest Author',
            featured_image: null,
            gallery_images: [],
            video_url: null,
            audio_url: null,
            scheduled_publish_date: null,
            published_at: null,
            approved_at: null,
            approved_by: null,
            rejected_at: '2024-01-17T10:45:00Z',
            rejected_by: 'admin_001',
            rejection_reason: 'Content violates community guidelines regarding hate speech.',
            view_count: 0,
            like_count: 0,
            comment_count: 0,
            share_count: 0,
            reading_time: 6,
            language: 'en',
            is_featured: false,
            is_premium: false,
            allow_comments: false,
            allow_sharing: false,
            seo_title: null,
            seo_description: null,
            seo_keywords: null,
            source_url: null,
            source_author: null,
            plagiarism_score: 15.7,
            content_rating: 'R',
            created_at: '2024-01-16T08:30:00Z',
            updated_at: '2024-01-17T10:45:00Z',
            analytics: {
                total_views: 0,
                unique_views: 0,
                total_likes: 0,
                total_comments: 0,
                total_shares: 0,
                avg_reading_time: null,
                engagement_rate: 0.0
            }
        }
    ];

    useEffect(() => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setPosts(mockPosts);
            setIsLoading(false);
        }, 1000);
    }, [filters]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleBulkAction = () => {
        if (selectedPosts.length === 0) {
            showToast('Please select posts first', 'warning');
            return;
        }

        if (bulkAction === 'approve') {
            setPosts(prev => prev.map(p =>
                selectedPosts.includes(p.id) ? { ...p, status: 'approved' } : p
            ));
            setSelectedPosts([]);
            setBulkAction('');
            showToast('Posts approved', 'success');
        } else if (bulkAction === 'reject') {
            setPosts(prev => prev.map(p =>
                selectedPosts.includes(p.id) ? { ...p, status: 'rejected' } : p
            ));
            setSelectedPosts([]);
            setBulkAction('');
            showToast('Posts rejected', 'info');
        } else if (bulkAction === 'publish') {
            setPosts(prev => prev.map(p =>
                selectedPosts.includes(p.id) ? { ...p, status: 'published' } : p
            ));
            setSelectedPosts([]);
            setBulkAction('');
            showToast('Posts published', 'success');
        } else if (bulkAction === 'make_featured') {
            setPosts(prev => prev.map(p =>
                selectedPosts.includes(p.id) ? { ...p, is_featured: true } : p
            ));
            setSelectedPosts([]);
            setBulkAction('');
            showToast('Posts marked as featured', 'success');
        } else if (bulkAction === 'make_premium') {
            setPosts(prev => prev.map(p =>
                selectedPosts.includes(p.id) ? { ...p, is_premium: true } : p
            ));
            setSelectedPosts([]);
            setBulkAction('');
            showToast('Posts marked as premium', 'success');
        } else if (bulkAction === 'delete') {
            if (confirm(`Delete ${selectedPosts.length} posts? This action cannot be undone.`)) {
                setPosts(prev => prev.filter(p => !selectedPosts.includes(p.id)));
                setSelectedPosts([]);
                setBulkAction('');
                showToast('Posts deleted', 'success');
            }
        }
    };

    const handleApprovePost = (postId) => {
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, status: 'approved', approved_at: new Date().toISOString() } : p
        ));
        showToast('Post approved', 'success');
    };

    const handleRejectPost = (postId) => {
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, status: 'rejected', rejected_at: new Date().toISOString() } : p
        ));
        showToast('Post rejected', 'info');
    };

    const handlePublishPost = (postId) => {
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, status: 'published', published_at: new Date().toISOString() } : p
        ));
        showToast('Post published', 'success');
    };

    const handleDeletePost = (postId) => {
        if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
            setPosts(prev => prev.filter(p => p.id !== postId));
            showToast('Post deleted', 'success');
        }
    };

    const togglePostSelection = (postId) => {
        setSelectedPosts(prev =>
            prev.includes(postId)
                ? prev.filter(id => id !== postId)
                : [...prev, postId]
        );
    };

    const selectAllPosts = () => {
        if (selectedPosts.length === posts.length) {
            setSelectedPosts([]);
        } else {
            setSelectedPosts(posts.map(p => p.id));
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'published': return { color: 'green', text: 'Published', icon: <CheckCircle size={14} /> };
            case 'approved': return { color: 'blue', text: 'Approved', icon: <ShieldCheck size={14} /> };
            case 'pending_review': return { color: 'orange', text: 'Pending Review', icon: <FileClock size={14} /> };
            case 'draft': return { color: 'gray', text: 'Draft', icon: <FileClock size={14} /> };
            case 'rejected': return { color: 'red', text: 'Rejected', icon: <XCircle size={14} /> };
            case 'scheduled': return { color: 'purple', text: 'Scheduled', icon: <Calendar size={14} /> };
            default: return { color: 'gray', text: status, icon: <AlertTriangle size={14} /> };
        }
    };

    const getPostTypeBadge = (postType) => {
        switch (postType) {
            case 'article': return { color: 'blue', text: 'Article', icon: <FileText size={14} /> };
            case 'blog': return { color: 'green', text: 'Blog', icon: <MessageCircle size={14} /> };
            case 'news': return { color: 'orange', text: 'News', icon: <Globe size={14} /> };
            case 'announcement': return { color: 'red', text: 'Announcement', icon: <AlertCircle size={14} /> };
            case 'tutorial': return { color: 'purple', text: 'Tutorial', icon: <Zap size={14} /> };
            default: return { color: 'gray', text: postType, icon: <AlertTriangle size={14} /> };
        }
    };

    const getDaysSinceCreated = (createdAt) => {
        const now = new Date();
        const created = new Date(createdAt);
        const diffTime = now - created;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const formatEngagementRate = (rate) => {
        return `${rate.toFixed(1)}%`;
    };

    const getReadingTimeText = (minutes) => {
        if (minutes <= 1) return '1 min read';
        return `${minutes} min read`;
    };

    return (
        <div className="post-management-tab">
            {/* Header */}
            <div className="tab-header">
                <div className="header-left">
                    <h2>Post Management</h2>
                    <p>Manage content with approval workflows and publishing controls</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary">
                        <Upload size={18} />
                        Import Posts
                    </button>
                    <button className="btn-secondary">
                        <Download size={18} />
                        Export Posts
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus size={18} />
                        Add Post
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
                            placeholder="Search posts by title, content, or author..."
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
                            <option value="published">Published</option>
                            <option value="approved">Approved</option>
                            <option value="pending_review">Pending Review</option>
                            <option value="draft">Draft</option>
                            <option value="rejected">Rejected</option>
                            <option value="scheduled">Scheduled</option>
                        </select>

                        <select
                            value={filters.post_type}
                            onChange={(e) => handleFilterChange('post_type', e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value="article">Article</option>
                            <option value="blog">Blog</option>
                            <option value="news">News</option>
                            <option value="announcement">Announcement</option>
                            <option value="tutorial">Tutorial</option>
                        </select>

                        <select
                            value={filters.category}
                            onChange={(e) => handleFilterChange('category', e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            <option value="Technology">Technology</option>
                            <option value="Health">Health</option>
                            <option value="News">News</option>
                            <option value="Opinion">Opinion</option>
                            <option value="Education">Education</option>
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
            {selectedPosts.length > 0 && (
                <div className="bulk-actions">
                    <div className="selection-info">
                        {selectedPosts.length} posts selected
                    </div>
                    <div className="bulk-actions-controls">
                        <select
                            value={bulkAction}
                            onChange={(e) => setBulkAction(e.target.value)}
                        >
                            <option value="">Bulk Actions</option>
                            <option value="approve">Approve</option>
                            <option value="reject">Reject</option>
                            <option value="publish">Publish</option>
                            <option value="make_featured">Make Featured</option>
                            <option value="make_premium">Make Premium</option>
                            <option value="delete">Delete Posts</option>
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

            {/* Posts Table */}
            <div className="posts-table-container">
                {isLoading ? (
                    <div className="loading-state">
                        <RefreshCw size={32} className="spin-anim" />
                        <p>Loading posts...</p>
                    </div>
                ) : (
                    <>
                        <div className="table-header">
                            <div className="select-all">
                                <input
                                    type="checkbox"
                                    checked={selectedPosts.length === posts.length && posts.length > 0}
                                    onChange={selectAllPosts}
                                />
                                <span>Select All</span>
                            </div>
                            <div className="table-actions">
                                <span className="post-count">{posts.length} posts found</span>
                                <button className="refresh-btn" onClick={() => { }}>
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
                                                checked={selectedPosts.length === posts.length && posts.length > 0}
                                                onChange={selectAllPosts}
                                            />
                                        </th>
                                        <th>Post Info</th>
                                        <th>Status & Type</th>
                                        <th>Author & Date</th>
                                        <th>Content</th>
                                        <th>Analytics</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {posts.map(post => (
                                        <tr key={post.id} className={post.status === 'rejected' ? 'rejected-post' : ''}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPosts.includes(post.id)}
                                                    onChange={() => togglePostSelection(post.id)}
                                                />
                                            </td>
                                            <td>
                                                <div className="post-info">
                                                    <div className="post-title">
                                                        <h4>{post.title}</h4>
                                                        {post.is_featured && (
                                                            <span className="featured-badge">
                                                                <Star size={12} />
                                                                Featured
                                                            </span>
                                                        )}
                                                        {post.is_premium && (
                                                            <span className="premium-badge">
                                                                <Crown size={12} />
                                                                Premium
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="post-excerpt">{post.excerpt}</div>
                                                    <div className="post-meta">
                                                        <span className="slug-badge">{post.slug}</span>
                                                        {post.tags && post.tags.map(tag => (
                                                            <span key={tag} className="tag-badge">{tag}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="status-info">
                                                    <div className="status-badge">
                                                        <span className={`status-pill ${getStatusBadge(post.status).color}`}>
                                                            {getStatusBadge(post.status).icon}
                                                            {getStatusBadge(post.status).text}
                                                        </span>
                                                        <span className={`post-type-pill ${getPostTypeBadge(post.post_type).color}`}>
                                                            {getPostTypeBadge(post.post_type).icon}
                                                            {getPostTypeBadge(post.post_type).text}
                                                        </span>
                                                    </div>
                                                    <div className="status-dates">
                                                        {post.approved_at && (
                                                            <div className="status-date">
                                                                <ShieldCheck size={12} />
                                                                <span>Approved: {new Date(post.approved_at).toLocaleDateString()}</span>
                                                            </div>
                                                        )}
                                                        {post.published_at && (
                                                            <div className="status-date">
                                                                <CheckCircle size={12} />
                                                                <span>Published: {new Date(post.published_at).toLocaleDateString()}</span>
                                                            </div>
                                                        )}
                                                        {post.scheduled_publish_date && (
                                                            <div className="status-date">
                                                                <Calendar size={12} />
                                                                <span>Scheduled: {new Date(post.scheduled_publish_date).toLocaleDateString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {post.rejection_reason && (
                                                        <div className="rejection-reason">
                                                            <XCircle size={12} />
                                                            <span>{post.rejection_reason}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="author-info">
                                                    <div className="author-details">
                                                        <div className="author-name">
                                                            <User size={14} />
                                                            <span>{post.author_name}</span>
                                                        </div>
                                                        <div className="author-id">
                                                            <span>ID: {post.author_id}</span>
                                                        </div>
                                                    </div>
                                                    <div className="date-info">
                                                        <div className="created-date">
                                                            <Calendar size={12} />
                                                            <span>Created: {new Date(post.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="days-since">
                                                            <Clock size={12} />
                                                            <span>{getDaysSinceCreated(post.created_at)} days ago</span>
                                                        </div>
                                                    </div>
                                                    <div className="content-details">
                                                        <div className="reading-time">
                                                            <Clock size={12} />
                                                            <span>{getReadingTimeText(post.reading_time || 0)}</span>
                                                        </div>
                                                        <div className="language">
                                                            <Globe size={12} />
                                                            <span>{post.language}</span>
                                                        </div>
                                                        {post.plagiarism_score && (
                                                            <div className="plagiarism-score">
                                                                <AlertTriangle size={12} />
                                                                <span>{post.plagiarism_score}% similarity</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="content-info">
                                                    <div className="content-features">
                                                        {post.featured_image && (
                                                            <span className="feature-badge image">
                                                                <Image size={12} />
                                                                Featured Image
                                                            </span>
                                                        )}
                                                        {post.video_url && (
                                                            <span className="feature-badge video">
                                                                <Video size={12} />
                                                                Video
                                                            </span>
                                                        )}
                                                        {post.audio_url && (
                                                            <span className="feature-badge audio">
                                                                <AudioLines size={12} />
                                                                Audio
                                                            </span>
                                                        )}
                                                        {post.gallery_images && post.gallery_images.length > 0 && (
                                                            <span className="feature-badge gallery">
                                                                <Image size={12} />
                                                                Gallery ({post.gallery_images.length})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="content-controls">
                                                        <div className="comments-control">
                                                            <MessageSquare size={12} />
                                                            <span>{post.allow_comments ? 'Comments Enabled' : 'Comments Disabled'}</span>
                                                        </div>
                                                        <div className="sharing-control">
                                                            <Share2 size={12} />
                                                            <span>{post.allow_sharing ? 'Sharing Enabled' : 'Sharing Disabled'}</span>
                                                        </div>
                                                    </div>
                                                    {post.content_rating && (
                                                        <div className="content-rating">
                                                            <Shield size={12} />
                                                            <span>Rating: {post.content_rating}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="analytics-info">
                                                    <div className="metric-row">
                                                        <div className="metric-item">
                                                            <Eye size={14} />
                                                            <span>{post.analytics.total_views.toLocaleString()}</span>
                                                            <small>Views</small>
                                                        </div>
                                                        <div className="metric-item">
                                                            <ThumbsUp size={14} />
                                                            <span>{post.analytics.total_likes}</span>
                                                            <small>Likes</small>
                                                        </div>
                                                    </div>
                                                    <div className="metric-row">
                                                        <div className="metric-item">
                                                            <MessageCircle size={14} />
                                                            <span>{post.analytics.total_comments}</span>
                                                            <small>Comments</small>
                                                        </div>
                                                        <div className="metric-item">
                                                            <Share size={14} />
                                                            <span>{post.analytics.total_shares}</span>
                                                            <small>Shares</small>
                                                        </div>
                                                    </div>
                                                    <div className="metric-row">
                                                        <div className="metric-item">
                                                            <TrendingUp size={14} />
                                                            <span>{formatEngagementRate(post.analytics.engagement_rate)}</span>
                                                            <small>Engagement</small>
                                                        </div>
                                                        <div className="metric-item">
                                                            <ClockIcon size={14} />
                                                            <span>{post.analytics.avg_reading_time || 0} min</span>
                                                            <small>Avg Time</small>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="action-btn view"
                                                        onClick={() => window.open(`/post/${post.slug}`, '_blank')}
                                                        title="View Post"
                                                    >
                                                        <EyeIcon size={16} />
                                                    </button>
                                                    <button
                                                        className="action-btn analytics"
                                                        onClick={() => { }}
                                                        title="View Analytics"
                                                    >
                                                        <BarChart3 size={16} />
                                                    </button>
                                                    <button
                                                        className="action-btn workflow"
                                                        onClick={() => {
                                                            setEditingPost(post);
                                                            setShowWorkflowModal(true);
                                                        }}
                                                        title="View Workflow"
                                                    >
                                                        <FileSearch size={16} />
                                                    </button>
                                                    <button
                                                        className="action-btn edit"
                                                        onClick={() => {
                                                            setEditingPost(post);
                                                            setShowEditModal(true);
                                                        }}
                                                        title="Edit Post"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    {post.status === 'pending_review' && (
                                                        <>
                                                            <button
                                                                className="action-btn approve"
                                                                onClick={() => handleApprovePost(post.id)}
                                                                title="Approve Post"
                                                            >
                                                                <FileCheck size={16} />
                                                            </button>
                                                            <button
                                                                className="action-btn reject"
                                                                onClick={() => handleRejectPost(post.id)}
                                                                title="Reject Post"
                                                            >
                                                                <XCircle size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {post.status === 'approved' && (
                                                        <button
                                                            className="action-btn publish"
                                                            onClick={() => handlePublishPost(post.id)}
                                                            title="Publish Post"
                                                        >
                                                            <FileTextIcon size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={() => handleDeletePost(post.id)}
                                                        title="Delete Post"
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

            {/* Add Post Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
                        <div className="modal-header">
                            <h3>Add New Post</h3>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Post Title *</label>
                                        <input type="text" className="form-input" placeholder="Enter post title" />
                                    </div>
                                    <div className="form-group">
                                        <label>Post Type *</label>
                                        <select className="form-input">
                                            <option value="">Select post type</option>
                                            <option value="article">Article</option>
                                            <option value="blog">Blog</option>
                                            <option value="news">News</option>
                                            <option value="announcement">Announcement</option>
                                            <option value="tutorial">Tutorial</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Content *</label>
                                    <textarea className="form-input" rows="8" placeholder="Enter post content"></textarea>
                                </div>

                                <div className="form-group">
                                    <label>Excerpt (Optional)</label>
                                    <textarea className="form-input" rows="3" placeholder="Enter post excerpt"></textarea>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Category *</label>
                                        <select className="form-input">
                                            <option value="">Select category</option>
                                            <option value="Technology">Technology</option>
                                            <option value="Health">Health</option>
                                            <option value="News">News</option>
                                            <option value="Opinion">Opinion</option>
                                            <option value="Education">Education</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Tags (comma-separated)</label>
                                        <input type="text" className="form-input" placeholder="tag1, tag2, tag3" />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Language *</label>
                                        <select className="form-input">
                                            <option value="en">English</option>
                                            <option value="sw">Swahili</option>
                                            <option value="fr">French</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Content Rating</label>
                                        <select className="form-input">
                                            <option value="G">G - General</option>
                                            <option value="PG">PG - Parental Guidance</option>
                                            <option value="R">R - Restricted</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h4>Media & Content</h4>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Featured Image URL</label>
                                            <input type="url" className="form-input" placeholder="Enter featured image URL" />
                                        </div>
                                        <div className="form-group">
                                            <label>Video URL (Optional)</label>
                                            <input type="url" className="form-input" placeholder="Enter video URL" />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Audio URL (Optional)</label>
                                            <input type="url" className="form-input" placeholder="Enter audio URL" />
                                        </div>
                                        <div className="form-group">
                                            <label>Gallery Images (comma-separated URLs)</label>
                                            <input type="text" className="form-input" placeholder="image1.jpg, image2.jpg" />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h4>SEO Settings</h4>
                                    <div className="form-group">
                                        <label>SEO Title</label>
                                        <input type="text" className="form-input" placeholder="Enter SEO title" />
                                    </div>
                                    <div className="form-group">
                                        <label>SEO Description</label>
                                        <textarea className="form-input" rows="3" placeholder="Enter SEO description"></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label>SEO Keywords (comma-separated)</label>
                                        <input type="text" className="form-input" placeholder="keyword1, keyword2, keyword3" />
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h4>Advanced Settings</h4>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input type="checkbox" />
                                                Featured Post
                                            </label>
                                        </div>
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input type="checkbox" />
                                                Premium Content
                                            </label>
                                        </div>
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input type="checkbox" defaultChecked />
                                                Allow Comments
                                            </label>
                                        </div>
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input type="checkbox" defaultChecked />
                                                Allow Sharing
                                            </label>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Scheduled Publish Date (Optional)</label>
                                            <input type="datetime-local" className="form-input" />
                                        </div>
                                        <div className="form-group">
                                            <label>Custom Meta Data (JSON)</label>
                                            <textarea className="form-input" rows="3" placeholder='{"key": "value"}'></textarea>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Create Post
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Post Modal */}
            {showEditModal && editingPost && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
                        <div className="modal-header">
                            <h3>Edit Post: {editingPost.title}</h3>
                            <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Post Title</label>
                                        <input type="text" className="form-input" defaultValue={editingPost.title} />
                                    </div>
                                    <div className="form-group">
                                        <label>Post Type</label>
                                        <select className="form-input" defaultValue={editingPost.post_type}>
                                            <option value="article">Article</option>
                                            <option value="blog">Blog</option>
                                            <option value="news">News</option>
                                            <option value="announcement">Announcement</option>
                                            <option value="tutorial">Tutorial</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Content</label>
                                    <textarea className="form-input" rows="8" defaultValue={editingPost.content}></textarea>
                                </div>

                                <div className="form-group">
                                    <label>Excerpt</label>
                                    <textarea className="form-input" rows="3" defaultValue={editingPost.excerpt || ''}></textarea>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Category</label>
                                        <select className="form-input" defaultValue={editingPost.category}>
                                            <option value="Technology">Technology</option>
                                            <option value="Health">Health</option>
                                            <option value="News">News</option>
                                            <option value="Opinion">Opinion</option>
                                            <option value="Education">Education</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Tags</label>
                                        <input type="text" className="form-input" defaultValue={editingPost.tags?.join(', ') || ''} />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Language</label>
                                        <select className="form-input" defaultValue={editingPost.language}>
                                            <option value="en">English</option>
                                            <option value="sw">Swahili</option>
                                            <option value="fr">French</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Content Rating</label>
                                        <select className="form-input" defaultValue={editingPost.content_rating || 'G'}>
                                            <option value="G">G - General</option>
                                            <option value="PG">PG - Parental Guidance</option>
                                            <option value="R">R - Restricted</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h4>Media & Content</h4>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Featured Image URL</label>
                                            <input type="url" className="form-input" defaultValue={editingPost.featured_image || ''} />
                                        </div>
                                        <div className="form-group">
                                            <label>Video URL</label>
                                            <input type="url" className="form-input" defaultValue={editingPost.video_url || ''} />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Audio URL</label>
                                            <input type="url" className="form-input" defaultValue={editingPost.audio_url || ''} />
                                        </div>
                                        <div className="form-group">
                                            <label>Gallery Images</label>
                                            <input type="text" className="form-input" defaultValue={editingPost.gallery_images?.join(', ') || ''} />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h4>SEO Settings</h4>
                                    <div className="form-group">
                                        <label>SEO Title</label>
                                        <input type="text" className="form-input" defaultValue={editingPost.seo_title || ''} />
                                    </div>
                                    <div className="form-group">
                                        <label>SEO Description</label>
                                        <textarea className="form-input" rows="3" defaultValue={editingPost.seo_description || ''}></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label>SEO Keywords</label>
                                        <input type="text" className="form-input" defaultValue={editingPost.seo_keywords?.join(', ') || ''} />
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h4>Advanced Settings</h4>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input type="checkbox" defaultChecked={editingPost.is_featured} />
                                                Featured Post
                                            </label>
                                        </div>
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input type="checkbox" defaultChecked={editingPost.is_premium} />
                                                Premium Content
                                            </label>
                                        </div>
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input type="checkbox" defaultChecked={editingPost.allow_comments} />
                                                Allow Comments
                                            </label>
                                        </div>
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input type="checkbox" defaultChecked={editingPost.allow_sharing} />
                                                Allow Sharing
                                            </label>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Scheduled Publish Date</label>
                                            <input type="datetime-local" className="form-input" defaultValue={editingPost.scheduled_publish_date || ''} />
                                        </div>
                                        <div className="form-group">
                                            <label>Custom Meta Data</label>
                                            <textarea className="form-input" rows="3" defaultValue={JSON.stringify(editingPost.meta_data || {})}></textarea>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Update Post
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Workflow Modal */}
            {showWorkflowModal && editingPost && (
                <div className="modal-overlay" onClick={() => setShowWorkflowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px' }}>
                        <div className="modal-header">
                            <h3>Post Workflow: {editingPost.title}</h3>
                            <button className="close-btn" onClick={() => setShowWorkflowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="workflow-container">
                                <div className="workflow-section">
                                    <h4>Post Status Timeline</h4>
                                    <div className="timeline">
                                        <div className="timeline-item">
                                            <div className="timeline-dot"></div>
                                            <div className="timeline-content">
                                                <strong>Draft Created</strong>
                                                <span>{new Date(editingPost.created_at).toLocaleString()}</span>
                                                <p>Post created by {editingPost.author_name}</p>
                                            </div>
                                        </div>
                                        {editingPost.approved_at && (
                                            <div className="timeline-item">
                                                <div className="timeline-dot approved"></div>
                                                <div className="timeline-content">
                                                    <strong>Approved</strong>
                                                    <span>{new Date(editingPost.approved_at).toLocaleString()}</span>
                                                    <p>Approved by {editingPost.approved_by}</p>
                                                </div>
                                            </div>
                                        )}
                                        {editingPost.published_at && (
                                            <div className="timeline-item">
                                                <div className="timeline-dot published"></div>
                                                <div className="timeline-content">
                                                    <strong>Published</strong>
                                                    <span>{new Date(editingPost.published_at).toLocaleString()}</span>
                                                    <p>Post went live to public</p>
                                                </div>
                                            </div>
                                        )}
                                        {editingPost.rejected_at && (
                                            <div className="timeline-item">
                                                <div className="timeline-dot rejected"></div>
                                                <div className="timeline-content">
                                                    <strong>Rejected</strong>
                                                    <span>{new Date(editingPost.rejected_at).toLocaleString()}</span>
                                                    <p>Rejected by {editingPost.rejected_by}</p>
                                                    <p className="rejection-reason">{editingPost.rejection_reason}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="workflow-section">
                                    <h4>Content Analytics</h4>
                                    <div className="analytics-grid">
                                        <div className="analytics-card">
                                            <h5>Total Views</h5>
                                            <div className="metric-value">{editingPost.analytics.total_views.toLocaleString()}</div>
                                        </div>
                                        <div className="analytics-card">
                                            <h5>Unique Views</h5>
                                            <div className="metric-value">{editingPost.analytics.unique_views}</div>
                                        </div>
                                        <div className="analytics-card">
                                            <h5>Engagement Rate</h5>
                                            <div className="metric-value">{formatEngagementRate(editingPost.analytics.engagement_rate)}</div>
                                        </div>
                                        <div className="analytics-card">
                                            <h5>Avg Reading Time</h5>
                                            <div className="metric-value">{editingPost.analytics.avg_reading_time || 0} min</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="workflow-section">
                                    <h4>Content Details</h4>
                                    <div className="content-details-grid">
                                        <div className="detail-item">
                                            <strong>Status:</strong>
                                            <span className={`status-pill ${getStatusBadge(editingPost.status).color}`}>
                                                {getStatusBadge(editingPost.status).text}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <strong>Type:</strong>
                                            <span>{editingPost.post_type}</span>
                                        </div>
                                        <div className="detail-item">
                                            <strong>Category:</strong>
                                            <span>{editingPost.category}</span>
                                        </div>
                                        <div className="detail-item">
                                            <strong>Reading Time:</strong>
                                            <span>{getReadingTimeText(editingPost.reading_time || 0)}</span>
                                        </div>
                                        <div className="detail-item">
                                            <strong>Plagiarism Score:</strong>
                                            <span>{editingPost.plagiarism_score || 0}%</span>
                                        </div>
                                        <div className="detail-item">
                                            <strong>Content Rating:</strong>
                                            <span>{editingPost.content_rating || 'G'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostManagementTab;