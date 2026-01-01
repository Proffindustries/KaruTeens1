import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Settings, LogOut, ChevronLeft, Loader, Send, Image as ImageIcon } from 'lucide-react';
import { useGroup, useGroupPosts, useLeaveGroup, useCreateGroupPost } from '../hooks/useGroups';
import { useToast } from '../context/ToastContext';
import '../styles/GroupDetailPage.css';
import Avatar from '../components/Avatar.jsx';

const GroupDetailPage = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const { data: group, isLoading: groupLoading } = useGroup(groupId);
    const { data: posts, isLoading: postsLoading } = useGroupPosts(groupId);
    const { mutate: leaveGroup } = useLeaveGroup();
    const { mutate: createPost } = useCreateGroupPost();
    const { showToast } = useToast();
    const [postContent, setPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    const handleLeaveGroup = () => {
        if (confirm('Are you sure you want to leave this group?')) {
            leaveGroup(groupId, {
                onSuccess: () => {
                    showToast('Left group', 'info');
                    navigate('/groups');
                }
            });
        }
    };

    const handleCreatePost = (e) => {
        e.preventDefault();
        if (!postContent.trim()) return;

        setIsPosting(true);
        createPost(
            { groupId, content: postContent, media_urls: [] },
            {
                onSuccess: () => {
                    setPostContent('');
                    showToast('Posted to group!', 'success');
                    setIsPosting(false);
                },
                onError: (err) => {
                    showToast(err.response?.data?.error || 'Failed to post', 'error');
                    setIsPosting(false);
                }
            }
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
                        backgroundColor: group.cover_url ? 'transparent' : `hsl(${Math.random() * 360}, 70%, 80%)`
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
                            <span><Users size={16} /> {group.member_count} members</span>
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
                            <div className="post-actions">
                                <button type="button" className="btn-icon" title="Add image (coming soon)" disabled>
                                    <ImageIcon size={20} />
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-sm"
                                    disabled={!postContent.trim() || isPosting}
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
                        posts.map(post => (
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
                                <div className="post-content">
                                    <p>{post.content}</p>
                                    {post.media_urls && post.media_urls.length > 0 && (
                                        <div className="post-media">
                                            {post.media_urls.map((url, idx) => (
                                                <img key={idx} src={url} alt="Post media" />
                                            ))}
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
