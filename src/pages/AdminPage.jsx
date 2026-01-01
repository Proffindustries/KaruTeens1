import React, { useState } from 'react';
import { Users, DollarSign, FileText, Shield, Settings, TrendingUp, Ban, CheckCircle, Loader } from 'lucide-react';
import '../styles/AdminPage.css';
import { useAdminStats, useAdminUsers, useBanUser, useVerifyUser, useUpdateUserRole } from '../hooks/useAdmin';
import { useToast } from '../context/ToastContext';

const AdminPage = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Check admin access
    if (user.role !== 'admin' && user.role !== 'superadmin') {
        return (
            <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <Shield size={64} color="#ff6348" />
                <h2>Access Denied</h2>
                <p>You do not have permission to access this page.</p>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="admin-sidebar">
                <div className="admin-logo">
                    <Shield size={32} />
                    <h2>Admin Panel</h2>
                </div>
                <nav className="admin-nav">
                    <button
                        className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <TrendingUp size={20} /> Overview
                    </button>
                    <button
                        className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <Users size={20} /> Users
                    </button>
                    <button
                        className={`admin-nav-item ${activeTab === 'content' ? 'active' : ''}`}
                        onClick={() => setActiveTab('content')}
                    >
                        <FileText size={20} /> Content
                    </button>
                </nav>
            </div>

            <div className="admin-main">
                <div className="admin-header">
                    <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
                    <div className="admin-user-badge">
                        {user.role === 'superadmin' ? '👑 SuperAdmin' : '🛡️ Admin'}
                    </div>
                </div>

                <div className="admin-content">
                    {activeTab === 'overview' && <OverviewTab />}
                    {activeTab === 'users' && <UsersTab isSuperAdmin={user.role === 'superadmin'} />}
                    {activeTab === 'content' && <ContentTab />}
                </div>
            </div>
        </div>
    );
};

const OverviewTab = () => {
    const { data: stats, isLoading } = useAdminStats();

    if (isLoading) {
        return (
            <div className="loading-state">
                <Loader size={48} className="spin-anim" />
                <p>Loading stats...</p>
            </div>
        );
    }

    if (!stats) return <div>Failed to load stats</div>;

    return (
        <div className="overview-tab">
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#3742fa' }}>
                        <Users size={24} color="white" />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Users</p>
                        <h2>{stats.total_users.toLocaleString()}</h2>
                        <small>{stats.verified_users} verified</small>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f1c40f' }}>
                        <Shield size={24} color="white" />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Premium Users</p>
                        <h2>{stats.premium_users.toLocaleString()}</h2>
                        <small>{Math.round((stats.premium_users / stats.total_users) * 100)}% conversion</small>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#2ed573' }}>
                        <FileText size={24} color="white" />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Posts</p>
                        <h2>{stats.total_posts.toLocaleString()}</h2>
                        <small>User generated content</small>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#5f27cd' }}>
                        <Users size={24} color="white" />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Events & Groups</p>
                        <h2>{(stats.total_events + stats.total_groups).toLocaleString()}</h2>
                        <small>{stats.total_events} events, {stats.total_groups} groups</small>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#ff6348' }}>
                        <Ban size={24} color="white" />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Banned Users</p>
                        <h2>{stats.banned_users.toLocaleString()}</h2>
                        <small>{Math.round((stats.banned_users / stats.total_users) * 100)}% of total</small>
                    </div>
                </div>
            </div>
        </div>
    );
};

const UsersTab = ({ isSuperAdmin }) => {
    const [filters, setFilters] = useState({ role: 'all', verified: undefined, premium: undefined, search: '' });
    const { data: users, isLoading } = useAdminUsers(filters);
    const { mutate: banUser } = useBanUser();
    const { mutate: verifyUser } = useVerifyUser();
    const { mutate: updateRole } = useUpdateUserRole();
    const { showToast } = useToast();

    const handleBanToggle = (userId, currentBanStatus) => {
        const action = currentBanStatus ? 'unban' : 'ban';
        if (confirm(`Are you sure you want to ${action} this user?`)) {
            banUser({ userId, banned: !currentBanStatus }, {
                onSuccess: () => showToast(`User ${action}ned successfully`, 'success'),
                onError: (err) => showToast(err.response?.data?.error || `Failed to ${action} user`, 'error')
            });
        }
    };

    const handleVerify = (userId) => {
        verifyUser(userId, {
            onSuccess: () => showToast('User verified', 'success'),
            onError: (err) => showToast(err.response?.data?.error || 'Failed to verify', 'error')
        });
    };

    const handleRoleChange = (userId, newRole) => {
        if (confirm(`Change user role to ${newRole}?`)) {
            updateRole({ userId, role: newRole }, {
                onSuccess: () => showToast('Role updated', 'success'),
                onError: (err) => showToast(err.response?.data?.error || 'Failed to update role', 'error')
            });
        }
    };

    return (
        <div className="users-tab">
            <div className="users-filters">
                <select
                    className="form-select"
                    value={filters.role}
                    onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                >
                    <option value="all">All Roles</option>
                    <option value="user">User</option>
                    <option value="premium">Premium</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">SuperAdmin</option>
                </select>

                <select
                    className="form-select"
                    value={filters.verified ?? ''}
                    onChange={(e) => setFilters({ ...filters, verified: e.target.value === '' ? undefined : e.target.value === 'true' })}
                >
                    <option value="">All Users</option>
                    <option value="true">Verified Only</option>
                    <option value="false">Unverified Only</option>
                </select>

                <input
                    type="text"
                    className="form-input"
                    placeholder="Search by username..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
            </div>

            {isLoading ? (
                <div className="loading-state">
                    <Loader size={32} className="spin-anim" />
                </div>
            ) : (
                <div className="users-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users && users.map(user => (
                                <tr key={user.id} className={user.is_banned ? 'banned-row' : ''}>
                                    <td>{user.username || 'N/A'}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        {isSuperAdmin ? (
                                            <select
                                                className="role-select"
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                            >
                                                <option value="user">User</option>
                                                <option value="premium">Premium</option>
                                                <option value="admin">Admin</option>
                                                <option value="superadmin">SuperAdmin</option>
                                            </select>
                                        ) : (
                                            <span className={`role-badge ${user.role}`}>{user.role}</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="status-badges">
                                            {user.is_verified && <span className="badge verified">Verified</span>}
                                            {user.is_premium && <span className="badge premium">Premium</span>}
                                            {user.is_banned && <span className="badge banned">Banned</span>}
                                        </div>
                                    </td>
                                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="action-buttons">
                                            {!user.is_verified && (
                                                <button
                                                    className="btn-icon-small"
                                                    onClick={() => handleVerify(user.id)}
                                                    title="Verify user"
                                                >
                                                    <CheckCircle size={16} />
                                                </button>
                                            )}
                                            <button
                                                className={`btn-icon-small ${user.is_banned ? 'unban' : 'ban'}`}
                                                onClick={() => handleBanToggle(user.id, user.is_banned)}
                                                title={user.is_banned ? 'Unban' : 'Ban'}
                                            >
                                                <Ban size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const ContentTab = () => {
    return (
        <div className="content-tab card">
            <h3>Content Moderation</h3>
            <p>Content moderation tools coming soon. This will include:</p>
            <ul>
                <li>View and delete posts</li>
                <li>Review reported content</li>
                <li>Manage marketplace items</li>
                <li>Monitor group posts</li>
            </ul>
        </div>
    );
};

export default AdminPage;
