import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Flag, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Avatar from '../components/Avatar.jsx';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/ConfessionsPage.css';

const ConfessionsPage = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const {
        data: confessions = [],
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['confessions'],
        queryFn: async () => {
            const { data } = await api.get('/confessions');
            return data.map(c => ({
                ...c,
                id: c.id || c._id?.$oid || c._id
            }));
        },
    });
    const [newConfession, setNewConfession] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    
    // Comments State
    const [activeConfessionId, setActiveConfessionId] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);

    const { data: activeComments = [], isLoading: isCommentsLoading } = useQuery({
        queryKey: ['confession_comments', activeConfessionId],
        queryFn: async () => {
            if (!activeConfessionId) return [];
            const { data } = await api.get(`/confessions/${activeConfessionId}/comments`);
            return data;
        },
        enabled: !!activeConfessionId,
    });

    const postMutation = useMutation({
        mutationFn: async (newConfessionObj) => {
            const { data } = await api.post('/confessions', newConfessionObj);
            return {
                ...newConfessionObj,
                id: data.id?.$oid || data.id || data._id,
                likes: 0,
                comments: 0,
                created_at: new Date().toISOString(),
            };
        },
        onSuccess: (savedConfession) => {
            queryClient.setQueryData(['confessions'], (old) => [savedConfession, ...(old || [])]);
            setNewConfession('');
            showToast('Confession posted!', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to post', 'error');
        },
        onSettled: () => setIsPosting(false),
    });

    const commentMutation = useMutation({
        mutationFn: async ({ id, content }) => {
            await api.post(`/confessions/${id}/comments`, { content });
        },
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['confession_comments', id] });
            queryClient.setQueryData(['confessions'], (old) =>
                old?.map((c) => (c.id === id ? { ...c, comments: (c.comments || 0) + 1 } : c))
            );
            setNewComment('');
            showToast('Comment added!', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to add comment', 'error');
        },
        onSettled: () => setIsCommenting(false),
    });

    const handlePost = () => {
        if (!newConfession.trim()) return;
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setIsPosting(true);
        postMutation.mutate({
            content: newConfession,
            is_anonymous: isAnonymous,
            author_id: isAnonymous ? null : user.id,
            author_name: isAnonymous ? null : user.username,
        });
    };

    const handleLike = async (id) => {
        try {
            await api.post(`/confessions/${id}/like`);
            queryClient.setQueryData(['confessions'], (old) =>
                old?.map((c) => (c.id === id ? { ...c, likes: (c.likes || 0) + 1 } : c))
            );
        } catch (err) {
            showToast('Failed to like confession', 'error');
        }
    };

    const handleToggleComments = (id) => {
        if (activeConfessionId === id) {
            setActiveConfessionId(null);
        } else {
            setActiveConfessionId(id);
            setNewComment('');
        }
    };

    const handleAddComment = (e) => {
        e.preventDefault();
        if (!newComment.trim() || isCommenting) return;
        setIsCommenting(true);
        commentMutation.mutate({ id: activeConfessionId, content: newComment });
    };

    const handleReport = async (id) => {
        const reason = window.prompt("Why are you reporting this confession?");
        if (!reason || !reason.trim()) return;

        try {
            await api.post(`/confessions/${id}/report`, { reason });
            showToast('Report submitted to admins. Thank you for keeping KaruTeens safe.', 'success');
        } catch (err) {
            showToast('Failed to submit report', 'error');
        }
    };

    const handleShare = (confession) => {
        if (navigator.share) {
            navigator.share({
                title: 'Campus Confession',
                text: confession.content,
                url: window.location.href,
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(confession.content);
            showToast('Confession copied to clipboard!', 'success');
        }
    };

    return (
        <div className="container confessions-page">
            <div className="confessions-header">
                <h1>🔮 Campus Confessions</h1>
                <p>Share anonymously. No judgment. No holds barred.</p>
            </div>

            {/* Create Confession */}
            <div className="create-confession card">
                <div className="create-header">
                    <Avatar src={null} name={isAnonymous ? 'Anonymous' : 'You'} size="md" />
                    <div className="anonymous-toggle">
                        <input
                            type="checkbox"
                            id="anon"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                        />
                        <label htmlFor="anon">
                            <span>🔒</span> Post anonymously
                        </label>
                    </div>
                </div>
                <textarea
                    placeholder="What's your confession? (Your identity will be hidden)"
                    value={newConfession}
                    onChange={(e) => setNewConfession(e.target.value)}
                    rows={3}
                    disabled={isPosting}
                />
                <div className="create-actions">
                    <span className="char-count">{newConfession.length}/280</span>
                    <button
                        className="btn btn-primary"
                        onClick={handlePost}
                        disabled={!newConfession.trim() || isPosting}
                    >
                        <span>{isPosting ? '⏳' : '📤'}</span> {isPosting ? 'Posting...' : 'Post'}
                    </button>
                </div>
            </div>

            {/* Rules Banner */}
            <div className="rules-banner">
                <span>📜</span>
                <p>Keep it clean, kind, and anonymous. No hate speech or harassment.</p>
            </div>

            {/* Confessions Feed */}
            <div className="confessions-feed">
                {isLoading ? (
                    <div className="loading">Loading confessions...</div>
                ) : confessions.length === 0 ? (
                    <div className="empty">No confessions yet. Be the first!</div>
                ) : (
                    confessions.map((confession) => (
                        <div key={confession.id} className="confession-card card">
                            <div className="confession-header">
                                <div className="confession-author">
                                    <Avatar
                                        src={null}
                                        name={
                                            (confession.is_anonymous || confession.isAnonymous) ? 'Anonymous' : confession.author_name
                                        }
                                        size="sm"
                                    />
                                    <div className="author-info">
                                        <span className="author-name">
                                            {(confession.is_anonymous || confession.isAnonymous)
                                                ? 'Anonymous'
                                                : `@${confession.author_name || confession.username}`}
                                        </span>
                                        <span className="timestamp">
                                            {confession.created_at
                                                ? new Date(confession.created_at).toLocaleString()
                                                : 'Just now'}
                                        </span>
                                    </div>
                                </div>
                                {(confession.is_anonymous || confession.isAnonymous) && <span className="anon-badge">🔮</span>}
                            </div>

                            <p className="confession-content">{confession.content}</p>

                            <div className="confession-actions">
                                <button
                                    className={`action-btn ${confession.likes > 0 ? 'active' : ''}`}
                                    onClick={() => handleLike(confession.id)}
                                >
                                    <Heart size={18} fill={confession.likes > 0 ? "currentColor" : "none"} />
                                    <span>{confession.likes || 0}</span>
                                </button>
                                <button 
                                    className={`action-btn ${activeConfessionId === confession.id ? 'active' : ''}`} 
                                    onClick={() => handleToggleComments(confession.id)}
                                >
                                    <MessageCircle size={18} />
                                    <span>{confession.comments || 0}</span>
                                </button>
                                <button className="action-btn" onClick={() => handleShare(confession)}>
                                    <Share2 size={18} />
                                    <span>Share</span>
                                </button>
                                <button className="action-btn report" onClick={() => handleReport(confession.id)}>
                                    <Flag size={18} />
                                    <span>Report</span>
                                </button>
                            </div>

                            {/* Comments Section */}
                            {activeConfessionId === confession.id && (
                                <div className="comments-section">
                                    <div className="comments-list">
                                        {isCommentsLoading ? (
                                            <div className="loading-small">Loading comments...</div>
                                        ) : activeComments.length === 0 ? (
                                            <div className="empty-small">No comments yet.</div>
                                        ) : (
                                            activeComments.map((comment, idx) => (
                                                <div key={idx} className="comment-item">
                                                    <Avatar name={comment.author_username} size="xs" />
                                                    <div className="comment-content-box">
                                                        <div className="comment-meta">
                                                            <strong>@{comment.author_username}</strong>
                                                            <span>{new Date(comment.created_at).toLocaleTimeString()}</span>
                                                        </div>
                                                        <p>{comment.content}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <form className="comment-input-area" onSubmit={handleAddComment}>
                                        <input 
                                            type="text" 
                                            placeholder="Write a comment..." 
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            disabled={isCommenting}
                                        />
                                        <button type="submit" disabled={!newComment.trim() || isCommenting}>
                                            <Send size={18} />
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ConfessionsPage;
