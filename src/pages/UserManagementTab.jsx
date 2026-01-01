import React, { useState, useEffect } from 'react';
import { 
    Search, Filter, Plus, Edit, Trash2, UserCheck, UserX, Shield, 
    ShieldCheck, Eye, EyeOff, Download, Upload, RefreshCw,
    Calendar, Mail, User, Users, Star, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { useAdminUsers, useBanUser, useVerifyUser, useUpdateUserRole } from '../hooks/useAdmin';
import { useToast } from '../context/ToastContext';

const UserManagementTab = () => {
    const [filters, setFilters] = useState({
        role: 'all',
        verified: 'all',
        premium: 'all',
        banned: 'all',
        search: '',
        sortBy: 'created_at',
        sortOrder: 'desc'
    });
    
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    
    const { data: users, isLoading, refetch } = useAdminUsers(filters);
    const { mutate: banUser } = useBanUser();
    const { mutate: verifyUser } = useVerifyUser();
    const { mutate: updateRole } = useUpdateUserRole();
    const { showToast } = useToast();

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleBulkAction = () => {
        if (selectedUsers.length === 0) {
            showToast('Please select users first', 'warning');
            return;
        }

        if (bulkAction === 'ban') {
            if (confirm(`Ban ${selectedUsers.length} users?`)) {
                selectedUsers.forEach(userId => {
                    banUser({ userId, banned: true }, {
                        onSuccess: () => showToast('Users banned', 'success'),
                        onError: () => showToast('Failed to ban users', 'error')
                    });
                });
            }
        } else if (bulkAction === 'unban') {
            selectedUsers.forEach(userId => {
                banUser({ userId, banned: false }, {
                    onSuccess: () => showToast('Users unbanned', 'success'),
                    onError: () => showToast('Failed to unban users', 'error')
                });
            });
        } else if (bulkAction === 'verify') {
            selectedUsers.forEach(userId => {
                verifyUser(userId, {
                    onSuccess: () => showToast('Users verified', 'success'),
                    onError: () => showToast('Failed to verify users', 'error')
                });
            });
        } else if (bulkAction === 'promote') {
            if (confirm('Promote to Premium?')) {
                selectedUsers.forEach(userId => {
                    updateRole({ userId, role: 'premium' }, {
                        onSuccess: () => showToast('Users promoted', 'success'),
                        onError: () => showToast('Failed to promote users', 'error')
                    });
                });
            }
        }

        setSelectedUsers([]);
        setBulkAction('');
        refetch();
    };

    const handleUserAction = (userId, action, data = {}) => {
        if (action === 'ban') {
            banUser({ userId, banned: true }, {
                onSuccess: () => {
                    showToast('User banned', 'success');
                    refetch();
                },
                onError: (err) => showToast(err.response?.data?.error || 'Failed to ban user', 'error')
            });
        } else if (action === 'unban') {
            banUser({ userId, banned: false }, {
                onSuccess: () => {
                    showToast('User unbanned', 'success');
                    refetch();
                },
                onError: (err) => showToast(err.response?.data?.error || 'Failed to unban user', 'error')
            });
        } else if (action === 'verify') {
            verifyUser(userId, {
                onSuccess: () => {
                    showToast('User verified', 'success');
                    refetch();
                },
                onError: (err) => showToast(err.response?.data?.error || 'Failed to verify user', 'error')
            });
        } else if (action === 'role') {
            updateRole({ userId, role: data.role }, {
                onSuccess: () => {
                    showToast('Role updated', 'success');
                    refetch();
                },
                onError: (err) => showToast(err.response?.data?.error || 'Failed to update role', 'error')
            });
        }
    };

    const toggleUserSelection = (userId) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const selectAllUsers = () => {
        if (selectedUsers.length === users.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(users.map(u => u.id));
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'superadmin': return '#9b59b6';
            case 'admin': return '#3498db';
            case 'premium': return '#f1c40f';
            case 'user': return '#95a5a6';
            default: return '#95a5a6';
        }
    };

    return (
        <div className="user-management-tab">
            {/* Header */}
            <div className="tab-header">
                <div className="header-left">
                    <h2>User Management</h2>
                    <p>Manage users, roles, and permissions</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary">
                        <Upload size={18} />
                        Import Users
                    </button>
                    <button className="btn-primary">
                        <Download size={18} />
                        Export Users
                    </button>
                    <button className="btn-primary">
                        <Plus size={18} />
                        Add User
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
                            placeholder="Search users by username, email, or ID..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>
                    
                    <div className="filter-group">
                        <select 
                            value={filters.role}
                            onChange={(e) => handleFilterChange('role', e.target.value)}
                        >
                            <option value="all">All Roles</option>
                            <option value="user">User</option>
                            <option value="premium">Premium</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Super Admin</option>
                        </select>
                        
                        <select 
                            value={filters.verified}
                            onChange={(e) => handleFilterChange('verified', e.target.value)}
                        >
                            <option value="all">All Verification</option>
                            <option value="true">Verified Only</option>
                            <option value="false">Unverified Only</option>
                        </select>
                        
                        <select 
                            value={filters.banned}
                            onChange={(e) => handleFilterChange('banned', e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="false">Active Only</option>
                            <option value="true">Banned Only</option>
                        </select>
                    </div>
                </div>

                <button 
                    className="advanced-filters-toggle"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                    <Filter size={18} />
                    Advanced Filters
                </button>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
                <div className="advanced-filters">
                    <div className="filter-row">
                        <div className="filter-item">
                            <label>Registration Date Range</label>
                            <div className="date-range">
                                <input type="date" placeholder="From" />
                                <input type="date" placeholder="To" />
                            </div>
                        </div>
                        
                        <div className="filter-item">
                            <label>Last Active</label>
                            <select>
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="inactive">Inactive (30+ days)</option>
                            </select>
                        </div>
                        
                        <div className="filter-item">
                            <label>Content Count</label>
                            <div className="number-range">
                                <input type="number" placeholder="Min posts" />
                                <input type="number" placeholder="Max posts" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
                <div className="bulk-actions">
                    <div className="selection-info">
                        {selectedUsers.length} users selected
                    </div>
                    <div className="bulk-actions-controls">
                        <select 
                            value={bulkAction}
                            onChange={(e) => setBulkAction(e.target.value)}
                        >
                            <option value="">Bulk Actions</option>
                            <option value="verify">Verify Users</option>
                            <option value="ban">Ban Users</option>
                            <option value="unban">Unban Users</option>
                            <option value="promote">Promote to Premium</option>
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

            {/* Users Table */}
            <div className="users-table-container">
                {isLoading ? (
                    <div className="loading-state">
                        <RefreshCw size={32} className="spin-anim" />
                        <p>Loading users...</p>
                    </div>
                ) : (
                    <>
                        <div className="table-header">
                            <div className="select-all">
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.length === users.length && users.length > 0}
                                    onChange={selectAllUsers}
                                />
                                <span>Select All</span>
                            </div>
                            <div className="table-actions">
                                <span className="user-count">{users.length} users found</span>
                                <button className="refresh-btn" onClick={() => refetch()}>
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
                                                checked={selectedUsers.length === users.length && users.length > 0}
                                                onChange={selectAllUsers}
                                            />
                                        </th>
                                        <th>User</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Registration</th>
                                        <th>Posts</th>
                                        <th>Last Active</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id} className={user.is_banned ? 'banned-row' : ''}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.includes(user.id)}
                                                    onChange={() => toggleUserSelection(user.id)}
                                                />
                                            </td>
                                            <td>
                                                <div className="user-info">
                                                    <div className="avatar">
                                                        {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                    <div className="user-details">
                                                        <div className="username">{user.username || 'Anonymous'}</div>
                                                        <div className="user-id">ID: {user.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="email-info">
                                                    <Mail size={14} />
                                                    <span>{user.email}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span 
                                                    className="role-badge"
                                                    style={{ backgroundColor: `${getRoleColor(user.role)}20`, color: getRoleColor(user.role) }}
                                                >
                                                    {user.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="status-badges">
                                                    {user.is_verified && (
                                                        <span className="status-badge verified">
                                                            <CheckCircle size={12} /> Verified
                                                        </span>
                                                    )}
                                                    {user.is_premium && (
                                                        <span className="status-badge premium">
                                                            <Star size={12} /> Premium
                                                        </span>
                                                    )}
                                                    {user.is_banned && (
                                                        <span className="status-badge banned">
                                                            <XCircle size={12} /> Banned
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="date-info">
                                                    <Calendar size={14} />
                                                    <span>{new Date(user.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="post-count">12</span>
                                            </td>
                                            <td>
                                                <div className="date-info">
                                                    <Clock size={14} />
                                                    <span>2 hours ago</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button 
                                                        className="action-btn view"
                                                        title="View Profile"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {!user.is_verified && (
                                                        <button 
                                                            className="action-btn verify"
                                                            onClick={() => handleUserAction(user.id, 'verify')}
                                                            title="Verify User"
                                                        >
                                                            <UserCheck size={16} />
                                                        </button>
                                                    )}
                                                    {user.is_banned ? (
                                                        <button 
                                                            className="action-btn unban"
                                                            onClick={() => handleUserAction(user.id, 'unban')}
                                                            title="Unban User"
                                                        >
                                                            <UserCheck size={16} />
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            className="action-btn ban"
                                                            onClick={() => handleUserAction(user.id, 'ban')}
                                                            title="Ban User"
                                                        >
                                                            <UserX size={16} />
                                                        </button>
                                                    )}
                                                    <button 
                                                        className="action-btn edit"
                                                        title="Edit User"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button 
                                                        className="action-btn delete"
                                                        title="Delete User"
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
        </div>
    );
};

export default UserManagementTab;