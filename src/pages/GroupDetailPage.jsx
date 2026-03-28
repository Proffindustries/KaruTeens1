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
    Shield,
    X,
} from 'lucide-react';
import { useGroup, useGroupPosts, useLeaveGroup, useCreateGroupPost } from '../hooks/useGroups';
import { useToast } from '../context/ToastContext';
import '../styles/GroupDetailPage.css';
import Avatar from '../components/Avatar.jsx';
import { shouldBlur } from '../utils/contentFilters.js';

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
    const { mutate: createPost } = useCreateGroupPost();
    const { showToast } = useToast();
    const [postContent, setPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [revealedNsfwPosts, setRevealedNsfwPosts] = useState(new Set());
    const [selectedImages, setSelectedImages] = useState([]);
    const fileInputRef = useRef(null);

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

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        const newImages = files.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
        }));
        setSelectedImages((prev) => [...prev, ...newImages]);
    };

    const removeImage = (index) => {
        setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleCreatePost = (e) => {
        e.preventDefault();
        if (!postContent.trim() && selectedImages.length === 0) return;

        setIsPosting(true);

        // For now, we'll just send the content. Image upload would require
        // additional API integration for file uploads
        createPost(
            { groupId, content: postContent, media_urls: selectedImages.map((img) => img.preview) },
            {
                onSuccess: () => {
                    setPostContent('');
                    showToast('Posted to group!', 'success');
                    setIsPosting(false);
                },
                onError: (err) => {
                    showToast(err.response?.data?.error || 'Failed to post', 'error');
                    setIsPosting(false);
                },
            },
        );
    };

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
        <div className="container group-detail-page">
            <button className="back-btn" onClick={() => navigate('/groups')}>
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
                        <button className="btn btn-outline" onClick={handleLeaveGroup}>
                            <LogOut size={18} /> Leave Group
                        </button>
                    )}
                </div>
            </div>

            {/* Group Feed */}
            {group.is_member ? (
                <div className="group-feed">
                    {/* Create Post */}
                    <div className="card create-post-card">
                        <form onSubmit={handleCreatePost}>
                            <textarea
                                className="post-textarea"
                                placeholder="Share something with the group..."
                                value={postContent}
                                onChange={(e) => setPostContent(e.target.value)}
                                rows="3"
                            />
                            {selectedImages.length > 0 && (
                                <div className="selected-images mb-3">
                                    <div className="images-preview">
                                        {selectedImages.map((img, index) => (
                                            <div key={index} className="image-preview-item">
                                                <img src={img.preview} alt="Selected" />
                                                <button
                                                    type="button"
                                                    className="remove-image"
                                                    onClick={() => removeImage(index)}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="post-actions">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageSelect}
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    className="btn-icon"
                                    title="Add image"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <ImageIcon size={20} />
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-sm"
                                    disabled={
                                        (!postContent.trim() && selectedImages.length === 0) ||
                                        isPosting
                                    }
                                >
                                    {isPosting ? 'Posting...' : 'Post'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Posts List */}
                    {postsLoading ? (
                        <div className="loading-state">
                            <Loader size={32} className="spin-anim" />
                            <p>Loading posts...</p>
                        </div>
                    ) : posts && posts.length > 0 ? (
                        posts.map((post) => (
                            <div key={post.id} className="card post-card">
                                <div className="post-header">
                                    <Avatar
                                        src={post.avatar_url}
                                        name={post.username}
                                        className="post-avatar"
                                    />
                                    <div>
                                        <strong>{post.username}</strong>
                                        <span className="post-time">
                                            {new Date(post.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div
                                    className={`post-content ${shouldBlur(post) && !revealedNsfwPosts.has(post.id) ? 'nsfw-blurred' : ''}`}
                                >
                                    <p>{post.content}</p>
                                    {post.media_urls && post.media_urls.length > 0 && (
                                        <div className="post-media">
                                            {post.media_urls.map((url, idx) => (
                                                <img key={idx} src={url} alt="Post media" />
                                            ))}
                                        </div>
                                    )}
                                    {shouldBlur(post) && !revealedNsfwPosts.has(post.id) && (
                                        <div
                                            className="nsfw-overlay"
                                            onClick={() =>
                                                setRevealedNsfwPosts((prev) =>
                                                    new Set(prev).add(post.id),
                                                )
                                            }
                                        >
                                            <Shield size={32} />
                                            <p>Sensitive Content</p>
                                            <button className="reveal-btn">Tap to View</button>
                                        </div>
                                    )}
                                </div>
                                <div className="post-footer">
                                    <span>{post.likes_count} likes</span>
                                    <span>{post.comments_count} comments</span>
                                </div>
                            </div>
                        ))
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
