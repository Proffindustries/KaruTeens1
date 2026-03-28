import React, { useState, useEffect } from 'react';
import {
    User,
    Lock,
    Bell,
    Moon,
    Sun,
    LogOut,
    Save,
    Shield,
    Smartphone,
    Mail,
    Globe,
    ChevronRight,
    CreditCard,
    HelpCircle,
    Download,
    Trash2,
    EyeOff,
    AlertTriangle,
    Palette,
    Type,
    Maximize,
    Monitor,
    Check,
    RefreshCw,
    Layout,
} from 'lucide-react';
import { useAuth, useLogout, useUpdateProfile, useToggle2FA } from '../hooks/useAuth';
import '../styles/SettingsPage.css';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext.jsx';

const SettingsPage = () => {
    const { user } = useAuth();
    const logout = useLogout();
    const updateProfile = useUpdateProfile();
    const toggle2FA = useToggle2FA();
    const { showToast } = useToast();
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('account');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [exportingData, setExportingData] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState([]);

    // Account State
    const [profileData, setProfileData] = useState({
        full_name: '',
        bio: '',
        school: '',
        year_of_study: 1,
        age: 18,
        gender: '',
    });

    // Appearance State
    const [appearanceSettings, setAppearanceSettings] = useState({
        theme: 'dark',
        fontSize: 'medium',
        compactMode: false,
        showBorders: true,
    });
    const fontSizes = [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
    ];

    // Password State
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });

    // Fetch profile on mount
    useEffect(() => {
        if (user?.username) {
            fetchProfile();
        }
        if (activeTab === 'security') {
            fetchSessions();
        }
    }, [user, activeTab]);

    const fetchSessions = async () => {
        setLoadingSessions(true);
        try {
            const { data } = await api.get('/users/sessions');
            setSessions(data);
        } catch (err) {
            console.error('Error fetching sessions', err);
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleRevokeSession = async (sessionId) => {
        if (!confirm('Are you sure you want to log out from this device?')) return;
        try {
            await api.delete(`/users/sessions/${sessionId}`);
            setSessions(sessions.filter((s) => s.id !== sessionId));
        } catch (err) {
            console.error('Error revoking session', err);
        }
    };

    const fetchProfile = async () => {
        try {
            const res = await api.get(`/users/${user.username}`);
            setProfileData({
                full_name: res.data.full_name || '',
                bio: res.data.bio || '',
                school: res.data.school || '',
                year_of_study: res.data.year_of_study || 1,
                age: res.data.age || 18,
                gender: res.data.gender || '',
            });
        } catch (err) {
            console.error('Error fetching profile', err);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await updateProfile.mutateAsync(profileData);
        } catch (err) {
            // Error managed by hook toast
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            return setMessage({ type: 'error', text: 'Passwords do not match' });
        }
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            await api.post('/auth/change-password', {
                current_password: passwordData.current_password,
                new_password: passwordData.new_password,
            });
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.response?.data?.error || 'Failed to change password',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleExportData = async () => {
        setExportingData(true);
        try {
            const response = await api.get('/users/export-data', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute(
                'download',
                `karuteens-data-${new Date().toISOString().slice(0, 10)}.zip`,
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            showToast('Your data is being prepared for download', 'success');
        } catch (err) {
            showToast('Failed to export data', 'error');
        } finally {
            setExportingData(false);
        }
    };

    const handleDeleteAccount = async () => {
        const reason = prompt('Please enter a reason for leaving (optional):');
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone.'))
            return;

        setDeletingAccount(true);
        try {
            await api.post('/users/delete-account', { reason });
            showToast(
                'Account deletion requested. You will receive an email confirmation.',
                'info',
            );
            logout();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to delete account', 'error');
        } finally {
            setDeletingAccount(false);
        }
    };

    const fetchBlockedUsers = async () => {
        try {
            const { data } = await api.get('/users/blocked');
            setBlockedUsers(data);
        } catch (err) {
            console.error('Error fetching blocked users', err);
        }
    };

    const handleUnblockUser = async (userId) => {
        try {
            await api.delete(`/users/blocked/${userId}`);
            setBlockedUsers(blockedUsers.filter((u) => u.id !== userId));
            showToast('User unblocked', 'success');
        } catch (err) {
            showToast('Failed to unblock user', 'error');
        }
    };

    const tabs = [
        { id: 'account', icon: <User size={20} />, label: 'Account' },
        { id: 'security', icon: <Lock size={20} />, label: 'Security' },
        { id: 'privacy', icon: <EyeOff size={20} />, label: 'Privacy' },
        { id: 'notifications', icon: <Bell size={20} />, label: 'Notifications' },
        { id: 'appearance', icon: <Palette size={20} />, label: 'Appearance' },
        { id: 'display', icon: <Monitor size={20} />, label: 'Display' },
        { id: 'data', icon: <Download size={20} />, label: 'Data' },
    ];

    return (
        <div className="container settings-page">
            <div className="settings-header">
                <h1>Settings</h1>
                {message.text && (
                    <div
                        className={`alert alert-${message.type}`}
                        style={{ padding: '0.8rem', borderRadius: '10px', marginTop: '1rem' }}
                    >
                        {message.text}
                    </div>
                )}
            </div>

            <div className="settings-container">
                <div className="settings-sidebar">
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </div>
                    ))}
                    <div className="sidebar-item logout" onClick={logout}>
                        <LogOut size={20} />
                        <span>Log Out</span>
                    </div>
                </div>

                <div className="settings-content">
                    {activeTab === 'account' && (
                        <div className="settings-section">
                            <h2 className="section-title">Personal Information</h2>
                            <p className="section-desc">
                                Update your profile details and campus information.
                            </p>

                            <form className="settings-form" onSubmit={handleUpdateProfile}>
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        value={profileData.full_name}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                full_name: e.target.value,
                                            })
                                        }
                                        placeholder="Enter your full name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>School / Faculty</label>
                                    <input
                                        type="text"
                                        value={profileData.school}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                school: e.target.value,
                                            })
                                        }
                                        placeholder="e.g. Science & Information Tech"
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Year of Study</label>
                                        <select
                                            value={profileData.year_of_study}
                                            onChange={(e) =>
                                                setProfileData({
                                                    ...profileData,
                                                    year_of_study: parseInt(e.target.value),
                                                })
                                            }
                                        >
                                            {[1, 2, 3, 4, 5, 6].map((year) => (
                                                <option key={year} value={year}>
                                                    Year {year}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Age</label>
                                        <input
                                            type="number"
                                            value={profileData.age}
                                            onChange={(e) =>
                                                setProfileData({
                                                    ...profileData,
                                                    age: parseInt(e.target.value),
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Bio</label>
                                    <textarea
                                        rows="4"
                                        value={profileData.bio}
                                        onChange={(e) =>
                                            setProfileData({ ...profileData, bio: e.target.value })
                                        }
                                        placeholder="Tell us a bit about yourself..."
                                    ></textarea>
                                </div>
                                <div className="settings-actions">
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={updateProfile.isPending}
                                    >
                                        <Save size={18} style={{ marginRight: '8px' }} />
                                        {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="settings-section">
                            <h2 className="section-title">Security Settings</h2>
                            <p className="section-desc">
                                Manage your password and account security preferences.
                            </p>

                            <form className="settings-form" onSubmit={handleChangePassword}>
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.current_password}
                                        onChange={(e) =>
                                            setPasswordData({
                                                ...passwordData,
                                                current_password: e.target.value,
                                            })
                                        }
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.new_password}
                                        onChange={(e) =>
                                            setPasswordData({
                                                ...passwordData,
                                                new_password: e.target.value,
                                            })
                                        }
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.confirm_password}
                                        onChange={(e) =>
                                            setPasswordData({
                                                ...passwordData,
                                                confirm_password: e.target.value,
                                            })
                                        }
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <div className="settings-actions">
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loading}
                                    >
                                        <Shield size={18} style={{ marginRight: '8px' }} />
                                        {loading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>

                            <div
                                style={{
                                    marginTop: '3rem',
                                    borderTop: '1px solid rgb(var(--card-border))',
                                    paddingTop: '2rem',
                                }}
                            >
                                <h4 style={{ marginBottom: '1rem' }}>Two-Factor Authentication</h4>
                                <div className="toggle-group">
                                    <div className="toggle-info">
                                        <h4>Email Verification</h4>
                                        <p>Receive a code whenever you log in.</p>
                                    </div>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={user?.is_2fa_enabled}
                                            onChange={() => toggle2FA.mutate()}
                                            disabled={toggle2FA.isPending}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </div>

                            <div
                                style={{
                                    marginTop: '3rem',
                                    borderTop: '1px solid rgb(var(--card-border))',
                                    paddingTop: '2rem',
                                }}
                            >
                                <h4 style={{ marginBottom: '1rem' }}>Active Sessions</h4>
                                <p className="section-desc" style={{ marginBottom: '1.5rem' }}>
                                    Devices currently logged into your account.
                                </p>

                                <div
                                    className="sessions-list"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem',
                                    }}
                                >
                                    {loadingSessions ? (
                                        <p>Loading sessions...</p>
                                    ) : sessions.length > 0 ? (
                                        sessions.map((session) => (
                                            <div
                                                key={session.id}
                                                className="session-item"
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '1rem',
                                                    background: 'rgba(0,0,0,0.02)',
                                                    borderRadius: '12px',
                                                    border: '1px solid rgba(0,0,0,0.05)',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '1rem',
                                                    }}
                                                >
                                                    <Smartphone
                                                        size={24}
                                                        className="text-gray-400"
                                                    />
                                                    <div>
                                                        <div
                                                            style={{
                                                                fontWeight: '600',
                                                                fontSize: '0.9rem',
                                                            }}
                                                        >
                                                            {session.ip_address === 'unknown'
                                                                ? 'Unknown Device'
                                                                : session.ip_address}
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: '0.75rem',
                                                                color: '#666',
                                                            }}
                                                        >
                                                            Last active:{' '}
                                                            {new Date(
                                                                session.last_active_at,
                                                            ).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    className="btn btn-sm btn-outline"
                                                    onClick={() => handleRevokeSession(session.id)}
                                                    style={{
                                                        color: '#ff4757',
                                                        borderColor: '#ff4757',
                                                    }}
                                                >
                                                    Logout
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <p>No other active sessions found.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="settings-section">
                            <h2 className="section-title">Notifications</h2>
                            <p className="section-desc">Choose which alerts you want to receive.</p>

                            <div className="toggle-group">
                                <div className="toggle-info">
                                    <h4>Instant Messages</h4>
                                    <p>Get notified when someone sends you a message.</p>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" defaultChecked />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="toggle-group">
                                <div className="toggle-info">
                                    <h4>Likes & Comments</h4>
                                    <p>Stay updated on interactions with your posts.</p>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" defaultChecked />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="toggle-group">
                                <div className="toggle-info">
                                    <h4>Community Updates</h4>
                                    <p>New posts in groups you've joined.</p>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" defaultChecked />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="toggle-group">
                                <div className="toggle-info">
                                    <h4>Email Newsletters</h4>
                                    <p>Weekly digest of top campus events and news.</p>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="settings-section">
                            <h2 className="section-title">Theme</h2>
                            <p className="section-desc">
                                Choose how KaruTeens looks on your device.
                            </p>

                            <div className="appearance-grid">
                                <div
                                    className={`theme-card ${theme === 'dark' ? 'active' : ''}`}
                                    onClick={() => setTheme('dark')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="theme-preview dark"></div>
                                    <h4>Dark Mode</h4>
                                    <p>Easier on the eyes at night</p>
                                </div>
                                <div
                                    className={`theme-card ${theme === 'light' ? 'active' : ''}`}
                                    onClick={() => setTheme('light')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="theme-preview light"></div>
                                    <h4>Light Mode</h4>
                                    <p>Classic clean appearance</p>
                                </div>
                            </div>

                            <div className="settings-card" style={{ marginTop: '1.5rem' }}>
                                <h3>Accent Color</h3>
                                <div className="color-options">
                                    {[
                                        '#667eea',
                                        '#2ed573',
                                        '#3742fa',
                                        '#ff4757',
                                        '#ffa502',
                                        '#9b59b6',
                                    ].map((color) => (
                                        <button
                                            key={color}
                                            className="color-option active"
                                            style={{ background: color }}
                                            onClick={() =>
                                                showToast('Accent color updated!', 'success')
                                            }
                                        >
                                            <Check size={14} color="white" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="settings-card" style={{ marginTop: '1.5rem' }}>
                                <h3>Font Size</h3>
                                <div className="font-size-options">
                                    {fontSizes.map((size) => (
                                        <button
                                            key={size.value}
                                            className={`font-size-btn ${appearanceSettings.fontSize === size.value ? 'active' : ''}`}
                                            onClick={() =>
                                                setAppearanceSettings({
                                                    ...appearanceSettings,
                                                    fontSize: size.value,
                                                })
                                            }
                                        >
                                            <Type
                                                size={18}
                                                style={{
                                                    transform:
                                                        size.value === 'small'
                                                            ? 'scale(0.8)'
                                                            : size.value === 'large'
                                                              ? 'scale(1.2)'
                                                              : 'scale(1)',
                                                }}
                                            />
                                            <span>{size.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'display' && (
                        <div className="settings-section">
                            <h2 className="section-title">Display</h2>
                            <p className="section-desc">Customize your viewing experience.</p>

                            <div className="settings-card">
                                <h3>Feed Layout</h3>
                                <div className="layout-options">
                                    <button
                                        className={`layout-btn ${!appearanceSettings.compactMode ? 'active' : ''}`}
                                        onClick={() =>
                                            setAppearanceSettings({
                                                ...appearanceSettings,
                                                compactMode: false,
                                            })
                                        }
                                    >
                                        <Layout size={20} />
                                        <span>Comfortable</span>
                                    </button>
                                    <button
                                        className={`layout-btn ${appearanceSettings.compactMode ? 'active' : ''}`}
                                        onClick={() =>
                                            setAppearanceSettings({
                                                ...appearanceSettings,
                                                compactMode: true,
                                            })
                                        }
                                    >
                                        <Maximize size={20} />
                                        <span>Compact</span>
                                    </button>
                                </div>
                            </div>

                            <div className="settings-card" style={{ marginTop: '1rem' }}>
                                <h3>Display Options</h3>
                                <div className="toggle-group">
                                    <div className="toggle-info">
                                        <h4>Show Borders</h4>
                                        <p>Display subtle borders between cards.</p>
                                    </div>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={appearanceSettings.showBorders}
                                            onChange={() =>
                                                setAppearanceSettings({
                                                    ...appearanceSettings,
                                                    showBorders: !appearanceSettings.showBorders,
                                                })
                                            }
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </div>

                            <div className="settings-card" style={{ marginTop: '1rem' }}>
                                <h3>Animations</h3>
                                <div className="toggle-group">
                                    <div className="toggle-info">
                                        <h4>Reduced Motion</h4>
                                        <p>Minimize animations for better performance.</p>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="settings-section">
                            <h2 className="section-title">Privacy & Blocking</h2>
                            <p className="section-desc">
                                Manage who can see your content and block users.
                            </p>

                            <div className="settings-card">
                                <h3>Blocked Users ({blockedUsers.length})</h3>
                                {blockedUsers.length === 0 ? (
                                    <p className="empty-text">You haven't blocked anyone yet.</p>
                                ) : (
                                    <ul className="blocked-list">
                                        {blockedUsers.map((blocked) => (
                                            <li key={blocked.id} className="blocked-item">
                                                <div className="blocked-info">
                                                    <span className="blocked-username">
                                                        @{blocked.username}
                                                    </span>
                                                    <span className="blocked-date">
                                                        Blocked on{' '}
                                                        {new Date(
                                                            blocked.blocked_at,
                                                        ).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <button
                                                    className="btn-text"
                                                    onClick={() => handleUnblockUser(blocked.id)}
                                                >
                                                    Unblock
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="settings-card">
                                <h3>Privacy Options</h3>
                                <div className="toggle-group">
                                    <div className="toggle-info">
                                        <h4>Show Online Status</h4>
                                        <p>Let others see when you're online.</p>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" defaultChecked />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <div className="toggle-group">
                                    <div className="toggle-info">
                                        <h4>Show Profile Views</h4>
                                        <p>Let users know when you view their profile.</p>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" defaultChecked />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="settings-section">
                            <h2 className="section-title">Data & Account</h2>
                            <p className="section-desc">
                                Download your data or manage your account.
                            </p>

                            <div className="settings-card">
                                <div className="card-icon">
                                    <Download size={24} />
                                </div>
                                <div className="card-content">
                                    <h3>Download Your Data</h3>
                                    <p>
                                        Get a copy of all your data including posts, messages, and
                                        media.
                                    </p>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleExportData}
                                        disabled={exportingData}
                                    >
                                        {exportingData ? 'Preparing...' : 'Request Data Export'}
                                    </button>
                                </div>
                            </div>

                            <div className="settings-card danger-zone">
                                <div className="card-icon danger">
                                    <AlertTriangle size={24} />
                                </div>
                                <div className="card-content">
                                    <h3>Delete Account</h3>
                                    <p>
                                        Permanently delete your account and all associated data.
                                        This action cannot be undone.
                                    </p>
                                    <button
                                        className="btn btn-danger"
                                        onClick={handleDeleteAccount}
                                        disabled={deletingAccount}
                                    >
                                        {deletingAccount ? 'Processing...' : 'Delete My Account'}
                                    </button>
                                </div>
                            </div>

                            <div className="settings-card">
                                <h3>GDPR Rights</h3>
                                <ul className="rights-list">
                                    <li>Right to access your personal data</li>
                                    <li>Right to rectify inaccurate data</li>
                                    <li>Right to erasure ("right to be forgotten")</li>
                                    <li>Right to data portability</li>
                                    <li>Right to object to processing</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
