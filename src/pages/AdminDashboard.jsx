import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
    Users, FileText, DollarSign, Activity, Settings, LogOut, TrendingUp,
    Shield, Calendar, MessageSquare, Eye, EyeOff, Video, Image,
    BarChart3, FileSpreadsheet, AlertTriangle, Globe,
    Hash, Filter, Search, RefreshCw, Download, Upload,
    Plus, Edit, Trash2, Clock, CheckCircle, XCircle,
    UserCheck, UserX, ShieldCheck, AlertCircle
} from 'lucide-react';
import '../styles/AdminDashboard.css';
import '../styles/UserManagementTab.css';
import '../styles/ContentModerationTab.css';
import '../styles/GroupManagementTab.css';
import '../styles/PageManagementTab.css';
import '../styles/EventManagementTab.css';
import '../styles/PostManagementTab.css';
import '../styles/CommentManagementTab.css';
import '../styles/StoryManagementTab.css';
import '../styles/ReelManagementTab.css';
import '../styles/AdManagementTab.css';
import '../styles/VideoManagementTab.css';
import '../styles/MediaManagementTab.css';
import UserManagementTab from './UserManagementTab';
import ContentModerationTab from './ContentModerationTab';
import GroupManagementTab from './GroupManagementTab';
import PageManagementTab from './PageManagementTab';
import EventManagementTab from './EventManagementTab';
import PostManagementTab from './PostManagementTab';
import CommentManagementTab from './CommentManagementTab';
import StoryManagementTab from './StoryManagementTab';
import ReelManagementTab from './ReelManagementTab';
import AdManagementTab from './AdManagementTab';
import VideoManagementTab from './VideoManagementTab';
import MediaManagementTab from './MediaManagementTab';
import { useToast } from '../context/ToastContext';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Check admin access
    if (user.role !== 'admin' && user.role !== 'superadmin') {
        return (
            <div className="admin-container unauthorized">
                <div className="unauthorized-content">
                    <Shield size={64} color="#ff6348" />
                    <h2>Access Denied</h2>
                    <p>You do not have permission to access this page.</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'content', label: 'Content Moderation', icon: FileText },
        { id: 'groups', label: 'Group Management', icon: Users },
        { id: 'pages', label: 'Page Management', icon: FileText },
        { id: 'events', label: 'Event Management', icon: Calendar },
        { id: 'posts', label: 'Post Management', icon: FileText },
        { id: 'comments', label: 'Comment Management', icon: MessageSquare },
        { id: 'stories', label: 'Story Management', icon: Eye },
        { id: 'reels', label: 'Reel Management', icon: Video },
        { id: 'ads', label: 'Ad Management', icon: DollarSign },
        { id: 'videos', label: 'Video Management', icon: Video },
        { id: 'media', label: 'Media Management', icon: Image },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
        { id: 'moderation', label: 'Moderation', icon: Shield },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'logs', label: 'System Logs', icon: Activity },
        { id: 'activity', label: 'User Activity', icon: Activity },
        { id: 'security', label: 'Security', icon: ShieldCheck },
        { id: 'abuse', label: 'Abuse Detection', icon: AlertTriangle },
        { id: 'hashtags', label: 'Hashtag Virality', icon: Hash }
    ];

    return (
        <div className="admin-container">
            {/* Sidebar */}
            <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="admin-brand">
                    <Shield size={28} />
                    <div>
                        <h2>Karu Admin</h2>
                        <span className="admin-role">{user.role === 'superadmin' ? 'Super Admin' : 'Admin'}</span>
                    </div>
                </div>

                <nav className="admin-nav">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <Icon size={20} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="admin-logout">
                    <button className="logout-btn">
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <header className="admin-header">
                    <div className="header-left">
                        <button
                            className="sidebar-toggle"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            <Filter size={24} />
                        </button>
                        <h1>{tabs.find(t => t.id === activeTab)?.label}</h1>
                    </div>
                    <div className="header-actions">
                        <button className="action-btn">
                            <RefreshCw size={20} />
                            Refresh
                        </button>
                        <button className="action-btn">
                            <Download size={20} />
                            Export
                        </button>
                    </div>
                </header>

                <div className="admin-content">
                    {renderTabContent()}
                </div>
            </main>
        </div>
    );
};

// Overview Tab Component
const OverviewTab = () => {
    const [statsData, setStatsData] = useState({
        total_users: 0,
        active_users: 0,
        total_posts: 0,
        total_revenue: 0,
        total_groups: 0,
        total_events: 0,
        total_stories: 0,
        total_reports: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await api.get('/admin/stats');
                setStatsData(data);
            } catch (error) {
                console.error("Failed to fetch admin stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const stats = [
        { label: "Total Users", value: statsData.total_users?.toLocaleString() || "0", icon: Users, change: "+0%", color: "#3498db" },
        { label: "Active Users", value: statsData.active_users?.toLocaleString() || "0", icon: Activity, change: "+0%", color: "#2ecc71" },
        { label: "Total Posts", value: statsData.total_posts?.toLocaleString() || "0", icon: FileText, change: "+0%", color: "#9b59b6" },
        { label: "Revenue", value: `Ksh ${statsData.total_revenue?.toLocaleString() || "0"}`, icon: DollarSign, change: "+0%", color: "#f1c40f" },
        { label: "Groups", value: statsData.total_groups?.toLocaleString() || "0", icon: Users, change: "+0%", color: "#e74c3c" },
        { label: "Events", value: statsData.total_events?.toLocaleString() || "0", icon: Calendar, change: "+0%", color: "#34495e" },
        { label: "Stories", value: statsData.total_stories?.toLocaleString() || "0", icon: Eye, change: "+0%", color: "#95a5a6" },
        { label: "Reports", value: statsData.total_reports?.toLocaleString() || "0", icon: FileSpreadsheet, change: "+0%", color: "#f39c12" }
    ];

    return (
        <div className="overview-tab">
            <div className="stats-grid">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="stat-card" style={{ borderLeft: `4px solid ${stat.color}` }}>
                            <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
                                <Icon size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-label">{stat.label}</span>
                                <h3 className="stat-value">{stat.value}</h3>
                                <span className="stat-change" style={{ color: stat.color }}>
                                    <TrendingUp size={14} /> {stat.change}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="quick-actions">
                <h3>Quick Actions</h3>
                <div className="action-grid">
                    <button className="action-card">
                        <Users size={24} />
                        <span>Manage Users</span>
                    </button>
                    <button className="action-card">
                        <FileText size={24} />
                        <span>Moderate Content</span>
                    </button>
                    <button className="action-card">
                        <Shield size={24} />
                        <span>Security Logs</span>
                    </button>
                    <button className="action-card">
                        <BarChart3 size={24} />
                        <span>View Analytics</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// Placeholder components for other tabs
// UserManagementTab is now imported from './UserManagementTab'
// ContentModerationTab is now imported from './ContentModerationTab'
// GroupManagementTab is now imported from './GroupManagementTab'
// PageManagementTab is now imported from './PageManagementTab'
// EventManagementTab is now imported from './EventManagementTab'
// PostManagementTab is now imported from './PostManagementTab'
// CommentManagementTab is now imported from './CommentManagementTab'
// StoryManagementTab is now imported from './StoryManagementTab'
// ReelManagementTab is now imported from './ReelManagementTab'
// Tab content switch
const renderTabContent = () => {
    switch (activeTab) {
        case 'overview':
            return <OverviewTab />;
        case 'users':
            return <UserManagementTab />;
        case 'content':
            return <ContentModerationTab />;
        case 'groups':
            return <GroupManagementTab />;
        case 'pages':
            return <PageManagementTab />;
        case 'events':
            return <EventManagementTab />;
        case 'posts':
            return <PostManagementTab />;
        case 'comments':
            return <CommentManagementTab />;
        case 'stories':
            return <StoryManagementTab />;
        case 'reels':
            return <ReelManagementTab />;
        case 'ads':
            return <AdManagementTab />;
        case 'videos':
            return <VideoManagementTab />;
        case 'media':
            return <MediaManagementTab />;
        case 'analytics':
            return <div className="tab-content">Analytics Dashboard</div>;
        case 'reports':
            return <div className="tab-content">Reports Interface</div>;
        case 'moderation':
            return <div className="tab-content">Moderation Tools</div>;
        case 'settings':
            return <div className="tab-content">Settings Interface</div>;
        case 'logs':
            return <div className="tab-content">System Logs Interface</div>;
        case 'activity':
            return <div className="tab-content">User Activity Interface</div>;
        case 'security':
            return <div className="tab-content">Security Interface</div>;
        case 'abuse':
            return <div className="tab-content">Abuse Detection Interface</div>;
        case 'hashtags':
            return <div className="tab-content">Hashtag Virality Interface</div>;
        default:
            return <OverviewTab />;
    }
};

export default AdminDashboard;
