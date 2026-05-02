import React, { useState, useEffect, useCallback } from 'react';
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
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

    const [notificationSettings, setNotificationSettings] = useState({
        messages: true,
        likes: true,
        comments: true,
        follows: true,
        mentions: true,
        class_reminders: true,
        template_updates: false,
        ad_promotions: false,
        email_digest: false,
    });
    const [pushEnabled, setPushEnabled] = useState(Notification.permission === 'granted');

    const [profileData, setProfileData] = useState({
        full_name: '',
        bio: '',
        school: '',
        year_of_study: 1,
        age: 18,
        gender: '',
    });

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

    const applyAppearance = useCallback((settings) => {
        const root = document.documentElement;
        if (settings.fontSize === 'small') root.style.setProperty('--font-size-multiplier', '0.9');
        else if (settings.fontSize === 'large') root.style.setProperty('--font-size-multiplier', '1.1');
        else root.style.setProperty('--font-size-multiplier', '1');

        if (settings.compactMode) root.style.setProperty('--card-padding', '0.8rem');
        else root.style.setProperty('--card-padding', '1.5rem');

        if (!settings.showBorders) root.style.setProperty('--card-border', 'transparent');
        else root.style.removeProperty('--card-border');
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('karuteens_appearance');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setAppearanceSettings(parsed);
                applyAppearance(parsed);
            } catch (e) {}
        }
    }, [applyAppearance]);

    const handleAppearanceChange = (key, value) => {
        const newSettings = { ...appearanceSettings, [key]: value };
        setAppearanceSettings(newSettings);
        localStorage.setItem('karuteens_appearance', JSON.stringify(newSettings));
        applyAppearance(newSettings);
    };

    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });

    const fetchSessions = useCallback(async () => {
        setLoadingSessions(true);
        try {
            const { data } = await api.get('/users/sessions');
            setSessions(data);
        } catch (err) {
            console.error('Error fetching sessions', err);
        } finally {
            setLoadingSessions(false);
        }
    }, []);

    const fetchProfile = useCallback(async () => {
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
    }, [user?.username]);

    useEffect(() => {
        if (user?.username) {
            fetchProfile();
        }
        if (activeTab === 'security') {
            fetchSessions();
        }
    }, [user, activeTab, fetchProfile, fetchSessions]);

    const handleRevokeSession = async (sessionId) => {
        if (!confirm('Are you sure you want to log out from this device?')) return;
        try {
            await api.delete(`/users/sessions/${sessionId}`);
            setSessions(sessions.filter((s) => s.id !== sessionId));
        } catch (err) {
            console.error('Error revoking session', err);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await updateProfile.mutateAsync(profileData);
            showToast('Profile updated successfully', 'success');
        } catch (err) {
            showToast('Failed to update profile', 'error');
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

    const confirmDeleteAccount = async () => {
        setDeletingAccount(true);
        try {
            await api.post('/users/delete-account', { reason: deleteReason });
            showToast(
                'Account deletion requested. You will receive an email confirmation.',
                'info',
            );
            logout();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to delete account', 'error');
        } finally {
            setDeletingAccount(false);
            setShowDeleteModal(false);
        }
    };

    const fetchBlockedUsers = useCallback(async () => {
        try {
            const { data } = await api.get('/users/blocked');
            setBlockedUsers(data);
        } catch (err) {
            console.error('Error fetching blocked users', err);
        }
    }, []);

    const fetchNotificationSettings = useCallback(async () => {
        try {
            const { data } = await api.get('/users/notifications/settings');
            setNotificationSettings(data);
        } catch (err) {
            console.error('Error fetching notification settings', err);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'privacy') fetchBlockedUsers();
        if (activeTab === 'notifications') fetchNotificationSettings();
    }, [activeTab, fetchBlockedUsers, fetchNotificationSettings]);

    const handleNotificationToggle = async (key) => {
        const newValue = !notificationSettings[key];
        const newSettings = { ...notificationSettings, [key]: newValue };
        setNotificationSettings(newSettings);
        try {
            await api.put('/users/notifications/settings', newSettings);
        } catch (err) {
            showToast('Failed to update notification settings', 'error');
            setNotificationSettings(notificationSettings);
        }
    };

    const handleMasterPushToggle = async (e) => {
        if (e.target.checked) {
            const perm = await Notification.requestPermission();
            setPushEnabled(perm === 'granted');
        } else {
            setPushEnabled(false);
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
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="settings-section">
                            <h2 className="section-title">Privacy Settings</h2>
                            <p className="section-desc">Manage your blocked users.</p>
                            <div className="blocked-users-list" style={{ marginTop: '2rem' }}>
                                {blockedUsers.length === 0 ? (
                                    <div className="empty-state" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                        <Shield size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                                        <p style={{ color: 'var(--text-muted)' }}>You haven't blocked anyone.</p>
                                    </div>
                                ) : (
                                    blockedUsers.map(u => (
                                        <div key={u.id} className="blocked-user-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid rgb(var(--card-border))' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <img src={u.avatar_url || 'https://ui-avatars.com/api/?name=' + u.username} alt={u.username} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                                <div>
                                                    <strong style={{ display: 'block' }}>@{u.username}</strong>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Blocked on {new Date(u.blocked_at || Date.now()).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <button className="btn btn-outline" style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }} onClick={() => {
                                                if (confirm(`Unblock @${u.username}? They will be able to see your posts and message you again.`)) {
                                                    handleUnblockUser(u.id);
                                                }
                                            }}>Unblock</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="settings-section">
                            <h2 className="section-title">Data and Privacy</h2>
                            <p className="section-desc">Manage your account data or permanently delete your account.</p>

                            <div className="data-card" style={{ padding: '1.5rem', border: '1px solid rgb(var(--card-border))', borderRadius: '8px', marginBottom: '1.5rem', marginTop: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <Download size={24} style={{ marginRight: '1rem', color: 'rgb(var(--primary-color))', marginTop: '0.2rem' }} />
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Export Data</h3>
                                        <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                            Download a copy of your posts, messages, and profile data. This may take a few minutes to prepare.
                                        </p>
                                    </div>
                                </div>
                                <button className="btn btn-primary" onClick={handleExportData} disabled={exportingData}>
                                    {exportingData ? (
                                        <>
                                            <RefreshCw className="spin-icon" size={18} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                                            Preparing your data...
                                        </>
                                    ) : 'Request Data Export'}
                                </button>
                            </div>

                            <div className="data-card" style={{ padding: '1.5rem', border: '1px solid #ef4444', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <AlertTriangle size={24} style={{ marginRight: '1rem', color: '#ef4444', marginTop: '0.2rem' }} />
                                    <div>
                                        <h3 style={{ margin: 0, color: '#ef4444', fontSize: '1.1rem' }}>Delete Account</h3>
                                        <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                            This action is permanent and cannot be undone. All your posts, messages, and data will be permanently removed.
                                        </p>
                                    </div>
                                </div>
                                <button className="btn" style={{ backgroundColor: '#ef4444', color: 'white', border: 'none' }} onClick={() => setShowDeleteModal(true)}>Delete Account</button>
                            </div>

                            {/* Delete Confirmation Modal */}
                            {showDeleteModal && (
                                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                                    <div className="modal-content" style={{ backgroundColor: 'var(--bg-color, #1e1e2e)', padding: '2rem', borderRadius: '12px', maxWidth: '400px', width: '100%', border: '1px solid rgb(var(--card-border))' }}>
                                        <h3 style={{ marginTop: 0, color: '#ef4444', marginBottom: '0.5rem' }}>Confirm Account Deletion</h3>
                                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>This action is permanent and cannot be undone.</p>
                                        
                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Why are you leaving?</label>
                                            <select value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgb(var(--card-border))', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}>
                                                <option value="">Select a reason...</option>
                                                <option value="Privacy concerns">Privacy concerns</option>
                                                <option value="Too busy">Too busy</option>
                                                <option value="Found another platform">Found another platform</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '2rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Type "DELETE" to confirm</label>
                                            <input type="text" value={deleteConfirmationText} onChange={(e) => setDeleteConfirmationText(e.target.value)} placeholder="DELETE" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgb(var(--card-border))', background: 'rgba(0,0,0,0.2)', color: 'inherit' }} />
                                        </div>

                                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                            <button className="btn btn-outline" onClick={() => {
                                                setShowDeleteModal(false);
                                                setDeleteConfirmationText('');
                                                setDeleteReason('');
                                            }}>Cancel</button>
                                            <button className="btn" style={{ backgroundColor: deleteConfirmationText === 'DELETE' && !deletingAccount ? '#ef4444' : 'gray', color: 'white', border: 'none', opacity: deleteConfirmationText !== 'DELETE' || deletingAccount ? 0.6 : 1 }} disabled={deleteConfirmationText !== 'DELETE' || deletingAccount} onClick={() => confirmDeleteAccount()}>
                                                {deletingAccount ? 'Deleting...' : 'Permanently Delete'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="settings-section">
                            <h2 className="section-title">Appearance Settings</h2>
                            <p className="section-desc">Customize how KaruTeens looks and feels.</p>

                            <div className="form-group" style={{ marginBottom: '2.5rem', marginTop: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: '500' }}>Theme</label>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    {['light', 'dark', 'system'].map(t => (
                                        <button 
                                            key={t}
                                            className={`btn ${theme === t ? 'btn-primary' : 'btn-outline'}`}
                                            onClick={() => {
                                                setTheme(t);
                                                handleAppearanceChange('theme', t);
                                            }}
                                            style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'center', padding: '0.6rem 1.2rem', borderRadius: '8px' }}
                                        >
                                            {t === 'light' ? <Sun size={16} style={{marginRight: '8px'}} /> : t === 'dark' ? <Moon size={16} style={{marginRight: '8px'}} /> : <Monitor size={16} style={{marginRight: '8px'}} />}
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: '500' }}>Font Size</label>
                                <div style={{ display: 'flex', gap: '1.5rem', background: 'rgba(var(--card-border), 0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgb(var(--card-border))' }}>
                                    {fontSizes.map(sizeObj => (
                                        <label key={sizeObj.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input 
                                                type="radio" 
                                                name="fontSize" 
                                                value={sizeObj.value} 
                                                checked={appearanceSettings.fontSize === sizeObj.value}
                                                onChange={() => handleAppearanceChange('fontSize', sizeObj.value)}
                                                style={{ width: '18px', height: '18px', accentColor: 'rgb(var(--primary-color))' }}
                                            />
                                            <span style={{ fontSize: sizeObj.value === 'small' ? '0.9rem' : sizeObj.value === 'large' ? '1.1rem' : '1rem' }}>{sizeObj.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="toggle-group" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: '8px', border: '1px solid rgb(var(--card-border))' }}>
                                <div className="toggle-info" style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.05rem' }}>Compact Mode</h4>
                                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Decrease spacing between layout elements for a denser view.</p>
                                </div>
                                <label className="switch" style={{ marginLeft: '1rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={appearanceSettings.compactMode}
                                        onChange={(e) => handleAppearanceChange('compactMode', e.target.checked)}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="toggle-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: '8px', border: '1px solid rgb(var(--card-border))' }}>
                                <div className="toggle-info" style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.05rem' }}>Show Borders</h4>
                                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Display visible borders around content cards and elements.</p>
                                </div>
                                <label className="switch" style={{ marginLeft: '1rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={appearanceSettings.showBorders}
                                        onChange={(e) => handleAppearanceChange('showBorders', e.target.checked)}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="settings-section">
                            <h2 className="section-title">Notification Settings</h2>
                            <p className="section-desc">Manage how and when you receive notifications.</p>

                            <div className="toggle-group" style={{ marginBottom: '2rem', padding: '1.2rem', borderRadius: '8px', border: '1px solid rgb(var(--primary-color))', background: 'rgba(var(--primary-color), 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="toggle-info">
                                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.1rem' }}>Master Push Notifications</h4>
                                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Enable or disable all browser push notifications.</p>
                                </div>
                                <label className="switch" style={{ marginLeft: '1rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={pushEnabled}
                                        onChange={handleMasterPushToggle}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {[
                                    { key: 'messages', label: 'New messages', desc: 'Someone sends you a DM' },
                                    { key: 'follows', label: 'New followers', desc: 'Someone follows you' },
                                    { key: 'likes', label: 'Post likes', desc: 'Someone likes your post' },
                                    { key: 'comments', label: 'Post comments', desc: 'Someone comments on your post' },
                                    { key: 'mentions', label: 'Mentions', desc: 'Someone @mentions you' },
                                    { key: 'class_reminders', label: 'Class reminders', desc: '15-min alarm before class' },
                                    { key: 'template_updates', label: 'Template updates', desc: 'A template you forked was updated' },
                                    { key: 'ad_promotions', label: 'Ad promotions', desc: 'Campus partner offers' },
                                    { key: 'email_digest', label: 'Email digest', desc: 'Weekly summary email' },
                                ].map((item) => (
                                    <div key={item.key} className="toggle-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: '8px', border: '1px solid rgb(var(--card-border))' }}>
                                        <div className="toggle-info" style={{ flex: 1 }}>
                                            <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.05rem' }}>{item.label}</h4>
                                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{item.desc}</p>
                                        </div>
                                        <label className="switch" style={{ marginLeft: '1rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings[item.key] || false}
                                                onChange={() => handleNotificationToggle(item.key)}
                                                disabled={!pushEnabled && item.key !== 'email_digest'}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
