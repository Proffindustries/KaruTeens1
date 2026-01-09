import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Music, FileText, Download, EyeOff, Flag, Link2, UserMinus, Eye, Trash2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/PostCard.css';
import { useLikePost, useUnlikePost, useAddComment, useComments } from '../hooks/useContent.js';
import { useToast } from '../context/ToastContext.jsx';
import CustomVideoPlayer from './CustomVideoPlayer.jsx';
import CustomAudioPlayer from './CustomAudioPlayer.jsx';
import Comment from './Comment.jsx';
import Avatar from './Avatar.jsx';
import MapPreview from './MapPreview.jsx';

const PostCard = ({ post }) => {
    const navigate = useNavigate();
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [saved, setSaved] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const { showToast } = useToast();
    const currentUser = JSON.parse(localStorage.getItem('user'));

    // Support both id (Postgres/Normalized) and _id (MongoDB)
    const postId = post.id || post._id;

    const isOwner = currentUser?.username === post.user;
    const cardRef = React.useRef(null);
    const menuRef = React.useRef(null);

    // Optimistic UI State
    const [isLiked, setIsLiked] = useState(post.is_liked);
    const [likesCount, setLikesCount] = useState(post.likes || 0);
    const [commentsCount, setCommentsCount] = useState(post.comments || 0);

    // Sync with props if they change (e.g., after a background refetch)
    React.useEffect(() => {
        setIsLiked(post.is_liked);
        setLikesCount(post.likes);
        setCommentsCount(post.comments);
    }, [post.is_liked, post.likes, post.comments]);

    const { mutate: likePost } = useLikePost();
    const { mutate: unlikePost } = useUnlikePost();
    const { mutate: addComment, isPending: isSubmittingComment } = useAddComment();
    const { data: comments, isLoading: isLoadingComments } = useComments(showComments ? postId : null);

    const handleLikeToggle = () => {
        const previousLiked = isLiked;
        const previousCount = likesCount;

        // Optimistic Update
        setIsLiked(!previousLiked);
        setLikesCount(previousLiked ? previousCount - 1 : previousCount + 1);

        if (previousLiked) {
            unlikePost(postId, {
                onError: () => {
                    // Rollback
                    setIsLiked(true);
                    setLikesCount(previousCount);
                    showToast('Failed to unlike post', 'error');
                }
            });
        } else {
            likePost(postId, {
                onError: () => {
                    // Rollback
                    setIsLiked(false);
                    setLikesCount(previousCount);
                    showToast('Failed to like post', 'error');
                }
            });
        }
    };

    // Auto-close comments when scrolled away
    React.useEffect(() => {
        if (!showComments) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting && entry.intersectionRatio === 0) {
                    setShowComments(false);
                }
            },
            { threshold: 0 }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, [showComments]);

    // Handle click outside menu
    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const handleHidePost = () => {
        setIsHidden(true);
        setShowMenu(false);
    };

    const handleReportPost = () => {
        showToast('Report submitted. Our team will review this post.', 'info');
        setShowMenu(false);
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/post/${postId}`;
        navigator.clipboard.writeText(url);
        setShowMenu(false);
        showToast('Link copied to clipboard!', 'success');
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/post/${postId}`;
        const shareData = {
            title: `Post by ${post.user} | Karu Teens`,
            text: post.content ? (post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content) : 'Check out this post on Karu Teens!',
            url: url,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    handleCopyLink();
                }
            }
        } else {
            handleCopyLink();
        }
    };

    const handleDeletePost = () => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            showToast('Post deleted successfully', 'success');
            setIsHidden(true); // Locally hide it
        }
        setShowMenu(false);
    };

    const handleBlockUser = () => {
        showToast(`User @${post.user} has been blocked`, 'info');
        setIsHidden(true);
        setShowMenu(false);
    };

    const handleCommentSubmit = (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        // Optimistic Count Update
        const previousCount = commentsCount;
        setCommentsCount(previousCount + 1);

        addComment({ postId: postId, content: commentText, parent_comment_id: null }, {
            onError: () => {
                setCommentsCount(previousCount);
                showToast('Failed to post comment', 'error');
            }
        });
        setCommentText('');
    };

    const handleReply = (parentCommentId, replyContent) => {
        const previousCount = commentsCount;
        setCommentsCount(previousCount + 1);

        addComment({
            postId: postId,
            content: replyContent,
            parent_comment_id: parentCommentId
        }, {
            onError: () => {
                setCommentsCount(previousCount);
                showToast('Failed to post reply', 'error');
            }
        });
    };

    // Organize comments into nested structure
    const organizeComments = (comments) => {
        if (!comments) return [];

        const commentMap = {};
        const topLevelComments = [];

        // First pass: create a map of all comments
        comments.forEach(comment => {
            commentMap[comment._id] = { ...comment, replies: [] };
        });

        // Second pass: organize into tree structure
        comments.forEach(comment => {
            if (comment.parent_comment_id) {
                // This is a reply
                const parent = commentMap[comment.parent_comment_id];
                if (parent) {
                    // Attach parent info to the reply for WhatsApp style preview
                    commentMap[comment._id].parentInfo = {
                        username: parent.username,
                        content: parent.content
                    };
                    parent.replies.push(commentMap[comment._id]);
                }
            } else {
                // This is a top-level comment
                topLevelComments.push(commentMap[comment._id]);
            }
        });

        return topLevelComments;
    };

    const renderContent = (content) => {
        if (!content) return null;

        // Regex to find hashtags
        const parts = content.split(/(\#[a-zA-Z0-9_]+\b)/g);

        return parts.map((part, i) => {
            if (part.startsWith('#')) {
                return <span key={i} className="hashtag" onClick={(e) => {
                    e.stopPropagation();
                    // Future: Navigate to search with this tag
                    alert(`Filtering by ${part}`);
                }}>{part}</span>;
            }
            return part;
        });
    };

    const organizedComments = React.useMemo(() => organizeComments(comments), [comments]);

    if (isHidden) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="post-card card post-hidden-overlay"
            >
                <EyeOff size={40} style={{ opacity: 0.3 }} />
                <p>Post hidden from your feed</p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="undo-hide-btn" onClick={() => setIsHidden(false)}>Undo</button>
                    <button className="action-btn" onClick={handleReportPost}>Report</button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="post-card card"
        >
            {/* Post Header */}
            <div className="post-header">
                <div className="post-user-info">
                    <Avatar
                        src={post.user_avatar}
                        name={post.user}
                        className="post-avatar"
                    />
                    <div className="post-meta">
                        <span className="post-username">
                            <Link to={`/profile/${post.user}`} className="username-link" style={{ color: 'inherit', textDecoration: 'none' }}>{post.user}</Link>
                            {post.group_name && (
                                <>
                                    <span style={{ fontWeight: 'normal', color: '#636e72', margin: '0 4px' }}>▶</span>
                                    <Link to={`/groups/${post.group_id}`} style={{ color: 'var(--primary-color)', fontWeight: '600', textDecoration: 'none' }}>
                                        {post.group_name}
                                    </Link>
                                </>
                            )}
                        </span>
                        <span className="post-time">{new Date(post.created_at).toLocaleString()}</span>
                    </div>
                </div>
                <div className="post-options-wrapper" ref={menuRef}>
                    <button className="post-options-btn" onClick={() => setShowMenu(!showMenu)}>
                        <MoreHorizontal size={20} />
                    </button>
                    {showMenu && (
                        <div className="post-options-menu">
                            <button className="menu-item" onClick={handleCopyLink}>
                                <Link2 size={18} />
                                Copy Link
                            </button>
                            {!isOwner && (
                                <>
                                    <button className="menu-item" onClick={handleHidePost}>
                                        <EyeOff size={18} />
                                        Not Interested
                                    </button>
                                    <button className="menu-item" onClick={() => { showToast(`Unfollowed @${post.user}`, 'info'); setShowMenu(false); }}>
                                        <UserMinus size={18} />
                                        Unfollow @{post.user}
                                    </button>
                                    <button className="menu-item" onClick={handleBlockUser}>
                                        <UserMinus size={18} style={{ color: '#ff4757' }} />
                                        Block @{post.user}
                                    </button>
                                    <button className="menu-item danger" onClick={handleReportPost}>
                                        <Flag size={18} />
                                        Report Post
                                    </button>
                                </>
                            )}
                            {isOwner && (
                                <>
                                    <button className="menu-item" onClick={() => setShowMenu(false)}>
                                        <FileText size={18} />
                                        Edit Post
                                    </button>
                                    <button className="menu-item danger" onClick={handleDeletePost}>
                                        <Trash2 size={18} />
                                        Delete Post
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Post Content */}
            <div className="post-content">
                {post.content && <p className="post-text">{renderContent(post.content)}</p>}

                {post.location && (
                    <div className="post-location-preview">
                        <MapPreview location={post.location} />
                    </div>
                )}

                {/* Media Attachments */}
                {post.media_urls && post.media_urls.length > 0 && (
                    <div className={`post-media-container ${post.media_urls.length > 1 ? 'grid' : ''} ${post.media_urls.length >= 3 ? 'multi' : ''}`}>
                        {post.media_urls.slice(0, 4).map((url, idx) => {
                            const isVideo = url.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv)$/i) || post.post_type === 'video';
                            const isAudio = url.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i) || post.post_type === 'audio';
                            const isPDF = url.match(/\.pdf$/i);
                            const isImage = url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) || (!isVideo && !isAudio && !isPDF);
                            const isLastVisible = idx === 3 && post.media_urls.length > 4;
                            const remainingCount = post.media_urls.length - 3;

                            // Handle navigation to post details
                            const handleMediaClick = () => {
                                navigate(`/post/${postId}`);
                            };

                            return (
                                <div key={idx} className="media-item" onClick={handleMediaClick} style={{ cursor: 'pointer' }}>
                                    {isVideo ? (
                                        <CustomVideoPlayer src={url} />
                                    ) : isAudio ? (
                                        <CustomAudioPlayer src={url} filename={`Audio ${idx + 1}`} />
                                    ) : isPDF ? (
                                        <div className="file-wrapper-mini" style={{ padding: '20px', background: '#1a1a1a', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <FileText size={32} color="var(--primary-color)" />
                                            {post.media_urls.length === 1 && <span style={{ color: 'white', fontSize: '10px' }}>Open Document</span>}
                                        </div>
                                    ) : isImage ? (
                                        <img src={url} alt={`Post content ${idx + 1}`} className="post-image" loading="lazy" />
                                    ) : (
                                        // Fallback for unknown file types
                                        <div className="file-wrapper-mini" style={{ padding: '20px', background: '#1a1a1a', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <FileText size={32} color="var(--primary-color)" />
                                            <span style={{ color: 'white', fontSize: '10px' }}>File</span>
                                        </div>
                                    )}

                                    {/* Overlay ya '+ N More' kama picha ni mob */}
                                    {isLastVisible && (
                                        <div className="media-overlay">
                                            <span className="overlay-count">+{remainingCount}</span>
                                            <span className="overlay-text">See More</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Post Stats */}
            <div className="post-stats">
                <span>{likesCount} Likes</span>
                <span onClick={() => setShowComments(!showComments)} style={{ cursor: 'pointer' }}>
                    {commentsCount} Comments
                </span>
            </div>

            <div className="post-actions-divider"></div>

            {/* Action Buttons */}
            <div className="post-actions">
                <button
                    className={`action-btn ${isLiked ? 'liked' : ''}`}
                    onClick={handleLikeToggle}
                    style={{ color: isLiked ? '#ff4757' : 'inherit' }}
                >
                    <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                    <span>Like</span>
                </button>

                <button className="action-btn" onClick={() => setShowComments(!showComments)}>
                    <MessageCircle size={20} />
                    <span>Comment</span>
                </button>

                <button className="action-btn" onClick={handleShare}>
                    <Share2 size={20} />
                    <span>Share</span>
                </button>

                <button
                    className={`action-btn ${saved ? 'active-save' : ''}`}
                    onClick={() => setSaved(!saved)}
                >
                    <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
                    <span>Save</span>
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="comments-section">
                    {!currentUser?.is_verified ? (
                        <div className="verification-notice-card" style={{
                            padding: '1.5rem',
                            textAlign: 'center',
                            background: 'rgba(var(--primary), 0.05)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1rem',
                            border: '1px dashed rgba(var(--primary), 0.2)'
                        }}>
                            <Shield size={32} color="#2ed573" style={{ marginBottom: '0.75rem' }} />
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                                Verification required to join the conversation.
                            </p>
                            <Link to="/verification" style={{
                                color: 'rgb(var(--primary))',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                textDecoration: 'underline',
                                marginTop: '0.5rem',
                                display: 'inline-block'
                            }}>
                                Verify now for Ksh 20
                            </Link>
                        </div>
                    ) : (
                        <div className="comment-form" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <Avatar src={currentUser?.avatar_url} name={currentUser?.username} size="sm" />
                            <form onSubmit={handleCommentSubmit} style={{ flex: 1 }}>
                                <input
                                    placeholder="Write a comment..."
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                />
                                <button type="submit" disabled={isSubmittingComment}>
                                    {isSubmittingComment ? '...' : 'Post'}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="comments-list">
                        {isLoadingComments ? (
                            <p className="loading-text">Loading comments...</p>
                        ) : (
                            organizedComments.map(comment => (
                                <Comment
                                    key={comment._id}
                                    comment={comment}
                                    onReply={handleReply}
                                    level={0}
                                    replies={comment.replies}
                                />
                            ))
                        )}
                        {comments?.length === 0 && !isLoadingComments && (
                            <p className="no-comments">No comments yet. Be the first!</p>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default PostCard;
