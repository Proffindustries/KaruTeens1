import React, { useState } from 'react';
import { Users, Search, PlusCircle, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../styles/GroupsPage.css';
import { useGroups, useCreateGroup, useJoinGroup } from '../hooks/useGroups';
import Avatar from '../components/Avatar.jsx';
import { useToast } from '../context/ToastContext';

const GroupsPage = () => {
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const { data: groups, isLoading } = useGroups({ category: categoryFilter, search: searchQuery });
    const { mutate: joinGroup } = useJoinGroup();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const categories = ['all', 'Academic', 'Hobby', 'Sports', 'Business', 'Arts', 'Other'];

    const handleJoinGroup = (groupId, e) => {
        e.stopPropagation();
        joinGroup(groupId, {
            onSuccess: () => {
                showToast('Joined group!', 'success');
            },
            onError: (err) => {
                showToast(err.response?.data?.error || 'Failed to join group', 'error');
            }
        });
    };

    return (
        <div className="container groups-page">
            <div className="page-header">
                <div className="header-text">
                    <h1>Communities</h1>
                    <p>Find your tribe. Connect with students who share your interests.</p>
                </div>
                <div className="header-action">
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        <PlusCircle size={18} /> Create Group
                    </button>
                </div>
            </div>

            <div className="search-bar-lg">
                <Search size={20} />
                <input
                    type="text"
                    placeholder="Search communities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Category Filter */}
            <div className="categories-scroll" style={{ marginBottom: '1.5rem' }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`cat-pill ${categoryFilter === cat ? 'active' : ''}`}
                        onClick={() => setCategoryFilter(cat)}
                    >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="loading-state">
                    <Loader size={48} className="spin-anim" />
                    <p>Loading communities...</p>
                </div>
            ) : (
                <div className="groups-grid">
                    {groups && groups.length > 0 ? (
                        groups.map(group => (
                            <motion.div
                                key={group.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="card group-card"
                                onClick={() => navigate(`/groups/${group.id}`)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div
                                    className="group-cover"
                                    style={{
                                        backgroundImage: group.cover_url ? `url(${group.cover_url})` : 'none',
                                        backgroundColor: group.cover_url ? 'transparent' : `hsl(${Math.random() * 360}, 70%, 80%)`
                                    }}
                                />
                                <div className="group-content">
                                    <Avatar
                                        src={group.avatar_url}
                                        name={group.name}
                                        className="group-avatar"
                                        size="xl"
                                    />
                                    <h3>{group.name}</h3>
                                    <div className="group-meta">
                                        <span>{group.category}</span> • <span><Users size={14} /> {group.member_count} Members</span>
                                    </div>
                                    {group.is_member ? (
                                        <button
                                            className="btn btn-outline btn-full"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/groups/${group.id}`);
                                            }}
                                        >
                                            View Group
                                        </button>
                                    ) : (
                                        <button
                                            className="btn btn-primary btn-full"
                                            onClick={(e) => handleJoinGroup(group.id, e)}
                                        >
                                            Join Group
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <Users size={64} color="#ccc" />
                            <p>No groups found</p>
                            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                                Create the First Group
                            </button>
                        </div>
                    )}
                </div>
            )}

            {showCreateModal && (
                <CreateGroupModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
        </div>
    );
};

const CreateGroupModal = ({ isOpen, onClose }) => {
    const { mutate: createGroup, isPending } = useCreateGroup();
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'Academic',
        avatar_url: '',
        cover_url: '',
        is_private: false,
        max_members: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        const groupData = {
            ...formData,
            max_members: formData.max_members ? parseInt(formData.max_members) : null
        };

        createGroup(groupData, {
            onSuccess: () => {
                showToast('Group created successfully!', 'success');
                onClose();
            },
            onError: (err) => {
                showToast(err.response?.data?.error || 'Failed to create group', 'error');
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h3>Create Community</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label>Community Name</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Computer Science Society"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            className="form-input"
                            rows="3"
                            placeholder="What is this community about?"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Category</label>
                        <select
                            className="form-select"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option>Academic</option>
                            <option>Hobby</option>
                            <option>Sports</option>
                            <option>Business</option>
                            <option>Arts</option>
                            <option>Other</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Max Members (Optional)</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="No limit"
                            value={formData.max_members}
                            onChange={(e) => setFormData({ ...formData, max_members: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                checked={formData.is_private}
                                onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                            />
                            Private Group (members only)
                        </label>
                    </div>

                    <button type="submit" className="btn btn-primary btn-full" disabled={isPending}>
                        {isPending ? 'Creating...' : 'Create Community'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default GroupsPage;
