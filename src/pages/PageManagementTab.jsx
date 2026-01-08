import React, { useState, useEffect } from 'react';
import { 
    FileText, Plus, Edit, Trash2, Eye, EyeOff, Download, Upload, RefreshCw, Search, 
    Filter, Calendar, Clock, Globe, Lock, Unlock, TrendingUp, BarChart3, 
    FileSpreadsheet, ExternalLink, Copy, Share2, Tag, Folder, Code, 
    CheckCircle, XCircle, AlertTriangle, User, MessageSquare
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const PageManagementTab = () => {
    const [pages, setPages] = useState([]);
    const [filters, setFilters] = useState({
        status: 'all',
        visibility: 'all',
        category: 'all',
        author: '',
        search: '',
        sortBy: 'created_at',
        sortOrder: 'desc'
    });
    
    const [selectedPages, setSelectedPages] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [editingPage, setEditingPage] = useState(null);
    const [analyticsPage, setAnalyticsPage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const { showToast } = useToast();

    // Mock data for pages
    const mockPages = [
        {
            id: 'page_001',
            title: 'About KaruTeens',
            slug: 'about-karuteens',
            excerpt: 'Learn more about our platform and mission',
            featured_image: null,
            meta_title: 'About KaruTeens - Our Story',
            meta_description: 'Discover the story behind KaruTeens platform',
            meta_keywords: ['about', 'karuteens', 'story'],
            status: 'published',
            visibility: 'public',
            author_id: 'admin_001',
            author_name: 'Super Admin',
            category: 'About',
            tags: ['about', 'company'],
            template: 'default',
            redirect_url: null,
            seo_score: 85.5,
            view_count: 1250,
            likes_count: 45,
            comments_count: 12,
            published_at: '2024-01-10T08:30:00Z',
            created_at: '2024-01-09T14:20:00Z',
            updated_at: '2024-01-10T08:30:00Z'
        },
        {
            id: 'page_002',
            title: 'Privacy Policy',
            slug: 'privacy-policy',
            excerpt: 'Our commitment to protecting your privacy',
            featured_image: null,
            meta_title: 'Privacy Policy - KaruTeens',
            meta_description: 'Read our privacy policy to understand how we protect your data',
            meta_keywords: ['privacy', 'policy', 'data protection'],
            status: 'published',
            visibility: 'public',
            author_id: 'admin_002',
            author_name: 'Privacy Officer',
            category: 'Legal',
            tags: ['privacy', 'legal', 'policy'],
            template: 'legal',
            redirect_url: null,
            seo_score: 92.0,
            view_count: 890,
            likes_count: 23,
            comments_count: 5,
            published_at: '2024-01-08T10:15:00Z',
            created_at: '2024-01-07T16:45:00Z',
            updated_at: '2024-01-08T10:15:00Z'
        },
        {
            id: 'page_003',
            title: 'Terms of Service',
            slug: 'terms-of-service',
            excerpt: 'Terms and conditions for using our platform',
            featured_image: null,
            meta_title: 'Terms of Service - KaruTeens',
            meta_description: 'Please read our terms of service before using our platform',
            meta_keywords: ['terms', 'service', 'legal'],
            status: 'published',
            visibility: 'public',
            author_id: 'admin_002',
            author_name: 'Legal Team',
            category: 'Legal',
            tags: ['terms', 'legal', 'service'],
            template: 'legal',
            redirect_url: null,
            seo_score: 88.5,
            view_count: 750,
            likes_count: 18,
            comments_count: 8,
            published_at: '2024-01-05T12:00:00Z',
            created_at: '2024-01-04T09:30:00Z',
            updated_at: '2024-01-05T12:00:00Z'
        },
        {
            id: 'page_004',
            title: 'New Feature Announcement',
            slug: 'new-feature-announcement',
            excerpt: 'Exciting new features coming soon!',
            featured_image: null,
            meta_title: 'New Features - Coming Soon',
            meta_description: 'Stay tuned for our exciting new features',
            meta_keywords: ['features', 'announcement', 'updates'],
            status: 'draft',
            visibility: 'private',
            author_id: 'admin_001',
            author_name: 'Product Team',
            category: 'Announcements',
            tags: ['features', 'announcement'],
            template: 'announcement',
            redirect_url: null,
            seo_score: null,
            view_count: 0,
            likes_count: 0,
            comments_count: 0,
            published_at: null,
            created_at: '2024-01-15T08:00:00Z',
            updated_at: '2024-01-15T08:00:00Z'
        },
        {
            id: 'page_005',
            title: '404 Error Page',
            slug: '404',
            excerpt: 'Page not found - custom error page',
            featured_image: null,
            meta_title: '404 - Page Not Found',
            meta_description: 'The page you are looking for does not exist',
            meta_keywords: ['404', 'error', 'not found'],
            status: 'published',
            visibility: 'hidden',
            author_id: 'admin_003',
            author_name: 'Dev Team',
            category: 'System',
            tags: ['404', 'error', 'system'],
            template: 'error',
            redirect_url: null,
            seo_score: 75.0,
            view_count: 150,
            likes_count: 2,
            comments_count: 0,
            published_at: '2024-01-01T00:00:00Z',
            created_at: '2023-12-31T23:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
        }
    ];

    useEffect(() => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setPages(mockPages);
            setIsLoading(false);
        }, 1000);
    }, [filters]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleBulkAction = () => {
        if (selectedPages.length === 0) {
            showToast('Please select pages first', 'warning');
            return;
        }

        if (bulkAction === 'publish') {
            setPages(prev => prev.map(p => 
                selectedPages.includes(p.id) ? { ...p, status: 'published', published_at: new Date().toISOString() } : p
            ));
            setSelectedPages([]);
            setBulkAction('');
            showToast('Pages published', 'success');
        } else if (bulkAction === 'unpublish') {
            setPages(prev => prev.map(p => 
                selectedPages.includes(p.id) ? { ...p, status: 'draft', published_at: null } : p
            ));
            setSelectedPages([]);
            setBulkAction('');
            showToast('Pages unpublished', 'success');
        } else if (bulkAction === 'make_public') {
            setPages(prev => prev.map(p => 
                selectedPages.includes(p.id) ? { ...p, visibility: 'public' } : p
            ));
            setSelectedPages([]);
            setBulkAction('');
            showToast('Pages made public', 'success');
        } else if (bulkAction === 'make_private') {
            setPages(prev => prev.map(p => 
                selectedPages.includes(p.id) ? { ...p, visibility: 'private' } : p
            ));
            setSelectedPages([]);
            setBulkAction('');
            showToast('Pages made private', 'success');
        } else if (bulkAction === 'delete') {
            if (confirm(`Delete ${selectedPages.length} pages? This action cannot be undone.`)) {
                setPages(prev => prev.filter(p => !selectedPages.includes(p.id)));
                setSelectedPages([]);
                setBulkAction('');
                showToast('Pages deleted', 'success');
            }
        }
    };

    const handlePublishPage = (pageId) => {
        setPages(prev => prev.map(p => 
            p.id === pageId ? { ...p, status: 'published', published_at: new Date().toISOString() } : p
        ));
        showToast('Page published', 'success');
    };

    const handleUnpublishPage = (pageId) => {
        setPages(prev => prev.map(p => 
            p.id === pageId ? { ...p, status: 'draft', published_at: null } : p
        ));
        showToast('Page unpublished', 'success');
    };

    const handleDeletePage = (pageId) => {
        if (confirm('Are you sure you want to delete this page? This action cannot be undone.')) {
            setPages(prev => prev.filter(p => p.id !== pageId));
            showToast('Page deleted', 'success');
        }
    };

    const togglePageSelection = (pageId) => {
        setSelectedPages(prev => 
            prev.includes(pageId) 
                ? prev.filter(id => id !== pageId)
                : [...prev, pageId]
        );
    };

    const selectAllPages = () => {
        if (selectedPages.length === pages.length) {
            setSelectedPages([]);
        } else {
            setSelectedPages(pages.map(p => p.id));
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'published': return { color: 'green', text: 'Published', icon: <CheckCircle size={14} /> };
            case 'draft': return { color: 'orange', text: 'Draft', icon: <Clock size={14} /> };
            case 'archived': return { color: 'red', text: 'Archived', icon: <XCircle size={14} /> };
            default: return { color: 'gray', text: status, icon: <AlertTriangle size={14} /> };
        }
    };

    const getVisibilityBadge = (visibility) => {
        switch (visibility) {
            case 'public': return { color: 'blue', text: 'Public', icon: <Globe size={14} /> };
            case 'private': return { color: 'purple', text: 'Private', icon: <Lock size={14} /> };
            case 'hidden': return { color: 'gray', text: 'Hidden', icon: <EyeOff size={14} /> };
            default: return { color: 'gray', text: visibility, icon: <AlertTriangle size={14} /> };
        }
    };

    return (
        <div className="page-management-tab">
            {/* Header */}
            <div className="tab-header">
                <div className="header-left">
                    <h2>Page Management</h2>
                    <p>Manage static pages, content, and SEO settings</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary">
                        <Upload size={18} />
                        Import Pages
                    </button>
                    <button className="btn-primary">
                        <Download size={18} />
                        Export Pages
                    </button>
                    <button 
                        className="btn-primary"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus size={18} />
                        Add Page
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
                            placeholder="Search pages by title, content, or tags..."
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
                            <option value="draft">Draft</option>
                            <option value="archived">Archived</option>
                        </select>
                        
                        <select 
                            value={filters.visibility}
                            onChange={(e) => handleFilterChange('visibility', e.target.value)}
                        >
                            <option value="all">All Visibility</option>
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                            <option value="hidden">Hidden</option>
                        </select>
                        
                        <select 
                            value={filters.category}
                            onChange={(e) => handleFilterChange('category', e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            <option value="About">About</option>
                            <option value="Legal">Legal</option>
                            <option value="Announcements">Announcements</option>
                            <option value="System">System</option>
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
            {selectedPages.length > 0 && (
                <div className="bulk-actions">
                    <div className="selection-info">
                        {selectedPages.length} pages selected
                    </div>
                    <div className="bulk-actions-controls">
                        <select 
                            value={bulkAction}
                            onChange={(e) => setBulkAction(e.target.value)}
                        >
                            <option value="">Bulk Actions</option>
                            <option value="publish">Publish</option>
                            <option value="unpublish">Unpublish</option>
                            <option value="make_public">Make Public</option>
                            <option value="make_private">Make Private</option>
                            <option value="delete">Delete Pages</option>
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

            {/* Pages Table */}
            <div className="pages-table-container">
                {isLoading ? (
                    <div className="loading-state">
                        <RefreshCw size={32} className="spin-anim" />
                        <p>Loading pages...</p>
                    </div>
                ) : (
                    <>
                        <div className="table-header">
                            <div className="select-all">
                                <input
                                    type="checkbox"
                                    checked={selectedPages.length === pages.length && pages.length > 0}
                                    onChange={selectAllPages}
                                />
                                <span>Select All</span>
                            </div>
                            <div className="table-actions">
                                <span className="page-count">{pages.length} pages found</span>
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
                                                checked={selectedPages.length === pages.length && pages.length > 0}
                                                onChange={selectAllPages}
                                            />
                                        </th>
                                        <th>Page Info</th>
                                        <th>Status & Visibility</th>
                                        <th>SEO Score</th>
                                        <th>Analytics</th>
                                        <th>Author</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pages.map(page => (
                                        <tr key={page.id}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPages.includes(page.id)}
                                                    onChange={() => togglePageSelection(page.id)}
                                                />
                                            </td>
                                            <td>
                                                <div className="page-info">
                                                    <div className="page-title">
                                                        <h4>{page.title}</h4>
                                                        <span className="page-slug">/{page.slug}</span>
                                                    </div>
                                                    <div className="page-excerpt">{page.excerpt}</div>
                                                    <div className="page-meta">
                                                        <span className="category-badge">{page.category}</span>
                                                        {page.tags && page.tags.map(tag => (
                                                            <span key={tag} className="tag-badge">{tag}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="status-info">
                                                    <span className={`status-badge ${getStatusBadge(page.status).color}`}>
                                                        {getStatusBadge(page.status).icon}
                                                        {getStatusBadge(page.status).text}
                                                    </span>
                                                    <span className={`visibility-badge ${getVisibilityBadge(page.visibility).color}`}>
                                                        {getVisibilityBadge(page.visibility).icon}
                                                        {getVisibilityBadge(page.visibility).text}
                                                    </span>
                                                    {page.published_at && (
                                                        <div className="published-date">
                                                            <Calendar size={14} />
                                                            <span>{new Date(page.published_at).toLocaleDateString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="seo-score">
                                                    <div className="score-circle">
                                                        <svg viewBox="0 0 36 36" className="circular-chart">
                                                            <path
                                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                                fill="none"
                                                                stroke="#e9ecef"
                                                                strokeWidth="2"
                                                                strokeDasharray="100, 100"
                                                            />
                                                            <path
                                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                                fill="none"
                                                                stroke="#3498db"
                                                                strokeWidth="2"
                                                                strokeDasharray={`${page.seo_score || 0}, 100`}
                                                                className="circle"
                                                            />
                                                            <text x="18" y="20.5" className="percentage">{Math.round(page.seo_score || 0)}%</text>
                                                        </svg>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="analytics-info">
                                                    <div className="metric">
                                                        <Eye size={14} />
                                                        <span>{page.view_count.toLocaleString()} views</span>
                                                    </div>
                                                    <div className="metric">
                                                        <MessageSquare size={14} />
                                                        <span>{page.comments_count} comments</span>
                                                    </div>
                                                    <div className="metric">
                                                        <User size={14} />
                                                        <span>{page.likes_count} likes</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="author-info">
                                                    <div className="author-name">{page.author_name}</div>
                                                    <div className="author-id">ID: {page.author_id}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="date-info">
                                                    <Calendar size={14} />
                                                    <span>{new Date(page.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button 
                                                        className="action-btn view"
                                                        onClick={() => window.open(`/page/${page.slug}`, '_blank')}
                                                        title="View Page"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </button>
                                                    <button 
                                                        className="action-btn analytics"
                                                        onClick={() => {
                                                            setAnalyticsPage(page);
                                                            setShowAnalyticsModal(true);
                                                        }}
                                                        title="View Analytics"
                                                    >
                                                        <BarChart3 size={16} />
                                                    </button>
                                                    <button 
                                                        className="action-btn edit"
                                                        onClick={() => {
                                                            setEditingPage(page);
                                                            setShowEditModal(true);
                                                        }}
                                                        title="Edit Page"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    {page.status === 'published' ? (
                                                        <button 
                                                            className="action-btn unpublish"
                                                            onClick={() => handleUnpublishPage(page.id)}
                                                            title="Unpublish Page"
                                                        >
                                                            <EyeOff size={16} />
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            className="action-btn publish"
                                                            onClick={() => handlePublishPage(page.id)}
                                                            title="Publish Page"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    )}
                                                    <button 
                                                        className="action-btn delete"
                                                        onClick={() => handleDeletePage(page.id)}
                                                        title="Delete Page"
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

            {/* Add Page Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                        <div className="modal-header">
                            <h3>Add New Page</h3>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Page Title *</label>
                                        <input type="text" className="form-input" placeholder="Enter page title" />
                                    </div>
                                    <div className="form-group">
                                        <label>Slug *</label>
                                        <input type="text" className="form-input" placeholder="auto-generated-from-title" />
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label>Content *</label>
                                    <textarea className="form-input" rows="8" placeholder="Enter page content (supports HTML)"></textarea>
                                </div>
                                
                                <div className="form-group">
                                    <label>Excerpt</label>
                                    <textarea className="form-input" rows="3" placeholder="Enter page excerpt"></textarea>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Category</label>
                                        <select className="form-input">
                                            <option value="">Select category</option>
                                            <option value="About">About</option>
                                            <option value="Legal">Legal</option>
                                            <option value="Announcements">Announcements</option>
                                            <option value="System">System</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Template</label>
                                        <select className="form-input">
                                            <option value="default">Default</option>
                                            <option value="legal">Legal</option>
                                            <option value="announcement">Announcement</option>
                                            <option value="error">Error</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Status</label>
                                        <select className="form-input">
                                            <option value="draft">Draft</option>
                                            <option value="published">Published</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Visibility</label>
                                        <select className="form-input">
                                            <option value="public">Public</option>
                                            <option value="private">Private</option>
                                            <option value="hidden">Hidden</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Tags (comma-separated)</label>
                                    <input type="text" className="form-input" placeholder="tag1, tag2, tag3" />
                                </div>

                                <div className="form-section">
                                    <h4>SEO Settings</h4>
                                    <div className="form-group">
                                        <label>Meta Title</label>
                                        <input type="text" className="form-input" placeholder="Enter meta title" />
                                    </div>
                                    <div className="form-group">
                                        <label>Meta Description</label>
                                        <textarea className="form-input" rows="3" placeholder="Enter meta description"></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label>Meta Keywords</label>
                                        <input type="text" className="form-input" placeholder="keyword1, keyword2, keyword3" />
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Create Page
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Page Modal */}
            {showEditModal && editingPage && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                        <div className="modal-header">
                            <h3>Edit Page: {editingPage.title}</h3>
                            <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Page Title</label>
                                        <input type="text" className="form-input" defaultValue={editingPage.title} />
                                    </div>
                                    <div className="form-group">
                                        <label>Slug</label>
                                        <input type="text" className="form-input" defaultValue={editingPage.slug} />
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label>Content</label>
                                    <textarea className="form-input" rows="8" defaultValue={editingPage.content}></textarea>
                                </div>
                                
                                <div className="form-group">
                                    <label>Excerpt</label>
                                    <textarea className="form-input" rows="3" defaultValue={editingPage.excerpt || ''}></textarea>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Category</label>
                                        <select className="form-input" defaultValue={editingPage.category}>
                                            <option value="About">About</option>
                                            <option value="Legal">Legal</option>
                                            <option value="Announcements">Announcements</option>
                                            <option value="System">System</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Template</label>
                                        <select className="form-input" defaultValue={editingPage.template}>
                                            <option value="default">Default</option>
                                            <option value="legal">Legal</option>
                                            <option value="announcement">Announcement</option>
                                            <option value="error">Error</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Status</label>
                                        <select className="form-input" defaultValue={editingPage.status}>
                                            <option value="draft">Draft</option>
                                            <option value="published">Published</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Visibility</label>
                                        <select className="form-input" defaultValue={editingPage.visibility}>
                                            <option value="public">Public</option>
                                            <option value="private">Private</option>
                                            <option value="hidden">Hidden</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Tags</label>
                                    <input type="text" className="form-input" defaultValue={editingPage.tags?.join(', ') || ''} />
                                </div>

                                <div className="form-section">
                                    <h4>SEO Settings</h4>
                                    <div className="form-group">
                                        <label>Meta Title</label>
                                        <input type="text" className="form-input" defaultValue={editingPage.meta_title || ''} />
                                    </div>
                                    <div className="form-group">
                                        <label>Meta Description</label>
                                        <textarea className="form-input" rows="3" defaultValue={editingPage.meta_description || ''}></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label>Meta Keywords</label>
                                        <input type="text" className="form-input" defaultValue={editingPage.meta_keywords?.join(', ') || ''} />
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Update Page
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics Modal */}
            {showAnalyticsModal && analyticsPage && (
                <div className="modal-overlay" onClick={() => setShowAnalyticsModal(false)}>
                    <div className="modal-content analytics-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
                        <div className="modal-header">
                            <h3>Analytics: {analyticsPage.title}</h3>
                            <button className="close-btn" onClick={() => setShowAnalyticsModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="analytics-grid">
                                <div className="analytics-card">
                                    <h4>Total Views</h4>
                                    <div className="metric-value">{analyticsPage.view_count.toLocaleString()}</div>
                                    <div className="metric-change">+12.5% from last week</div>
                                </div>
                                <div className="analytics-card">
                                    <h4>Unique Visitors</h4>
                                    <div className="metric-value">892</div>
                                    <div className="metric-change">+8.3% from last week</div>
                                </div>
                                <div className="analytics-card">
                                    <h4>Avg. Time on Page</h4>
                                    <div className="metric-value">2m 35s</div>
                                    <div className="metric-change">+15.2% from last week</div>
                                </div>
                                <div className="analytics-card">
                                    <h4>Bounce Rate</h4>
                                    <div className="metric-value">42.3%</div>
                                    <div className="metric-change">-3.1% from last week</div>
                                </div>
                            </div>
                            
                            <div className="analytics-chart">
                                <h4>Page Views (Last 30 Days)</h4>
                                <div className="chart-placeholder">
                                    <p>Chart visualization would go here</p>
                                </div>
                            </div>

                            <div className="analytics-details">
                                <div className="analytics-section">
                                    <h4>Top Referrers</h4>
                                    <div className="referrers-list">
                                        <div className="referrer-item">
                                            <span className="referrer-name">Direct Traffic</span>
                                            <span className="referrer-count">1,234 views</span>
                                        </div>
                                        <div className="referrer-item">
                                            <span className="referrer-name">Google Search</span>
                                            <span className="referrer-count">890 views</span>
                                        </div>
                                        <div className="referrer-item">
                                            <span className="referrer-name">Facebook</span>
                                            <span className="referrer-count">456 views</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="analytics-section">
                                    <h4>Traffic by Hour</h4>
                                    <div className="hourly-traffic">
                                        <p>Hourly traffic visualization would go here</p>
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

export default PageManagementTab;