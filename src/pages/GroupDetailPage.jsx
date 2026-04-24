import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Users,
    Settings,
    LogOut,
    ChevronLeft,
    Loader,
    Send,
    Image as ImageIcon,
    Video,
    Shield,
    X,
    FileText,
    MoreVertical,
} from 'lucide-react';
import CreatePostModal from '../components/CreatePostModal.jsx';
import { useGroup, useGroupPosts, useLeaveGroup, useUpdateGroup } from '../hooks/useGroups';
import { useMediaUpload } from '../hooks/useMedia';
import { useUpload } from '../context/UploadContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/GroupDetailPage.css';
import Avatar from '../components/Avatar.jsx';
import CustomVideoPlayer from '../components/CustomVideoPlayer.jsx';
import CustomAudioPlayer from '../components/CustomAudioPlayer.jsx';
import PostCard from '../components/PostCard.jsx';
import { shouldBlur } from '../utils/contentFilters.js';
import { useAuthContext } from '../context/AuthContext.jsx';

const GroupDetailPage = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const [groupColor, setGroupColor] = useState(() => {
        // Generate a stable color based on groupId or use a fallback
        if (!groupId) return `hsl(${Math.random() * 360}, 70%, 80%)`;
        // Use a hash of groupId to generate consistent color
        let hash = 0;
        for (let i = 0; i < groupId.length; i++) {
            hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash) % 360;
        return `hsl(${h}, 70%, 80%)`;
    });
    const { data: group, isLoading: groupLoading } = useGroup(groupId);
    const { data: posts, isLoading: postsLoading } = useGroupPosts(groupId);
    const { mutate: leaveGroup } = useLeaveGroup();
    const { showToast } = useToast();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { user: currentUser } = useAuthContext();
    const { mutate: updateGroup } = useUpdateGroup();
    const [isEditingGroup, setIsEditingGroup] = useState(false);
    const [editGroupData, setEditGroupData] = useState({
        name: '',
        description: '',
        avatar_url: '',
    });
    const { uploadImage } = useMediaUpload();
    const { addUpload, updateUploadProgress, completeUpload, failUpload } = useUpload();
    const avatarInputRef = useRef(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploadingAvatar(true);
        const uploadId = addUpload({
            fileName: file.name,
            fileSize: file.size,
            type: 'image',
        });

        try {
            const url = await uploadImage(file, (p, l) => updateUploadProgress(uploadId, p, l));
            completeUpload(uploadId, { url });
            setEditGroupData((prev) => ({ ...prev, avatar_url: url }));
            showToast('Avatar uploaded!', 'success');
        } catch (err) {
            failUpload(uploadId, err);
            showToast('Failed to upload avatar', 'error');
        } finally {
            setIsUploadingAvatar(false);
        }
    };
    const handleLeaveGroup = () => {
        if (confirm('Are you sure you want to leave this group?')) {
            leaveGroup(groupId, {
                onSuccess: () => {
                    showToast('Left group', 'info');
                    navigate('/groups');
                },
            });
        }
    };

    const handleDeleteGroup = async () => {
        if (confirm('Are you sure you want to DELETE this group? This action cannot be undone.')) {
            try {
                await api.delete(`/groups/${groupId}`);
                showToast('Group deleted', 'success');
                navigate('/groups');
            } catch (err) {
                showToast('Failed to delete group', 'error');
            }
        }
    };

    const handleEditBtnClick = () => {
        setEditGroupData({
            name: group.name || '',
            description: group.description || '',
            avatar_url: group.avatar_url || '',
        });
        setIsEditingGroup(true);
    };

    const handleUpdateGroup = (e) => {
        e.preventDefault();
        updateGroup(
            { groupId, updateData: editGroupData },
            {
                onSuccess: () => {
                    showToast('Group updated successfully!', 'success');
                    setIsEditingGroup(false);
                },
                onError: () => {
                    showToast('Failed to update group.', 'error');
                },
            },
        );
    };

    const canEdit =
        currentUser &&
        (group?.creator_id === currentUser?.id || group?.admins?.includes(currentUser?.id));

    if (groupLoading) {
        return (
            <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <Loader size={48} className="spin-anim" />
                <p>Loading group...</p>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <h2>Group not found</h2>
                <button className="btn btn-outline" onClick={() => navigate('/groups')}>
                    Back to Communities
                </button>
            </div>
        );
    }

    return (
        <div
            className="container group-detail-page feed-layout"
            style={{
                maxWidth: '800px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <CreatePostModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                groupId={groupId}
            />
            <button
                className="back-btn"
                onClick={() => navigate('/groups')}
                style={{ marginBottom: '1rem', width: 'fit-content' }}
            >
                <ChevronLeft size={20} /> Back to Communities
            </button>

            {/* Group Header */}
            <div className="group-header card">
                <div
                    className="group-cover-large"
                    style={{
                        backgroundImage: group.cover_url ? `url(${group.cover_url})` : 'none',
                        backgroundColor: group.cover_url ? 'transparent' : groupColor,
                    }}
                />
                <div className="group-header-content">
                    <Avatar
                        src={group.avatar_url}
                        name={group.name}
                        className="group-avatar-large"
                        size="3xl"
                    />
                    <div className="group-info">
                        <h1>{group.name}</h1>
                        <p>{group.description}</p>
                        <div className="group-meta-detail">
                            <span className="category-badge">{group.category}</span>
                            <span>
                                <Users size={16} /> {group.member_count} members
                            </span>
                            {group.is_private && <span className="privacy-badge">Private</span>}
                        </div>
                    </div>
                    {group.is_member && (
                        <div style={{ position: 'relative' }}>
                            <button className="btn-icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                                <MoreVertical size={24} />
                            </button>
                            {isMenuOpen && (
                                <div
                                    className="post-options-menu"
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: '100%',
                                        zIndex: 10,
                                    }}
                                >
                                    {canEdit && (
                                        <button
                                            className="menu-item"
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                handleEditBtnClick();
                                            }}
                                        >
                                            <Settings size={18} /> Edit Settings
                                        </button>
                                    )}
                                    {canEdit && (
                                        <button
                                            className="menu-item danger"
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                handleDeleteGroup();
                                            }}
                                        >
                                            <X size={18} /> Delete Group
                                        </button>
                                    )}
                                    <button
                                        className="menu-item danger"
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            handleLeaveGroup();
                                        }}
                                    >
                                        <LogOut size={18} /> Leave Group
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Group Modal */}
            {isEditingGroup && (
                <div className="modal-overlay">
                    <div
                        className="group-modal card"
                        style={{ padding: '2rem', maxWidth: '400px', width: '100%' }}
                    >
                        <div
                            className="modal-header"
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '1rem',
                            }}
                        >
                            <h3>Edit Group Settings</h3>
                            <button className="icon-btn" onClick={() => setIsEditingGroup(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form
                            onSubmit={handleUpdateGroup}
                            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                        >
                            <div className="form-group">
                                <label>Group Name</label>
                                <input
                                    type="text"
                                    value={editGroupData.name}
                                    onChange={(e) =>
                                        setEditGroupData({ ...editGroupData, name: e.target.value })
                                    }
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={editGroupData.description}
                                    onChange={(e) =>
                                        setEditGroupData({
                                            ...editGroupData,
                                            description: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="form-group">
                                <label>Avatar</label>
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '1rem',
                                        alignItems: 'center',
                                        marginTop: '0.5rem',
                                    }}
                                >
                                    <Avatar
                                        src={editGroupData.avatar_url}
                                        name={editGroupData.name}
                                        size="xl"
                                    />
                                    <input
                                        type="file"
                                        ref={avatarInputRef}
                                        onChange={handleAvatarUpload}
                                        hidden
                                        accept="image/*"
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        onClick={() => avatarInputRef.current.click()}
                                        disabled={isUploadingAvatar}
                                    >
                                        {isUploadingAvatar ? 'Uploading...' : 'Update Avatar'}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ marginTop: '1rem' }}
                            >
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Group Feed */}
            {group.is_member ? (
                <div className="group-feed">
                    {/* Create Post Widget */}
                    <div
                        className="card create-post-widget shadow-sm"
                        style={{ marginBottom: '1.5rem' }}
                    >
                        <div className="create-post-top">
                            <Avatar
                                src={currentUser?.avatar_url}
                                name={currentUser?.username || 'User'}
                                className="widget-avatar shadow-sm"
                            />
                            <div
                                className="create-post-input"
                                onClick={() => setIsModalOpen(true)}
                                style={{ cursor: 'pointer', flex: 1 }}
                            >
                                <div
                                    style={{
                                        padding: '0.65rem 1rem',
                                        borderRadius: '20px',
                                        background: 'rgba(var(--border), 0.15)',
                                        color: 'rgb(var(--text-muted))',
                                        fontSize: '0.95rem',
                                        userSelect: 'none',
                                    }}
                                >
                                    Share something with {group.name}...
                                </div>
                            </div>
                        </div>
                        <div
                            className="create-post-actions"
                            style={{
                                display: 'flex',
                                gap: '0.5rem',
                                marginTop: '1rem',
                                paddingLeft: '3rem',
                            }}
                        >
                            <button
                                className="cp-action"
                                onClick={() => setIsModalOpen(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                <ImageIcon size={18} color="#00b894" /> Photo/Media
                            </button>
                            <button
                                className="btn btn-primary btn-sm"
                                style={{
                                    marginLeft: 'auto',
                                    borderRadius: '20px',
                                    padding: '0.5rem 1.25rem',
                                }}
                                onClick={() => setIsModalOpen(true)}
                            >
                                Post
                            </button>
                        </div>
                    </div>

                    {/* Posts List */}
                    {postsLoading ? (
                        <div className="loading-state">
                            <Loader size={32} className="spin-anim" />
                            <p>Loading posts...</p>
                        </div>
                    ) : posts && posts.length > 0 ? (
                        posts.map((post) => <PostCard key={post.id} post={post} />)
                    ) : (
                        <div className="empty-state">
                            <p>No posts yet. Be the first to post!</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <h3>Join this group to see posts</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Become a member to participate in discussions
                    </p>
                </div>
            )}
        </div>
    );
};

export default GroupDetailPage;
