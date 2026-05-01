import React, { useState, useRef } from 'react';
import {
    Heart,
    MessageCircle,
    Share2,
    Bookmark,
    MoreHorizontal,
    Music,
    FileText,
    Download,
    EyeOff,
    Flag,
    Link2,
    UserMinus,
    Eye,
    Trash2,
    Shield,
    Image,
    X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/PostCard.css';
import {
    useLikePost,
    useUnlikePost,
    useAddComment,
    useComments,
    useDeletePost,
    useReportPost,
    useSavePost,
} from '../hooks/useContent';
import { shouldBlur } from '../utils/contentFilters.js';
import { useToast } from '../context/ToastContext.jsx';
import CustomVideoPlayer from './CustomVideoPlayer.jsx';
import CustomAudioPlayer from './CustomAudioPlayer.jsx';
import Comment from './Comment.jsx';
import StickerPicker from './StickerPicker.jsx';
import Avatar from './Avatar.jsx';
import MapPreview from './MapPreview.jsx';
import safeLocalStorage from '../utils/storage.js';
import { getOptimizedUrl } from '../utils/mediaUtils.js';

const getVideoThumbnail = (url) => {
    if (!url) return null;

    // Improved Cloudinary thumbnail generation
    if (url.includes('cloudinary.com') && url.includes('/video/')) {
        try {
            // Find where 'upload' or 'authenticated' is
            const typeMatch = url.match(/\/(upload|authenticated)\//);
            if (!typeMatch) return null;

            const partToRepl = typeMatch[0];
            // Replace the type and append transformations
            // We use 'so_1' as it's more reliable than 'so_auto' for new uploads
            let thumbUrl = url.replace(partToRepl, `${partToRepl}f_auto,q_auto,so_1,w_1080/`);
            // Change extension to .jpg
            thumbUrl = thumbUrl.replace(/\.[^/.]+$/, '.jpg');
            return thumbUrl;
        } catch (e) {
            return null;
        }
    }

    return null;
};

const PostCard = React.memo(({ post }) => {
    const postId = post.id;
    console.log('PostCard rendering for post:', postId);
    const navigate = useNavigate();
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [commentMedia, setCommentMedia] = useState(null);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const [isNsfwRevealed, setIsNsfwRevealed] = useState(false);
    const { showToast } = useToast();
    const currentUser = JSON.parse(safeLocalStorage.getItem('user') || 'null');
    const fileInputRef = useRef(null);
    const commentInputRef = useRef(null);

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
    const { mutateAsync: addCommentAsync, isPending: isSubmittingComment } = useAddComment();
    const { mutate: deletePost } = useDeletePost();
    const { mutate: reportPost } = useReportPost();
    const { mutate: savePost } = useSavePost();
    const { data: comments, isLoading: isLoadingComments } = useComments(
        showComments ? postId : null,
    );

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
                },
            });
        } else {
            likePost(postId, {
                onError: () => {
                    // Rollback
                    setIsLiked(false);
                    setLikesCount(previousCount);
                    showToast('Failed to like post', 'error');
                },
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
            { threshold: 0 },
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
        const reason = prompt(
            'Why are you reporting this post? (spam, harassment, inappropriate, abuse, violence, misinformation, other)',
        );
        if (reason) {
            reportPost({ postId, reason, description: null });
        }
        setShowMenu(false);
    };

    const handleDeletePost = () => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            deletePost(postId);
        }
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
            text: post.content
                ? post.content.length > 100
                    ? post.content.substring(0, 100) + '...'
                    : post.content
                : 'Check out this post on Karu Teens!',
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

    const handleBlockUser = () => {
        showToast(`User @${post.user} has been blocked`, 'info');
        setIsHidden(true);
        setShowMenu(false);
    };

    const handleCommentSubmit = async (e, customStickerUrl = null) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!commentText.trim() && !commentMedia && !customStickerUrl) return;

        // Optimistic Count Update
        const previousCount = commentsCount;
        setCommentsCount(previousCount + 1);

        try {
            await addCommentAsync({
                postId: postId,
                content: customStickerUrl ? 'Sticker' : commentText,
                parent_comment_id: null,
                mediaFile: commentMedia, // Note: backend doesn't support files yet, but it's here
                mediaUrl: customStickerUrl,
                mediaType: customStickerUrl ? 'sticker' : undefined,
            });
            setCommentText('');
            setCommentMedia(null);
            setShowStickerPicker(false);
            if (commentInputRef.current) {
                commentInputRef.current.style.height = 'inherit';
            }
        } catch (error) {
            setCommentsCount(previousCount);
            showToast('Failed to post comment', 'error');
        }
    };

    const handleMediaSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCommentMedia(file);
        }
    };

    const handleRemoveMedia = () => {
        setCommentMedia(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleReply = async (parentCommentId, replyContent, replyMedia = null, customStickerUrl = null) => {
        const previousCount = commentsCount;
        setCommentsCount(previousCount + 1);

        try {
            await addCommentAsync({
                postId: postId,
                content: replyContent,
                parent_comment_id: parentCommentId,
                mediaFile: replyMedia,
                mediaUrl: customStickerUrl,
                mediaType: customStickerUrl ? 'sticker' : undefined,
            });
        } catch (error) {
            setCommentsCount(previousCount);
            showToast('Failed to post reply', 'error');
            throw error; // Re-throw so Comment.jsx knows it failed
        }
    };

    // Organize comments into nested structure
    const organizeComments = (comments) => {
        if (!comments) return [];

        const commentMap = {};
        const topLevelComments = [];

        // First pass: create a map of all comments
        comments.forEach((comment) => {
            commentMap[comment.id] = { ...comment, replies: [] };
        });

        // Second pass: organize into tree structure
        comments.forEach((comment) => {
            if (comment.parent_id) {
                const parent = commentMap[comment.parent_id];
                if (parent) {
                    commentMap[comment.id].parentInfo = {
                        username: parent.username,
                        content: parent.content,
                    };
                    parent.replies.push(commentMap[comment.id]);
                } else {
                    topLevelComments.push(commentMap[comment.id]);
                }
            } else {
                topLevelComments.push(commentMap[comment.id]);
            }
        });

        return topLevelComments;
    };

    const renderContent = (content) => {
        if (!content) return null;

        // Regex to find hashtags
        const parts = content.split(/(#[a-zA-Z0-9_]+\b)/g);

        return parts.map((part, i) => {
            if (part.startsWith('#')) {
                return (
                    <span
                        key={i}
                        className="hashtag"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Use replace: true if already on explore to avoid history bloat
                            const isFeed = window.location.pathname.startsWith('/feed');
                            navigate(`/feed?search=${encodeURIComponent(part)}`, {
                                replace: isFeed,
                            });
                        }}
                    >
                        {part}
                    </span>
                );
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
                    <button className="undo-hide-btn" onClick={() => setIsHidden(false)}>
                        Undo
                    </button>
                    <button className="action-btn" onClick={handleReportPost}>
                        Report
                    </button>
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
                        src={post.is_anonymous ? null : post.user_avatar}
                        name={post.is_anonymous ? 'Anonymous' : post.user}
                        className="post-avatar"
                    />
                    <div className="post-meta">
                        <span className="post-username">
                            {post.is_anonymous ? (
                                <span style={{ fontWeight: 600 }}>Anonymous 👻</span>
                            ) : (
                                <Link
                                    to={`/profile/${post.user}`}
                                    className="username-link"
                                    style={{ color: 'inherit', textDecoration: 'none' }}
                                >
                                    {post.user}
                                </Link>
                            )}
                            {post.group_name && (
                                <>
                                    <span
                                        style={{
                                            fontWeight: 'normal',
                                            color: '#636e72',
                                            margin: '0 4px',
                                        }}
                                    >
                                        ▶
                                    </span>
                                    <Link to={`/groups/${post.group_id}`} className="group-link">
                                        {post.group_name}
                                    </Link>
                                </>
                            )}
                            {post.page_name && (
                                <>
                                    <span
                                        style={{
                                            fontWeight: 'normal',
                                            color: '#636e72',
                                            margin: '0 4px',
                                        }}
                                    >
                                        ▶
                                    </span>
                                    <Link to={`/p/${post.page_id}`} className="page-link">
                                        {post.page_name}
                                    </Link>
                                </>
                            )}
                        </span>
                        <span className="post-time">
                            {new Date(post.created_at).toLocaleString()}
                        </span>
                        {post.algorithmic_score > 0 && (
                            <span
                                className="post-algo-score"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    marginLeft: '12px',
                                    fontSize: '0.8rem',
                                    color: '#ff4757',
                                    background: 'rgba(255, 71, 87, 0.1)',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                }}
                                title="Algorithmic Engagement Score"
                            >
                                🔥 {post.algorithmic_score} Score
                            </span>
                        )}
                    </div>
                </div>
                <div className="post-options-wrapper" ref={menuRef}>
                    <button className="post-options-btn" onClick={() => setShowMenu(!showMenu)}>
                        <MoreHorizontal size={20} />
                    </button>
                    {showMenu && (
                        <div className="post-options-menu">
                            <button
                                className="menu-item"
                                onClick={handleCopyLink}
                                aria-label="Copy post link"
                            >
                                <Link2 size={18} />
                                Copy Link
                            </button>
                            {!isOwner && !post.is_anonymous && (
                                <>
                                    <button
                                        className="menu-item"
                                        onClick={handleHidePost}
                                        aria-label="Hide this post"
                                    >
                                        <EyeOff size={18} />
                                        Not Interested
                                    </button>
                                    <button
                                        className="menu-item"
                                        onClick={() => {
                                            showToast(`Unfollowed @${post.user}`, 'info');
                                            setShowMenu(false);
                                        }}
                                    >
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
                                    <button
                                        className="menu-item"
                                        onClick={() => setShowMenu(false)}
                                    >
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
            <div
                className={`post-content-wrapper ${shouldBlur(post) && !isNsfwRevealed ? 'nsfw-blurred' : ''}`}
            >
                <div className="post-content">
                    {post.content && <p className="post-text">{renderContent(post.content)}</p>}

                    {post.location && (
                        <div className="post-location-preview">
                            <MapPreview location={post.location} />
                        </div>
                    )}

                    {/* Media Attachments */}
                    {post.media_urls && post.media_urls.length > 0 && (
                        <div
                            className={`post-media-container ${post.media_urls.length > 1 ? 'grid' : ''} ${post.media_urls.length >= 3 ? 'multi' : ''}`}
                        >
                            {post.media_urls.slice(0, 4).map((url, idx) => {
                                const isVideo =
                                    url.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv)$/i) ||
                                    url.includes('video/upload') ||
                                    post.post_type === 'video';
                                const isAudio =
                                    url.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i) ||
                                    post.post_type === 'audio';
                                const isPDF = url.match(/\.pdf$/i);
                                const isExcel = url.match(/\.(xls|xlsx)$/i) || url.includes('spreadsheet');
                                const isImage =
                                    url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/i) ||
                                    post.post_type === 'image' ||
                                    (!isVideo &&
                                        !isAudio &&
                                        !isPDF &&
                                        !isExcel &&
                                        url.includes('cloudinary.com'));
                                const isLastVisible = idx === 3 && post.media_urls.length > 4;
                                const remainingCount = post.media_urls.length - 3;

                                // Handle navigation to post details (outside video play zone)
                                const handleMediaClick = (e) => {
                                    if (shouldBlur(post) && !isNsfwRevealed) return;
                                    // Only navigate if clicking outside the video play zone
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const y = e.clientY - rect.top;
                                    const centerZone = {
                                        left: rect.width * 0.25,
                                        right: rect.width * 0.75,
                                        top: rect.height * 0.25,
                                        bottom: rect.height * 0.75,
                                    };
                                    // If click is in center quadrant, play video instead
                                    if (
                                        x >= centerZone.left &&
                                        x <= centerZone.right &&
                                        y >= centerZone.top &&
                                        y <= centerZone.bottom &&
                                        isVideo
                                    ) {
                                        return; // Let video player handle it
                                    }

                                    // If it's audio, don't navigate (let the player handle it)
                                    if (isAudio) {
                                        return;
                                    }

                                    // Only navigate if we're not already on the post detail page
                                    if (window.location.pathname !== `/post/${postId}`) {
                                        navigate(`/post/${postId}`);
                                    }
                                };

                                return (
                                    <div
                                        key={idx}
                                        className="media-item"
                                        onClick={handleMediaClick}
                                        style={{ cursor: 'pointer', position: 'relative' }}
                                    >
                                        {isVideo ? (
                                            <div className="video-wrapper">
                                                <CustomVideoPlayer
                                                    src={url}
                                                    poster={getVideoThumbnail(url)}
                                                />
                                            </div>
                                        ) : isAudio ? (
                                            <CustomAudioPlayer
                                                src={url}
                                                filename={`Audio ${idx + 1}`}
                                            />
                                        ) : isPDF ? (
                                            <iframe
                                                src={`${url}#toolbar=0&navpanes=0&scrollbar=0`}
                                                className="post-pdf-preview"
                                                style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none', background: '#e9e9e9' }}
                                                title="PDF Preview"
                                            />
                                        ) : isExcel ? (
                                            <div
                                                className="file-wrapper-mini"
                                                style={{
                                                    padding: '20px',
                                                    background: '#1a1a1a',
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                }}
                                            >
                                                <div style={{ background: '#217346', padding: '12px', borderRadius: '8px' }}>
                                                    <FileText size={32} color="white" />
                                                </div>
                                                <span style={{ color: 'white', fontSize: '10px', textAlign: 'center', wordBreak: 'break-all' }}>
                                                    Excel Document
                                                </span>
                                            </div>
                                        ) : isImage ? (
                                            <img
                                                src={getOptimizedUrl(url, 'f_auto,q_auto,w_800')}
                                                alt={`Post content ${idx + 1}`}
                                                className="post-image"
                                                loading="lazy"
                                            />
                                        ) : (
                                            // Fallback for unknown file types
                                            <div
                                                className="file-wrapper-mini"
                                                style={{
                                                    padding: '20px',
                                                    background: '#1a1a1a',
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                }}
                                            >
                                                <FileText size={32} color="var(--primary-color)" />
                                                <span style={{ color: 'white', fontSize: '10px' }}>
                                                    File
                                                </span>
                                            </div>
                                        )}

                                        {/* Overlay ya '+ N More' kama picha ni mob */}
                                        {isLastVisible && (
                                            <div className="media-overlay">
                                                <span className="overlay-count">
                                                    +{remainingCount}
                                                </span>
                                                <span className="overlay-text">See More</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {shouldBlur(post) && !isNsfwRevealed && (
                    <div className="nsfw-overlay" onClick={() => setIsNsfwRevealed(true)}>
                        <Shield size={32} />
                        <p>Sensitive Content</p>
                        <button className="reveal-btn">Tap to View</button>
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
                    <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
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
                    className={`action-btn ${post.is_saved ? 'active-save' : ''}`}
                    onClick={() => savePost(postId)}
                >
                    <Bookmark size={20} fill={post.is_saved ? 'currentColor' : 'none'} />
                    <span>{post.is_saved ? 'Saved' : 'Save'}</span>
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="comments-section">
                    {!currentUser?.is_verified ? (
                        <div
                            className="verification-notice-card"
                            style={{
                                padding: '1.5rem',
                                textAlign: 'center',
                                background: 'rgba(var(--primary), 0.05)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '1rem',
                                border: '1px dashed rgba(var(--primary), 0.2)',
                            }}
                        >
                            <Shield size={32} color="#2ed573" style={{ marginBottom: '0.75rem' }} />
                            <p
                                style={{
                                    fontSize: '0.9rem',
                                    color: 'var(--text-primary)',
                                    fontWeight: '500',
                                }}
                            >
                                Verification required to join the conversation.
                            </p>
                            <Link
                                to="/verification"
                                style={{
                                    color: 'rgb(var(--primary))',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    textDecoration: 'underline',
                                    marginTop: '0.5rem',
                                    display: 'inline-block',
                                }}
                            >
                                Verify now for Ksh 20
                            </Link>
                        </div>
                    ) : (
                        <div
                            className="comment-form"
                            style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
                        >
                            <Avatar
                                src={currentUser?.avatar_url}
                                name={currentUser?.username}
                                size="sm"
                            />
                            <form
                                onSubmit={handleCommentSubmit}
                                style={{ flex: 1, position: 'relative' }}
                            >
                                <textarea
                                    ref={commentInputRef}
                                    placeholder="Write a comment..."
                                    value={commentText}
                                    onChange={(e) => {
                                        setCommentText(e.target.value);
                                        // Auto-expand
                                        e.target.style.height = 'inherit';
                                        e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                                    }}
                                    rows="1"
                                    style={{
                                        width: '100%',
                                        padding: '10px 80px 10px 12px',
                                        borderRadius: '20px',
                                        border: '1px solid #dfe4ea',
                                        outline: 'none',
                                        resize: 'none',
                                        lineHeight: '1.5',
                                        maxHeight: '150px',
                                        display: 'block',
                                        fontFamily: 'inherit',
                                        fontSize: '0.95rem',
                                    }}
                                />
                                <div
                                    className="comment-form-actions"
                                    style={{
                                        position: 'absolute',
                                        right: '8px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        display: 'flex',
                                        gap: '4px',
                                    }}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleMediaSelect}
                                        accept="image/*,video/*"
                                        hidden
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowStickerPicker(!showStickerPicker)}
                                        className="btn-media"
                                        title="Add Sticker"
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            color: showStickerPicker ? 'var(--primary)' : 'inherit',
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/><path d="M10 12.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z"/><path d="M14 12.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z"/><path d="M10 16c.5-1.5 1.5-2 2-2s1.5.5 2 2"/></svg>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="btn-media"
                                        title="Add media"
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '4px',
                                        }}
                                    >
                                        <Image size={16} />
                                    </button>
                                    
                                    {showStickerPicker && (
                                        <div style={{ position: 'absolute', bottom: '40px', right: '0', zIndex: 100 }}>
                                            <StickerPicker
                                                onSelect={(url) => handleCommentSubmit(null, url)}
                                                onClose={() => setShowStickerPicker(false)}
                                            />
                                        </div>
                                    )}
                                    {commentMedia && (
                                        <div
                                            className="media-preview"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }}
                                        >
                                            <span style={{ fontSize: '0.8rem' }}>
                                                {commentMedia.name}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleRemoveMedia}
                                                className="btn-remove-media"
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '2px',
                                                }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={
                                            isSubmittingComment ||
                                            (!commentText.trim() && !commentMedia)
                                        }
                                    >
                                        {isSubmittingComment ? '...' : 'Post'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="comments-list">
                        {isLoadingComments ? (
                            <p className="loading-text">Loading comments...</p>
                        ) : (
                            organizedComments.map((comment) => (
                                <Comment
                                    key={comment.id}
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
});

export default PostCard;
