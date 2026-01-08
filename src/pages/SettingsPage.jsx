import React, { useState, useEffect } from 'react';
import {
    User, Lock, Bell, Moon, LogOut,
    Save, Shield, Smartphone, Mail, Globe,
    ChevronRight, CreditCard, HelpCircle
} from 'lucide-react';
import { useAuth, useLogout, useUpdateProfile } from '../hooks/useAuth';
import '../styles/SettingsPage.css';
import api from '../api/client';

const SettingsPage = () => {
    const { user } = useAuth();
    const logout = useLogout();
    const updateProfile = useUpdateProfile();
    const [activeTab, setActiveTab] = useState('account');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Account State
    const [profileData, setProfileData] = useState({
        full_name: '',
        bio: '',
        school: '',
        year_of_study: 1,
        age: 18,
        gender: ''
    });

    // Password State
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    // Fetch profile on mount
    useEffect(() => {
        if (user?.username) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const res = await api.get(`/users/${user.username}`);
            setProfileData({
                full_name: res.data.full_name || '',
                bio: res.data.bio || '',
                school: res.data.school || '',
                year_of_study: res.data.year_of_study || 1,
                age: res.data.age || 18,
                gender: res.data.gender || ''
            });
        } catch (err) {
            console.error("Error fetching profile", err);
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
                new_password: passwordData.new_password
            });
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'account', icon: <User size={20} />, label: 'Account' },
        { id: 'security', icon: <Lock size={20} />, label: 'Security' },
        { id: 'notifications', icon: <Bell size={20} />, label: 'Notifications' },
        { id: 'appearance', icon: <Moon size={20} />, label: 'Appearance' },
    ];

    return (
        <div className="container settings-page">
            <div className="settings-header">
                <h1>Settings</h1>
                {message.text && (
                    <div className={`alert alert-${message.type}`} style={{ padding: '0.8rem', borderRadius: '10px', marginTop: '1rem' }}>
                        {message.text}
                    </div>
                )}
            </div>

            <div className="settings-container">
                <div className="settings-sidebar">
                    {tabs.map(tab => (
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
                            <p className="section-desc">Update your profile details and campus information.</p>

                            <form className="settings-form" onSubmit={handleUpdateProfile}>
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        value={profileData.full_name}
                                        onChange={e => setProfileData({ ...profileData, full_name: e.target.value })}
                                        placeholder="Enter your full name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>School / Faculty</label>
                                    <input
                                        type="text"
                                        value={profileData.school}
                                        onChange={e => setProfileData({ ...profileData, school: e.target.value })}
                                        placeholder="e.g. Science & Information Tech"
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Year of Study</label>
                                        <select
                                            value={profileData.year_of_study}
                                            onChange={e => setProfileData({ ...profileData, year_of_study: parseInt(e.target.value) })}
                                        >
                                            {[1, 2, 3, 4, 5, 6].map(year => <option key={year} value={year}>Year {year}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Age</label>
                                        <input
                                            type="number"
                                            value={profileData.age}
                                            onChange={e => setProfileData({ ...profileData, age: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Bio</label>
                                    <textarea
                                        rows="4"
                                        value={profileData.bio}
                                        onChange={e => setProfileData({ ...profileData, bio: e.target.value })}
                                        placeholder="Tell us a bit about yourself..."
                                    ></textarea>
                                </div>
                                <div className="settings-actions">
                                    <button type="submit" className="btn btn-primary" disabled={updateProfile.isPending}>
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
                            <p className="section-desc">Manage your password and account security preferences.</p>

                            <form className="settings-form" onSubmit={handleChangePassword}>
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.current_password}
                                        onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.new_password}
                                        onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.confirm_password}
                                        onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <div className="settings-actions">
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        <Shield size={18} style={{ marginRight: '8px' }} />
                                        {loading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>

                            <div style={{ marginTop: '3rem', borderTop: '1px solid rgb(var(--card-border))', paddingTop: '2rem' }}>
                                <h4 style={{ marginBottom: '1rem' }}>Two-Factor Authentication</h4>
                                <div className="toggle-group">
                                    <div className="toggle-info">
                                        <h4>Email Verification</h4>
                                        <p>Receive a code whenever you log in from a new device.</p>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" defaultChecked />
                                        <span className="slider"></span>
                                    </label>
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
                            <h2 className="section-title">Appearance</h2>
                            <p className="section-desc">Customize how KaruTeens looks on your device.</p>

                            <div className="appearance-grid">
                                <div className="theme-card active">
                                    <div className="theme-preview dark"></div>
                                    <h4>Dark Mode</h4>
                                    <p>Easier on the eyes at night</p>
                                </div>
                                <div className="theme-card">
                                    <div className="theme-preview light"></div>
                                    <h4>Light Mode</h4>
                                    <p>Classic clean appearance</p>
                                </div>
                            </div>

                            <div style={{ marginTop: '2rem' }}>
                                <div className="toggle-group">
                                    <div className="toggle-info">
                                        <h4>System Default</h4>
                                        <p>Automatically match your device's theme settings.</p>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" defaultChecked />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
