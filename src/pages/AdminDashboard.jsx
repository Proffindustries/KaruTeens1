import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
    Users,
    FileText,
    DollarSign,
    Activity,
    Settings,
    LogOut,
    Shield,
    Calendar,
    MessageCircle,
    Image,
    AlertTriangle,
    BarChart3,
    FileSpreadsheet,
    Video,
    Search,
    Bell,
    Menu,
    RefreshCw,
    Sun,
    Moon,
    UserCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import '../styles/AdminDashboard.css';

// Import management tabs
import UserManagementTab from './UserManagementTab';
import PostManagementTab from './PostManagementTab';
import CommentManagementTab from './CommentManagementTab';
import EventManagementTab from './EventManagementTab';
import GroupManagementTab from './GroupManagementTab';
import AdManagementTab from './AdManagementTab';
import ReelManagementTab from './ReelManagementTab';
import RevisionManagementTab from './RevisionManagementTab';
import ContentModerationTab from './ContentModerationTab';
import MediaManagementTab from './MediaManagementTab';
import AnalyticsTab from './AnalyticsTab';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { showToast } = useToast();
    const [stats, setStats] = useState({
        total_users: 0,
        active_users: 0,
        total_posts: 0,
        total_reports: 0,
        total_revenue: 0,
        growth_rate: 0,
    });

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/stats');
            return data;
        } catch (error) {
            console.error('Failed to fetch stats');
            return null;
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            const stats = await fetchStats();
            if (mounted && stats) setStats((prev) => ({ ...prev, ...stats }));
        };
        load();
        return () => {
            mounted = false;
        };
    }, [fetchStats]);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'posts', label: 'Post Management', icon: FileText },
        { id: 'comments', label: 'Comment Management', icon: MessageCircle },
        { id: 'moderation', label: 'Moderation', icon: Shield },
        { id: 'groups', label: 'Groups', icon: Users },
        { id: 'events', label: 'Events', icon: Calendar },
        { id: 'ads', label: 'Ad Management', icon: DollarSign },
        { id: 'broadcast', label: 'System Broadcast', icon: Bell },
        { id: 'videos', label: 'Videos & Reels', icon: Video },
        { id: 'media', label: 'Media Library', icon: Image },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'settings', label: 'System Settings', icon: Settings },
    ];

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    return (
        <div className={`admin-container ${isDarkMode ? 'dark' : ''}`}>
            {/* Sidebar */}
            <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <div className="admin-brand">
                    <div className="logo-icon">
                        <Shield size={20} color="white" />
                    </div>
                    <h2>KaruTeens Admin</h2>
                    <span className="admin-role-badge">Admin</span>
                </div>

                <nav className="admin-nav">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon size={20} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="admin-logout">
                    <button className="logout-btn" onClick={() => (window.location.href = '/')}>
                        <LogOut size={20} />
                        <span>Exit Dashboard</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <header className="admin-header">
                    <div className="header-left">
                        <button className="sidebar-toggle" onClick={toggleSidebar}>
                            <Menu size={20} />
                        </button>
                        <h1>{tabs.find((t) => t.id === activeTab)?.label}</h1>
                    </div>

                    <div className="header-actions">
                        <div className="admin-search">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search everything..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="theme-toggle" onClick={toggleTheme}>
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <div className="admin-profile-mini">
                            <div className="avatar-placeholder">A</div>
                        </div>
                    </div>
                </header>

                <div className="admin-content">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <TabContent 
                                activeTab={activeTab} 
                                stats={stats} 
                                setActiveTab={setActiveTab} 
                            />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

const TabContent = ({ activeTab, stats, setActiveTab }) => {
    switch (activeTab) {
        case 'overview':
            return <OverviewTab stats={stats} setActiveTab={setActiveTab} />;
        case 'users':
            return <UserManagementTab />;
        case 'posts':
            return <PostManagementTab />;
        case 'comments':
            return <CommentManagementTab />;
        case 'moderation':
            return <ContentModerationTab stats={stats} />;
        case 'analytics':
            return <AnalyticsTab />;
        case 'academic':
            return <RevisionManagementTab />;
        case 'groups':
            return <GroupManagementTab />;
        case 'events':
            return <EventManagementTab />;
        case 'ads':
            return <AdManagementTab />;
        case 'broadcast':
            return <BroadcastTab />;
        case 'videos':
            return <ReelManagementTab />;
        case 'media':
            return <MediaManagementTab />;
        case 'revision':
            return <RevisionManagementTab />;
        case 'settings':
            return <SettingsTab />;
        default:
            return <OverviewTab stats={stats} />;
    }
};

const OverviewTab = ({ stats, setActiveTab }) => (
    <div className="overview-tab">
        <div className="stats-grid">
            <StatCard
                label="Total Users"
                value={stats.total_users.toLocaleString()}
                icon={Users}
                trend={`${stats.growth_rate >= 0 ? '+' : ''}${stats.growth_rate.toFixed(1)}%`}
                color="#4f46e5"
            />
            <StatCard
                label="Active Today"
                value={stats.active_users?.toLocaleString() || '0'}
                icon={Activity}
                trend="Realtime"
                color="#10b981"
            />
            <StatCard
                label="Total Posts"
                value={stats.total_posts.toLocaleString()}
                icon={FileText}
                trend="Total"
                color="#f59e0b"
            />
            <StatCard
                label="Pending Reports"
                value={stats.total_reports}
                icon={Shield}
                trend="Action Required"
                color="#ef4444"
            />
        </div>

        <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="action-grid">
                <button className="action-card" onClick={() => setActiveTab('users')}>
                    <div className="action-icon">
                        <UserCheck size={24} />
                    </div>
                    <span>Verify Users</span>
                </button>
                <button className="action-card" onClick={() => setActiveTab('moderation')}>
                    <div className="action-icon">
                        <AlertTriangle size={24} />
                    </div>
                    <span>Review Reports</span>
                </button>
                <button className="action-card" onClick={() => setActiveTab('broadcast')}>
                    <div className="action-icon">
                        <Bell size={24} />
                    </div>
                    <span>Send Broadcast</span>
                </button>
                <button className="action-card" onClick={() => setActiveTab('ads')}>
                    <div className="action-icon">
                        <DollarSign size={24} />
                    </div>
                    <span>Manage Ads</span>
                </button>
            </div>
        </div>
    </div>
);

const StatCard = ({ label, value, icon: Icon, trend, color }) => (
    <div className="stat-card">
        <div className="stat-header">
            <div className="stat-icon" style={{ background: `${color}15`, color: color }}>
                <Icon size={20} />
            </div>
            <span className={`stat-trend ${trend.startsWith('+') ? 'trend-up' : 'trend-down'}`}>
                {trend}
            </span>
        </div>
        <div className="stat-info">
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
        </div>
    </div>
);

const BroadcastTab = () => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { showToast } = useToast();

    const handleBroadcast = async () => {
        if (!message.trim()) {
            showToast('Please enter a message', 'error');
            return;
        }

        if (!window.confirm('Are you sure you want to send this message to ALL users?')) {
            return;
        }

        setIsSending(true);
        try {
            await api.post('/admin/broadcast', { content: message });
            showToast('Broadcast sent successfully!', 'success');
            setMessage('');
        } catch (error) {
            showToast('Failed to send broadcast', 'error');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="broadcast-tab">
            <div className="tab-header">
                <h2>System Broadcast</h2>
                <p>Send a global announcement to all users' inboxes</p>
            </div>

            <div
                className="content-card"
                style={{
                    background: 'var(--admin-card-bg)',
                    padding: '2rem',
                    borderRadius: 'var(--admin-radius)',
                    border: '1px solid var(--admin-border)',
                    maxWidth: '800px',
                }}
            >
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600' }}>
                        Message Content
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your system announcement here..."
                        rows="8"
                        style={{
                            width: '100%',
                            padding: '1rem',
                            borderRadius: '12px',
                            border: '1px solid var(--admin-border)',
                            background: 'var(--admin-bg)',
                            color: 'var(--admin-text-main)',
                            fontSize: '1rem',
                            resize: 'vertical',
                        }}
                    />
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        className="btn-primary"
                        onClick={handleBroadcast}
                        disabled={isSending}
                        style={{
                            background: 'var(--admin-primary)',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                        }}
                    >
                        {isSending ? <RefreshCw className="spin-anim" /> : <Bell size={18} />}
                        {isSending ? 'Sending...' : 'Broadcast to All Users'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SettingsTab = () => {
    const [settings, setSettings] = useState({
        is_payment_enabled: true,
        maintenance_mode: false,
        allow_new_registrations: true,
    });
    const [isLoading, setIsLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await api.get('/admin/settings');
                setSettings(data);
            } catch (error) {
                showToast('Failed to load settings', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, [showToast]);

    const handleToggle = async (key) => {
        const newValue = !settings[key];
        try {
            await api.put('/admin/settings', { [key]: newValue });
            setSettings({ ...settings, [key]: newValue });
            showToast('Settings updated', 'success');
        } catch (error) {
            showToast('Failed to update settings', 'error');
        }
    };

    const handleClearCache = async () => {
        if (!window.confirm('Are you sure? This will flush all Redis data.')) return;
        try {
            await api.post('/admin/cache/clear');
            showToast('System cache cleared successfully', 'success');
        } catch (error) {
            showToast('Failed to clear cache', 'error');
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading settings...</div>;

    return (
        <div className="settings-tab">
            <div className="tab-header">
                <h2>System Settings</h2>
                <p>Global platform configuration and controls</p>
            </div>
            <div
                className="card-grid"
                style={{
                    display: 'grid',
                    gap: '1.5rem',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                    marginTop: '2rem',
                }}
            >
                <div
                    className="settings-card"
                    style={{
                        background: 'var(--admin-card-bg)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid var(--admin-border)',
                    }}
                >
                    <h3
                        style={{
                            fontSize: '1rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <Shield size={18} /> Platform Security & Access
                    </h3>

                    <div
                        className="setting-row"
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '1rem 0',
                            borderBottom: '1px solid var(--admin-border)',
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: '600' }}>Maintenance Mode</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                                Disable all public access to the platform
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.maintenance_mode}
                            onChange={() => handleToggle('maintenance_mode')}
                        />
                    </div>

                    <div
                        className="setting-row"
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '1rem 0',
                            borderBottom: '1px solid var(--admin-border)',
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: '600' }}>New Registrations</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                                Allow new users to sign up
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.allow_new_registrations}
                            onChange={() => handleToggle('allow_new_registrations')}
                        />
                    </div>

                    <div
                        className="setting-row"
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '1rem 0',
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: '600' }}>Enable Payments</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                                Toggle all payment-related features
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.is_payment_enabled}
                            onChange={() => handleToggle('is_payment_enabled')}
                        />
                    </div>
                </div>

                <div
                    className="settings-card"
                    style={{
                        background: 'var(--admin-card-bg)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid var(--admin-border)',
                    }}
                >
                    <h3
                        style={{
                            fontSize: '1rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <RefreshCw size={18} /> System Information
                    </h3>
                    <div style={{ fontSize: '0.9rem' }}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '0.75rem',
                            }}
                        >
                            <span style={{ color: 'var(--admin-text-muted)' }}>
                                Backend Version
                            </span>
                            <span style={{ fontWeight: '600' }}>1.2.0-stable</span>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '0.75rem',
                            }}
                        >
                            <span style={{ color: 'var(--admin-text-muted)' }}>Frontend Build</span>
                            <span style={{ fontWeight: '600' }}>20240501.1</span>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '0.75rem',
                            }}
                        >
                            <span style={{ color: 'var(--admin-text-muted)' }}>
                                Database Status
                            </span>
                            <span style={{ color: '#10b981', fontWeight: '600' }}>Connected</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--admin-text-muted)' }}>Storage Usage</span>
                            <span style={{ fontWeight: '600' }}>42.5 GB / 500 GB</span>
                        </div>
                    </div>
                    <button
                        className="btn-secondary"
                        style={{ width: '100%', marginTop: '1.5rem' }}
                        onClick={handleClearCache}
                    >
                        Clear System Cache
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
