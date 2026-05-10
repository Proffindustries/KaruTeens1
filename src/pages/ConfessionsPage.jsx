import React, { useState, useEffect, useRef } from 'react';
import {
    Heart,
    MessageCircle,
    Share2,
    Flag,
    Send,
    Image,
    Video,
    X,
    Clock,
    Trash2,
    Eye,
    EyeOff,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Avatar from '../components/Avatar.jsx';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';
import { useAuthContext } from '../context/AuthContext.jsx';
import { useMediaUpload } from '../hooks/useMedia.js';
import safeLocalStorage from '../utils/storage.js';
import { PostSkeleton } from '../components/Skeleton.jsx';
import '../styles/ConfessionsPage.css';

const AUTO_PUBLISH_HOURS = 12;

const ConfessionsPage = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { user: currentUser } = useAuthContext();
    const { uploadMedia, isUploading } = useMediaUpload();

    const [newConfession, setNewConfession] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [showPending, setShowPending] = useState(true);
    const mediaInputRef = useRef(null);

    const [activeConfessionId, setActiveConfessionId] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);
    const [reportingId, setReportingId] = useState(null);
    const [reportReason, setReportReason] = useState('');
    const [likingIds, setLikingIds] = useState(new Set());
    const [cancellingId, setCancellingId] = useState(null);

    const {
        data: confessions = [],
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['confessions'],
        queryFn: async () => {
            const { data } = await api.get('/confessions');
            return data;
        },
    });

    const { data: pendingConfessions = [], isLoading: isPendingLoading } = useQuery({
        queryKey: ['confessions', 'pending', currentUser?.id],
        queryFn: async () => {
            const { data } = await api.get('/confessions/pending');
            return data;
        },
        enabled: !!currentUser?.id,
        refetchInterval: 30000,
    });

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
        mutationFn: async (payload) => {
            const { data } = await api.post('/confessions', payload);
            return data;
        },
        onSuccess: (saved) => {
            queryClient.invalidateQueries({
                queryKey: ['confessions', 'pending', currentUser?.id],
            });
            setNewConfession('');
            setMediaFile(null);
            setMediaPreview(null);
            showToast(
                'Confession submitted for review! It will be visible once approved.',
                'success',
            );
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to post', 'error');
        },
        onSettled: () => setIsPosting(false),
    });

    const cancelMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/confessions/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['confessions', 'pending', currentUser?.id],
            });
            showToast('Confession cancelled.', 'info');
        },
        onError: () => {
            showToast('Failed to cancel', 'error');
        },
        onSettled: () => setCancellingId(null),
    });

    const commentMutation = useMutation({
        mutationFn: async ({ id, content }) => {
            await api.post(`/confessions/${id}/comments`, { content });
        },
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['confession_comments', id] });
            queryClient.setQueryData(['confessions'], (old) =>
                old?.map((c) => (c.id === id ? { ...c, comments: (c.comments || 0) + 1 } : c)),
            );
            setNewComment('');
            showToast('Comment added!', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to add comment', 'error');
        },
        onSettled: () => setIsCommenting(false),
    });

    useEffect(() => {
        return () => {
            if (mediaPreview) URL.revokeObjectURL(mediaPreview);
        };
    }, [mediaPreview]);

    const handleMediaSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if (!isImage && !isVideo) {
            showToast('Only images and videos are allowed', 'error');
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            showToast('File too large (Max 50MB)', 'error');
            return;
        }
        if (mediaPreview) URL.revokeObjectURL(mediaPreview);
        setMediaFile(file);
        setMediaPreview(URL.createObjectURL(file));
    };

    const removeMedia = () => {
        if (mediaPreview) URL.revokeObjectURL(mediaPreview);
        setMediaFile(null);
        setMediaPreview(null);
        if (mediaInputRef.current) mediaInputRef.current.value = '';
    };

    const handlePost = async () => {
        if (!newConfession.trim() && !mediaFile) return;
        setIsPosting(true);
        let mediaUrl = null;
        let mediaType = null;
        if (mediaFile) {
            try {
                mediaUrl = await uploadMedia(mediaFile);
                mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
            } catch {
                showToast('Media upload failed', 'error');
                setIsPosting(false);
                return;
            }
        }
        postMutation.mutate({
            content: newConfession.trim(),
            is_anonymous: isAnonymous,
            author_id: isAnonymous ? null : currentUser?.id,
            author_name: isAnonymous ? null : currentUser?.username,
            media_url: mediaUrl,
            media_type: mediaType,
        });
    };

    const handleCancel = (id) => {
        setCancellingId(id);
        cancelMutation.mutate(id);
    };

    const handleLike = async (id) => {
        if (likingIds.has(id)) return;
        setLikingIds((prev) => new Set(prev).add(id));
        const prev = queryClient.getQueryData(['confessions']);
        queryClient.setQueryData(['confessions'], (old) =>
            old?.map((c) => (c.id === id ? { ...c, likes: (c.likes || 0) + 1 } : c)),
        );
        try {
            await api.post(`/confessions/${id}/like`);
        } catch (err) {
            queryClient.setQueryData(['confessions'], () => prev);
            showToast('Failed to like', 'error');
        } finally {
            setLikingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
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

    const handleReport = (id) => {
        setReportingId(id);
        setReportReason('');
    };

    const submitReport = async () => {
        if (!reportReason.trim()) return;
        try {
            await api.post(`/confessions/${reportingId}/report`, { reason: reportReason });
            showToast('Report submitted. Thank you.', 'success');
            setReportingId(null);
            setReportReason('');
        } catch (err) {
            showToast('Failed to submit report', 'error');
        }
    };

    const handleShare = (confession) => {
        const text = `🗣️ Campus Confession\n\n"${confession.content}"`;
        if (navigator.share) {
            navigator
                .share({ title: 'Campus Confession', text, url: window.location.href })
                .catch(() => {});
        } else {
            navigator.clipboard.writeText(text);
            showToast('Confession copied!', 'success');
        }
    };

    const getTimeRemaining = (autoPublishAt) => {
        const diff = new Date(autoPublishAt) - Date.now();
        if (diff <= 0) return { total: 0, hours: 0, minutes: 0, seconds: 0 };
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return { total: diff, hours, minutes, seconds };
    };

    const PendingCountdown = ({ confession }) => {
        const [timeLeft, setTimeLeft] = useState(() =>
            getTimeRemaining(confession.auto_publish_at),
        );
        const published = timeLeft.total <= 0;

        useEffect(() => {
            const interval = setInterval(() => {
                setTimeLeft(getTimeRemaining(confession.auto_publish_at));
            }, 1000);
            return () => clearInterval(interval);
        }, [confession.auto_publish_at]);

        const suspensePhrases = [
            '☕ Tea is brewing...',
            '👀 Someone is about to spill...',
            '🤫 The walls have ears...',
            '🔥 Tea loading...',
            '🎭 Drama incoming...',
            '⏳ The clock is ticking...',
            '🍵 Your tea is almost ready...',
            '👁️👁️ We see everything...',
        ];
        const phrase =
            suspensePhrases[confession.id?.length % suspensePhrases.length] || suspensePhrases[0];

        return (
            <div className={`pending-card ${published ? 'published' : ''}`}>
                <div className="pending-header">
                    <span className="pending-badge">
                        {published ? '✅ Published' : '⏳ Pending Review'}
                    </span>
                    {confession.media_url && (
                        <span className="media-badge">
                            {confession.media_type === 'video' ? '🎬' : '📸'} Media
                        </span>
                    )}
                </div>

                {!published && (
                    <div className="suspense-banner">
                        <div className="suspense-stars">{'✦'.repeat(8)}</div>
                        <p className="suspense-text">{phrase}</p>
                        <p className="suspense-sub">
                            What could it be? The anticipation is real...
                        </p>
                    </div>
                )}

                {confession.media_url && !published && (
                    <div className="pending-media-blur">
                        {confession.media_type === 'video' ? (
                            <Video size={32} />
                        ) : (
                            <Image size={32} />
                        )}
                        <span>Media hidden until published</span>
                    </div>
                )}

                {confession.media_url && published && (
                    <div className="confession-media">
                        {confession.media_type === 'video' ? (
                            <video src={confession.media_url} controls preload="metadata" />
                        ) : (
                            <img src={confession.media_url} alt="Confession media" loading="lazy" />
                        )}
                    </div>
                )}

                <div className="pending-content">
                    {published ? (
                        <p>{confession.content}</p>
                    ) : (
                        <p className="content-hidden">
                            {confession.content
                                ? confession.content
                                      .split(' ')
                                      .map(() => '▇▇')
                                      .join(' ')
                                : '▇▇ ▇▇▇ ▇▇▇▇ ▇▇ ▇▇▇▇'}
                        </p>
                    )}
                </div>

                <div className="pending-footer">
                    {!published ? (
                        <>
                            <div className="countdown">
                                <Clock size={14} />
                                <span>
                                    Auto-publishes in {timeLeft.hours}h {timeLeft.minutes}m{' '}
                                    {timeLeft.seconds}s
                                </span>
                            </div>
                            <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleCancel(confession.id)}
                                disabled={cancellingId === confession.id}
                            >
                                <Trash2 size={14} />
                                {cancellingId === confession.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                        </>
                    ) : (
                        <span className="published-label">Live on the feed</span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="container confessions-page">
            <div className="confessions-header">
                <h1>🔮 Campus Confessions</h1>
                <p>Spill the tea. Anonymously. Your secrets are safe here.</p>
            </div>

            <div className="create-confession card">
                <div className="create-header">
                    <Avatar src={null} name={isAnonymous ? 'Anonymous' : 'You'} size="md" />
                    <div className="create-options">
                        <div className="anonymous-toggle">
                            <input
                                type="checkbox"
                                id="anon"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                            />
                            <label htmlFor="anon">
                                <span>🔒</span> Anonymous
                            </label>
                        </div>
                    </div>
                </div>

                <textarea
                    placeholder="What's your confession? Spill the tea... (optional if adding media)"
                    value={newConfession}
                    onChange={(e) => setNewConfession(e.target.value)}
                    rows={3}
                    maxLength={280}
                    disabled={isPosting}
                />

                {mediaPreview && (
                    <div className="media-preview">
                        {mediaFile?.type.startsWith('video/') ? (
                            <video src={mediaPreview} controls />
                        ) : (
                            <img src={mediaPreview} alt="Preview" />
                        )}
                        <button className="remove-media" onClick={removeMedia}>
                            <X size={18} />
                        </button>
                    </div>
                )}

                <div className="create-actions">
                    <div className="create-left">
                        <input
                            type="file"
                            accept="image/*,video/*"
                            ref={mediaInputRef}
                            onChange={handleMediaSelect}
                            hidden
                        />
                        <button
                            className="btn btn-sm btn-outline"
                            onClick={() => mediaInputRef.current?.click()}
                            disabled={isPosting}
                        >
                            {mediaFile?.type.startsWith('video/') ? (
                                <Video size={16} />
                            ) : (
                                <Image size={16} />
                            )}
                            {mediaFile ? 'Change Media' : 'Add Media'}
                        </button>
                        <span className="char-count">{newConfession.length}/280</span>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={handlePost}
                        disabled={(!newConfession.trim() && !mediaFile) || isPosting || isUploading}
                    >
                        {isPosting || isUploading ? (
                            <>⏳ Submitting...</>
                        ) : (
                            <>📤 Submit Confession</>
                        )}
                    </button>
                </div>
            </div>

            <div className="rules-banner">
                <span>📜</span>
                <p>
                    Keep it clean, kind, and anonymous. All submissions are reviewed before going
                    live.
                </p>
            </div>

            {pendingConfessions.length > 0 && (
                <div className="pending-section">
                    <div
                        className="pending-section-header"
                        onClick={() => setShowPending(!showPending)}
                    >
                        <h2>
                            🕵️ Your Pending Submissions
                            <span className="pending-count">{pendingConfessions.length}</span>
                        </h2>
                        <span className="toggle-indicator">{showPending ? '▲' : '▼'}</span>
                    </div>
                    {showPending && (
                        <div className="pending-list">
                            {pendingConfessions.map((c) => (
                                <PendingCountdown key={c.id} confession={c} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="confessions-feed">
                {isError ? (
                    <div className="error-state">
                        <p>Failed to load confessions. Try again?</p>
                        <button
                            className="btn btn-primary"
                            onClick={() =>
                                queryClient.invalidateQueries({ queryKey: ['confessions'] })
                            }
                        >
                            Retry
                        </button>
                    </div>
                ) : isLoading ? (
                    <div className="confessions-list">
                        {[...Array(3)].map((_, i) => (
                            <PostSkeleton key={i} />
                        ))}
                    </div>
                ) : confessions.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">🗣️</span>
                        <h3>No confessions yet</h3>
                        <p>Be the first to spill the tea!</p>
                    </div>
                ) : (
                    confessions.map((confession) => (
                        <div key={confession.id} className="confession-card card">
                            <div className="confession-header">
                                <div className="confession-author">
                                    <Avatar
                                        src={null}
                                        name={
                                            confession.is_anonymous || confession.isAnonymous
                                                ? 'Anonymous'
                                                : confession.author_name
                                        }
                                        size="sm"
                                    />
                                    <div className="author-info">
                                        <span className="author-name">
                                            {confession.is_anonymous || confession.isAnonymous
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
                                {(confession.is_anonymous || confession.isAnonymous) && (
                                    <span className="anon-badge">🔮</span>
                                )}
                            </div>

                            {confession.media_url && (
                                <div className="confession-media">
                                    {confession.media_type === 'video' ? (
                                        <video
                                            src={confession.media_url}
                                            controls
                                            preload="metadata"
                                        />
                                    ) : (
                                        <img
                                            src={confession.media_url}
                                            alt="Confession media"
                                            loading="lazy"
                                        />
                                    )}
                                </div>
                            )}

                            <p className="confession-content">{confession.content}</p>

                            <div className="confession-actions">
                                <button
                                    className={`action-btn ${confession.likes > 0 ? 'active' : ''}`}
                                    onClick={() => handleLike(confession.id)}
                                >
                                    <Heart
                                        size={18}
                                        fill={confession.likes > 0 ? 'currentColor' : 'none'}
                                    />
                                    <span>{confession.likes || 0}</span>
                                </button>
                                <button
                                    className={`action-btn ${activeConfessionId === confession.id ? 'active' : ''}`}
                                    onClick={() => handleToggleComments(confession.id)}
                                >
                                    <MessageCircle size={18} />
                                    <span>{confession.comments || 0}</span>
                                </button>
                                <button
                                    className="action-btn"
                                    onClick={() => handleShare(confession)}
                                >
                                    <Share2 size={18} />
                                    <span>Share</span>
                                </button>
                                <button
                                    className="action-btn report"
                                    onClick={() => handleReport(confession.id)}
                                >
                                    <Flag size={18} />
                                    <span>Report</span>
                                </button>
                            </div>

                            {activeConfessionId === confession.id && (
                                <div className="comments-section">
                                    <div className="comments-list">
                                        {isCommentsLoading ? (
                                            <div className="loading-small">Loading comments...</div>
                                        ) : activeComments.length === 0 ? (
                                            <div className="empty-small">No comments yet.</div>
                                        ) : (
                                            activeComments.map((comment) => (
                                                <div key={comment.id} className="comment-item">
                                                    <Avatar
                                                        name={comment.author_username}
                                                        size="xs"
                                                    />
                                                    <div className="comment-content-box">
                                                        <div className="comment-meta">
                                                            <strong>
                                                                @{comment.author_username}
                                                            </strong>
                                                            <span>
                                                                {new Date(
                                                                    comment.created_at,
                                                                ).toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                        <p>{comment.content}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <form
                                        className="comment-input-area"
                                        onSubmit={handleAddComment}
                                    >
                                        <input
                                            type="text"
                                            placeholder="Write a comment..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            disabled={isCommenting}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newComment.trim() || isCommenting}
                                        >
                                            <Send size={18} />
                                        </button>
                                    </form>
                                </div>
                            )}

                            {reportingId === confession.id && (
                                <div
                                    className="report-overlay"
                                    onClick={() => setReportingId(null)}
                                >
                                    <div
                                        className="report-modal"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <h4>Report Confession</h4>
                                        <textarea
                                            placeholder="Why are you reporting this?"
                                            value={reportReason}
                                            onChange={(e) => setReportReason(e.target.value)}
                                            rows={3}
                                        />
                                        <div className="report-actions">
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => setReportingId(null)}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                onClick={submitReport}
                                                disabled={!reportReason.trim()}
                                            >
                                                Submit Report
                                            </button>
                                        </div>
                                    </div>
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
