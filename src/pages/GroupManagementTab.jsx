import React, { useState, useEffect } from 'react';
import api from '../api/client';

import {
    Users,
    Plus,
    Edit,
    Trash2,
    UserPlus,
    UserMinus,
    Shield,
    ShieldCheck,
    Eye,
    EyeOff,
    Download,
    Upload,
    RefreshCw,
    Search,
    Filter,
    Calendar,
    Hash,
    Globe,
    Lock,
    Unlock,
    UserCheck,
    UserX,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const GroupManagementTab = () => {
    const [groups, setGroups] = useState([]);
    const [filters, setFilters] = useState({
        category: 'all',
        isPrivate: 'all',
        search: '',
        sortBy: 'created_at',
        sortOrder: 'desc',
    });

    const [selectedGroups, setSelectedGroups] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const { showToast } = useToast();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        let isMounted = true;

        const loadGroups = async () => {
            setIsLoading(true);
            try {
                // Fetch real data from API
                const groupsRes = await api.get('/groups');
                if (isMounted) {
                    setGroups(groupsRes.data);
                }
            } catch (error) {
                console.error('Failed to load groups:', error);
                if (isMounted) {
                    setGroups([]); // Empty state on error
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadGroups();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleBulkAction = () => {
        if (selectedGroups.length === 0) {
            showToast('Please select groups first', 'warning');
            return;
        }

        if (bulkAction === 'delete') {
            if (confirm(`Delete ${selectedGroups.length} groups? This action cannot be undone.`)) {
                // Simulate bulk delete
                setGroups((prev) => prev.filter((g) => !selectedGroups.includes(g.id)));
                setSelectedGroups([]);
                setBulkAction('');
                showToast('Groups deleted', 'success');
            }
        } else if (bulkAction === 'make_public') {
            setGroups((prev) =>
                prev.map((g) => (selectedGroups.includes(g.id) ? { ...g, is_private: false } : g)),
            );
            setSelectedGroups([]);
            setBulkAction('');
            showToast('Groups made public', 'success');
        } else if (bulkAction === 'make_private') {
            setGroups((prev) =>
                prev.map((g) => (selectedGroups.includes(g.id) ? { ...g, is_private: true } : g)),
            );
            setSelectedGroups([]);
            setBulkAction('');
            showToast('Groups made private', 'success');
        }
    };

    const handleAddMember = (groupId, username) => {
        setGroups((prev) =>
            prev.map((g) => {
                if (g.id === groupId) {
                    return {
                        ...g,
                        members: [...g.members, `user_${Math.random().toString(36).substr(2, 9)}`],
                        member_count: g.member_count + 1,
                    };
                }
                return g;
            }),
        );
        showToast(`Added ${username} to group`, 'success');
    };

    const handleRemoveMember = (groupId, memberId) => {
        setGroups((prev) =>
            prev.map((g) => {
                if (g.id === groupId) {
                    return {
                        ...g,
                        members: g.members.filter((id) => id !== memberId),
                        member_count: g.member_count - 1,
                    };
                }
                return g;
            }),
        );
        showToast('Member removed from group', 'info');
    };

    const handleMakeAdmin = (groupId, memberId) => {
        setGroups((prev) =>
            prev.map((g) => {
                if (g.id === groupId) {
                    return {
                        ...g,
                        admins: [...g.admins, memberId],
                    };
                }
                return g;
            }),
        );
        showToast('User promoted to admin', 'success');
    };

    const handleDeleteGroup = (groupId) => {
        if (confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
            setGroups((prev) => prev.filter((g) => g.id !== groupId));
            showToast('Group deleted', 'success');
        }
    };

    const toggleGroupSelection = (groupId) => {
        setSelectedGroups((prev) =>
            prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
        );
    };

    const selectAllGroups = () => {
        if (selectedGroups.length === groups.length) {
            setSelectedGroups([]);
        } else {
            setSelectedGroups(groups.map((g) => g.id));
        }
    };

    const [userCache, setUserCache] = useState({});

    const getMemberInfo = async (groupId, memberId) => {
        // Check cache first
        if (userCache[memberId]) {
            return userCache[memberId];
        }

        // Fetch from API if not in cache
        try {
            const { data } = await api.get(`/users/${memberId}`);
            // Update cache
            setUserCache((prev) => ({ ...prev, [memberId]: data }));
            return data;
        } catch (error) {
            console.error(`Failed to fetch user ${memberId}:`, error);
            return { username: 'Unknown', full_name: 'Unknown User' };
        }
    };

    return (
        <div className="group-management-tab">
            {/* Header */}
            <div className="tab-header">
                <div className="header-left">
                    <h2>Group Management</h2>
                    <p>Manage groups, members, and permissions</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary">
                        <Upload size={18} />
                        Import Groups
                    </button>
                    <button className="btn-primary">
                        <Download size={18} />
                        Export Groups
                    </button>
                    <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={18} />
                        Add Group
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
                            placeholder="Search groups by name, description, or category..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <select
                            value={filters.category}
                            onChange={(e) => handleFilterChange('category', e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            <option value="Technology">Technology</option>
                            <option value="Education">Education</option>
                            <option value="Administration">Administration</option>
                            <option value="Entertainment">Entertainment</option>
                            <option value="Sports">Sports</option>
                        </select>

                        <select
                            value={filters.isPrivate}
                            onChange={(e) => handleFilterChange('isPrivate', e.target.value)}
                        >
                            <option value="all">All Privacy</option>
                            <option value="false">Public</option>
                            <option value="true">Private</option>
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
            {selectedGroups.length > 0 && (
                <div className="bulk-actions">
                    <div className="selection-info">{selectedGroups.length} groups selected</div>
                    <div className="bulk-actions-controls">
                        <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
                            <option value="">Bulk Actions</option>
                            <option value="make_public">Make Public</option>
                            <option value="make_private">Make Private</option>
                            <option value="delete">Delete Groups</option>
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

            {/* Groups Table */}
            <div className="groups-table-container">
                {isLoading ? (
                    <div className="loading-state">
                        <RefreshCw size={32} className="spin-anim" />
                        <p>Loading groups...</p>
                    </div>
                ) : (
                    <>
                        <div className="table-header">
                            <div className="select-all">
                                <input
                                    type="checkbox"
                                    checked={
                                        selectedGroups.length === groups.length && groups.length > 0
                                    }
                                    onChange={selectAllGroups}
                                />
                                <span>Select All</span>
                            </div>
                            <div className="table-actions">
                                <span className="group-count">{groups.length} groups found</span>
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
                                                checked={
                                                    selectedGroups.length === groups.length &&
                                                    groups.length > 0
                                                }
                                                onChange={selectAllGroups}
                                            />
                                        </th>
                                        <th>Group Info</th>
                                        <th>Category</th>
                                        <th>Members</th>
                                        <th>Privacy</th>
                                        <th>Creator</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groups.map((group) => (
                                        <tr key={group.id}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGroups.includes(group.id)}
                                                    onChange={() => toggleGroupSelection(group.id)}
                                                />
                                            </td>
                                            <td>
                                                <div className="group-info">
                                                    <div className="group-avatar">
                                                        {group.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="group-details">
                                                        <div className="group-name">
                                                            {group.name}
                                                        </div>
                                                        <div className="group-desc">
                                                            {group.description}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="category-badge">
                                                    {group.category}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="members-info">
                                                    <div className="member-count">
                                                        {group.member_count}/
                                                        {group.max_members || 'Unlimited'}
                                                    </div>
                                                    <div className="member-list">
                                                        {group.members
                                                            .slice(0, 3)
                                                            .map((memberId) => {
                                                                const member = getMemberInfo(
                                                                    group.id,
                                                                    memberId,
                                                                );
                                                                return (
                                                                    <div
                                                                        key={memberId}
                                                                        className="member-avatar"
                                                                        title={member.username}
                                                                    >
                                                                        {member.username
                                                                            .charAt(0)
                                                                            .toUpperCase()}
                                                                    </div>
                                                                );
                                                            })}
                                                        {group.members.length > 3 && (
                                                            <div className="member-more">
                                                                +{group.members.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span
                                                    className={`privacy-badge ${group.is_private ? 'private' : 'public'}`}
                                                >
                                                    {group.is_private ? (
                                                        <Lock size={14} />
                                                    ) : (
                                                        <Unlock size={14} />
                                                    )}
                                                    {group.is_private ? 'Private' : 'Public'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="creator-info">
                                                    {
                                                        getMemberInfo(group.id, group.creator_id)
                                                            .username
                                                    }
                                                </div>
                                            </td>
                                            <td>
                                                <div className="date-info">
                                                    <Calendar size={14} />
                                                    <span>
                                                        {new Date(
                                                            group.created_at,
                                                        ).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="action-btn view"
                                                        onClick={() => {}}
                                                        title="View Group"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        className="action-btn edit"
                                                        onClick={() => {
                                                            setEditingGroup(group);
                                                            setShowEditModal(true);
                                                        }}
                                                        title="Edit Group"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={() => handleDeleteGroup(group.id)}
                                                        title="Delete Group"
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

            {/* Add Group Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '500px' }}
                    >
                        <div className="modal-header">
                            <h3>Add New Group</h3>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <form>
                                <div className="form-group">
                                    <label>Group Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter group name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description *</label>
                                    <textarea
                                        className="form-input"
                                        rows="3"
                                        placeholder="Enter group description"
                                    ></textarea>
                                </div>
                                <div className="form-group">
                                    <label>Category *</label>
                                    <select className="form-input">
                                        <option value="">Select category</option>
                                        <option value="Technology">Technology</option>
                                        <option value="Education">Education</option>
                                        <option value="Administration">Administration</option>
                                        <option value="Entertainment">Entertainment</option>
                                        <option value="Sports">Sports</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Privacy Settings</label>
                                    <div className="privacy-options">
                                        <label className="radio-option">
                                            <input
                                                type="radio"
                                                name="privacy"
                                                value="public"
                                                defaultChecked
                                            />
                                            <span>Public</span>
                                        </label>
                                        <label className="radio-option">
                                            <input type="radio" name="privacy" value="private" />
                                            <span>Private</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Maximum Members (Optional)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="Leave empty for unlimited"
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => setShowAddModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Create Group
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Group Modal */}
            {showEditModal && editingGroup && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '500px' }}
                    >
                        <div className="modal-header">
                            <h3>Edit Group</h3>
                            <button className="close-btn" onClick={() => setShowEditModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <form>
                                <div className="form-group">
                                    <label>Group Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        defaultValue={editingGroup.name}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        className="form-input"
                                        rows="3"
                                        defaultValue={editingGroup.description}
                                    ></textarea>
                                </div>
                                <div className="form-group">
                                    <label>Category</label>
                                    <select
                                        className="form-input"
                                        defaultValue={editingGroup.category}
                                    >
                                        <option value="Technology">Technology</option>
                                        <option value="Education">Education</option>
                                        <option value="Administration">Administration</option>
                                        <option value="Entertainment">Entertainment</option>
                                        <option value="Sports">Sports</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Privacy Settings</label>
                                    <div className="privacy-options">
                                        <label className="radio-option">
                                            <input
                                                type="radio"
                                                name="privacy"
                                                value="public"
                                                defaultChecked={!editingGroup.is_private}
                                            />
                                            <span>Public</span>
                                        </label>
                                        <label className="radio-option">
                                            <input
                                                type="radio"
                                                name="privacy"
                                                value="private"
                                                defaultChecked={editingGroup.is_private}
                                            />
                                            <span>Private</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Maximum Members</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        defaultValue={editingGroup.max_members || ''}
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => setShowEditModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Update Group
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupManagementTab;
