import React, { useState, useEffect } from 'react';
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
import UserManagementTab from './UserManagementTab';
import ContentModerationTab from './ContentModerationTab';
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
                    {activeTab === 'overview' && <OverviewTab />}
                    {activeTab === 'users' && <UserManagementTab />}
                    {activeTab === 'content' && <ContentModerationTab />}
                    {activeTab === 'groups' && <GroupManagementTab />}
                    {activeTab === 'pages' && <PageManagementTab />}
                    {activeTab === 'events' && <EventManagementTab />}
                    {activeTab === 'posts' && <PostManagementTab />}
                    {activeTab === 'comments' && <CommentManagementTab />}
                    {activeTab === 'stories' && <StoryManagementTab />}
                    {activeTab === 'reels' && <ReelManagementTab />}
                    {activeTab === 'ads' && <AdManagementTab />}
                    {activeTab === 'videos' && <VideoManagementTab />}
                    {activeTab === 'media' && <MediaManagementTab />}
                    {activeTab === 'analytics' && <AnalyticsTab />}
                    {activeTab === 'reports' && <ReportsTab />}
                    {activeTab === 'moderation' && <ModerationTab />}
                    {activeTab === 'settings' && <SettingsTab />}
                    {activeTab === 'logs' && <SystemLogsTab />}
                    {activeTab === 'activity' && <UserActivityTab />}
                    {activeTab === 'security' && <SecurityTab />}
                    {activeTab === 'abuse' && <AbuseDetectionTab />}
                    {activeTab === 'hashtags' && <HashtagViralityTab />}
                </div>
            </main>
        </div>
    );
};

// Overview Tab Component
const OverviewTab = () => {
    const stats = [
        { label: "Total Users", value: "12,450", icon: Users, change: "+12%", color: "#3498db" },
        { label: "Active Users", value: "8,230", icon: Activity, change: "+8%", color: "#2ecc71" },
        { label: "Total Posts", value: "45,200", icon: FileText, change: "+5%", color: "#9b59b6" },
        { label: "Revenue", value: "Ksh 850k", icon: DollarSign, change: "+18%", color: "#f1c40f" },
        { label: "Groups", value: "156", icon: Users, change: "+3%", color: "#e74c3c" },
        { label: "Events", value: "89", icon: Calendar, change: "+15%", color: "#34495e" },
        { label: "Stories", value: "2,150", icon: Eye, change: "+25%", color: "#95a5a6" },
        { label: "Reports", value: "23", icon: FileSpreadsheet, change: "-10%", color: "#f39c12" }
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
const GroupManagementTab = () => <div className="tab-content">Group Management Interface</div>;
const PageManagementTab = () => <div className="tab-content">Page Management Interface</div>;
const EventManagementTab = () => <div className="tab-content">Event Management Interface</div>;
const PostManagementTab = () => <div className="tab-content">Post Management Interface</div>;
const CommentManagementTab = () => <div className="tab-content">Comment Management Interface</div>;
const StoryManagementTab = () => <div className="tab-content">Story Management Interface</div>;
const ReelManagementTab = () => <div className="tab-content">Reel Management Interface</div>;
const AdManagementTab = () => <div className="tab-content">Ad Management Interface</div>;
const VideoManagementTab = () => <div className="tab-content">Video Management Interface</div>;
const MediaManagementTab = () => <div className="tab-content">Media Management Interface</div>;
const AnalyticsTab = () => <div className="tab-content">Analytics Dashboard</div>;
const ReportsTab = () => <div className="tab-content">Reports Interface</div>;
const ModerationTab = () => <div className="tab-content">Moderation Tools</div>;
const SettingsTab = () => <div className="tab-content">Settings Interface</div>;
const SystemLogsTab = () => <div className="tab-content">System Logs Interface</div>;
const UserActivityTab = () => <div className="tab-content">User Activity Interface</div>;
const SecurityTab = () => <div className="tab-content">Security Interface</div>;
const AbuseDetectionTab = () => <div className="tab-content">Abuse Detection Interface</div>;
const HashtagViralityTab = () => <div className="tab-content">Hashtag Virality Interface</div>;

export default AdminDashboard;
