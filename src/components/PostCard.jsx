import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    Heart,
    MessageCircle,
    Share2,
    Bookmark,
    MoreHorizontal,
    FileText,
    EyeOff,
    Flag,
    Link2,
    UserMinus,
    Trash2,
    Shield,
    Image,
    X,
    Repeat2,
    Calendar,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import '../styles/PostCard.css';
import {
    useLikePost,
    useUnlikePost,
    useAddComment,
    useComments,
    useDeletePost,
    useReportPost,
    useSavePost,
    useVotePoll,
    useHidePost,
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
import { getOptimizedUrl, getVariantUrl, getResponsiveImageUrl } from '../utils/mediaUtils.js';
import { useMediaUpload } from '../hooks/useMedia';
import { useAuthContext } from '../context/AuthContext.jsx';

const getVideoThumbnail = (url) => {
    if (!url) return null;
    if (url.includes('cloudinary.com') && url.includes('/video/')) {
        try {
            const typeMatch = url.match(/\/(upload|authenticated)\//);
            if (!typeMatch) return null;
            const partToRepl = typeMatch[0];
            let thumbUrl = url.replace(partToRepl, `${partToRepl}f_auto,q_auto,so_1,w_1080/`);
            thumbUrl = thumbUrl.replace(/\.[^/.]+$/, '.jpg');
            return thumbUrl;
        } catch {
            return null;
        }
    }
    return null;
};

const getFileMeta = (url) => {
    if (url.match(/\.pdf$/i))
        return { label: 'PDF Document', icon: FileText, color: '#dc3545', type: 'pdf' };
    if (url.match(/\.(xls|xlsx)$/i))
        return { label: 'Excel Spreadsheet', icon: FileText, color: '#217346', type: 'excel' };
    if (url.match(/\.(doc|docx)$/i))
        return { label: 'Word Document', icon: FileText, color: '#2b579a', type: 'word' };
    if (url.match(/\.(ppt|pptx)$/i))
        return { label: 'PowerPoint', icon: FileText, color: '#b7472a', type: 'ppt' };
    return { label: 'Document', icon: FileText, color: '#6c757d', type: 'default' };
};

const PostCard = ({ post, onReport, defaultOpen = false }) => {
    const postId = post.id;
    const navigate = useNavigate();
    const [showComments, setShowComments] = useState(defaultOpen);
    const [commentText, setCommentText] = useState('');
    const [commentMedia, setCommentMedia] = useState(null);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const [isNsfwRevealed, setIsNsfwRevealed] = useState(false);
    const { showToast } = useToast();
    const { user: currentUser } = useAuthContext();
    const { uploadMedia } = useMediaUpload();
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const fileInputRef = useRef(null);
    const commentInputRef = useRef(null);

    const isOwner = currentUser?.id === post.author_id || currentUser?.username === post.user;
    const cardRef = useRef(null);
    const menuRef = useRef(null);

    const [isLiked, setIsLiked] = useState(post.is_liked);
    const [likesCount, setLikesCount] = useState(post.likes || 0);
    const [commentsCount, setCommentsCount] = useState(post.comments || 0);
    const [shareCount, setShareCount] = useState(post.share_count || 0);

    const [impressionLogged, setImpressionLogged] = useState(false);

    useEffect(() => {
        if (post.is_sponsored && !impressionLogged && cardRef.current) {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        api.post('/ads/tracker', {
                            creative_id: post.ad_id,
                            event_type: 'impression',
                        }).catch(() => {});
                        setImpressionLogged(true);
                    }
                },
                { threshold: 0.5 },
            );
            observer.observe(cardRef.current);
            return () => observer.disconnect();
        }
    }, [post.is_sponsored, post.ad_id, impressionLogged]);

    const handleAdClick = async (e) => {
        e.stopPropagation();
        try {
            await api.post('/ads/tracker', {
                creative_id: post.ad_id,
                event_type: 'click',
            });
        } catch (e) {
            console.warn('Ad tracker failed:', e);
        }
        if (post.cta_url) {
            window.open(post.cta_url, '_blank');
        }
    };

    useEffect(() => {
        setIsLiked(post.is_liked);
        setLikesCount(post.likes);
        setCommentsCount(post.comments);
        setShareCount(post.share_count || 0);
    }, [post.is_liked, post.likes, post.comments, post.share_count]);

    const { mutate: likePost } = useLikePost();
    const { mutate: unlikePost } = useUnlikePost();
    const { mutateAsync: addCommentAsync } = useAddComment();
    const { mutate: deletePost } = useDeletePost();
    const { mutate: reportPost } = useReportPost();
    const { mutate: savePost } = useSavePost();
    const { mutate: votePoll } = useVotePoll();
    const { mutate: hidePostPersistently } = useHidePost();
    const { data: comments, isLoading: isLoadingComments } = useComments(
        showComments ? postId : null,
    );

    const handleLikeToggle = useCallback(() => {
        const previousLiked = isLiked;
        const previousCount = likesCount;
        setIsLiked(!previousLiked);
        setLikesCount(previousLiked ? previousCount - 1 : previousCount + 1);
        if (previousLiked) {
            unlikePost(postId, {
                onError: () => {
                    setIsLiked(true);
                    setLikesCount(previousCount);
                    showToast('Failed to unlike post', 'error');
                },
            });
        } else {
            likePost(postId, {
                onError: () => {
                    setIsLiked(false);
                    setLikesCount(previousCount);
                    showToast('Failed to like post', 'error');
                },
            });
        }
    }, [isLiked, likesCount, postId, likePost, unlikePost, showToast]);

    useEffect(() => {
        if (!showComments) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting && entry.intersectionRatio === 0) setShowComments(false);
            },
            { threshold: 0 },
        );
        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, [showComments]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
        };
        if (showMenu) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const handleHidePost = useCallback(() => {
        setIsHidden(true);
        setShowMenu(false);
        hidePostPersistently(postId);
    }, [postId, hidePostPersistently]);

    const handleReportPost = useCallback(() => {
        setShowMenu(false);
        if (onReport) {
            onReport(post);
        }
    }, [onReport, post]);

    const handleDeletePost = useCallback(() => {
        if (window.confirm('Are you sure you want to delete this post?')) deletePost(postId);
        setShowMenu(false);
    }, [postId, deletePost]);

    const handleCopyLink = useCallback(() => {
        const url = `${window.location.origin}/post/${postId}`;
        navigator.clipboard.writeText(url);
        setShowMenu(false);
        showToast('Link copied to clipboard!', 'success');
    }, [postId, showToast]);

    const handleShare = useCallback(async () => {
        const url = `${window.location.origin}/post/${postId}`;
        const shareData = {
            title: `Post by ${post.user} | Karu Teens`,
            text: post.content
                ? post.content.length > 100
                    ? post.content.substring(0, 100) + '...'
                    : post.content
                : 'Check out this post on Karu Teens!',
            url,
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                setShareCount((c) => c + 1);
            } catch (err) {
                if (err.name !== 'AbortError') handleCopyLink();
            }
        } else {
            handleCopyLink();
        }
    }, [postId, post.user, post.content, handleCopyLink]);

    const handleBlockUser = useCallback(() => {
        showToast(`User @${post.user} has been blocked`, 'info');
        setIsHidden(true);
        setShowMenu(false);
    }, [post.user, showToast]);

    const handleCommentSubmit = useCallback(
        async (e, customStickerUrl = null) => {
            if (e?.preventDefault) e.preventDefault();
            if (!commentText.trim() && !commentMedia && !customStickerUrl) return;
            setIsSubmittingComment(true);
            try {
                let uploadedUrl = customStickerUrl;
                let mediaType = customStickerUrl ? 'sticker' : undefined;
                if (commentMedia) {
                    uploadedUrl = await uploadMedia(commentMedia);
                    if (commentMedia.type.startsWith('image/')) mediaType = 'image';
                    else if (commentMedia.type.startsWith('video/')) mediaType = 'video';
                    else if (commentMedia.type.startsWith('audio/')) mediaType = 'audio';
                    else mediaType = 'file';
                }
                await addCommentAsync({
                    postId,
                    content: customStickerUrl ? 'Sticker' : commentText,
                    parentCommentId: undefined,
                    mediaUrl: uploadedUrl,
                    mediaType,
                });
                setCommentText('');
                setCommentMedia(null);
                setShowStickerPicker(false);
                if (commentInputRef.current) commentInputRef.current.style.height = 'inherit';
            } catch (error) {
                showToast('Failed to post comment', 'error');
            } finally {
                setIsSubmittingComment(false);
            }
        },
        [commentText, commentMedia, postId, addCommentAsync, uploadMedia, showToast],
    );

    const handleMediaSelect = useCallback((e) => {
        const file = e.target.files[0];
        if (file) setCommentMedia(file);
    }, []);

    const handleRemoveMedia = useCallback(() => {
        setCommentMedia(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const handleReply = useCallback(
        async (parentCommentId, replyContent, replyMedia = null, customStickerUrl = null) => {
            const previousCount = commentsCount;
            setCommentsCount(previousCount + 1);
            try {
                let uploadedUrl = customStickerUrl;
                let mediaType = customStickerUrl ? 'sticker' : undefined;
                if (replyMedia) {
                    uploadedUrl = await uploadMedia(replyMedia);
                    if (replyMedia.type.startsWith('image/')) mediaType = 'image';
                    else if (replyMedia.type.startsWith('video/')) mediaType = 'video';
                    else if (replyMedia.type.startsWith('audio/')) mediaType = 'audio';
                    else mediaType = 'file';
                }
                await addCommentAsync({
                    postId,
                    content: replyContent,
                    parentCommentId,
                    mediaUrl: uploadedUrl,
                    mediaType,
                });
            } catch {
                setCommentsCount(previousCount);
                showToast('Failed to post reply', 'error');
            }
        },
        [commentsCount, postId, addCommentAsync, uploadMedia, showToast],
    );

    const organizeComments = useCallback((comments) => {
        if (!comments) return [];
        const commentMap = {};
        const topLevelComments = [];
        comments.forEach((comment) => {
            commentMap[comment.id] = { ...comment, replies: [] };
        });
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
    }, []);

    const renderContent = useCallback(
        (content) => {
            if (!content) return null;
            const parts = content.split(/(#[a-zA-Z0-9_]+\b|@[a-zA-Z0-9_]+\b)/g);
            return parts.map((part, i) => {
                if (part.startsWith('#')) {
                    return (
                        <span
                            key={i}
                            className="hashtag"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/feed?search=${encodeURIComponent(part)}`, {
                                    replace: window.location.pathname.startsWith('/feed'),
                                });
                            }}
                        >
                            {part}
                        </span>
                    );
                }
                if (part.startsWith('@')) {
                    const username = part.substring(1);
                    return (
                        <Link
                            key={i}
                            to={`/profile/${username}`}
                            className="mention"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {part}
                        </Link>
                    );
                }
                return part;
            });
        },
        [navigate],
    );

    const organizedComments = useMemo(
        () => organizeComments(comments),
        [comments, organizeComments],
    );

    const isScheduled = post.status === 'scheduled';

    if (isHidden) {
        return (
            <div className="post-card card post-hidden-overlay">
                <EyeOff size={40} className="opacity-30" />
                <p>Post hidden from your feed</p>
                <div className="post-hidden-actions">
                    <button className="undo-hide-btn" onClick={() => setIsHidden(false)}>
                        Undo
                    </button>
                    <button className="action-btn" onClick={handleReportPost}>
                        Report
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div ref={cardRef} className="post-card card post-card-animated">
            <div className="post-header">
                <div className="post-user-info">
                    <Avatar
                        src={post.is_anonymous ? null : post.user_avatar}
                        name={post.is_anonymous ? 'Anonymous' : post.user}
                        className="post-avatar"
                    />
                    <div className="post-meta">
                        <span className="post-username">
                            {post.is_sponsored ? (
                                <span className="sponsored-label">Sponsored</span>
                            ) : post.is_anonymous ? (
                                <span className="anonymous-label">Anonymous 👻</span>
                            ) : (
                                <Link to={`/profile/${post.user}`} className="username-link">
                                    {post.user}
                                </Link>
                            )}
                            {isScheduled && (
                                <span className="scheduled-chip">
                                    <Calendar size={12} /> Scheduled
                                </span>
                            )}
                            {post.group_name && (
                                <>
                                    <span className="separator-arrow">▶</span>
                                    <Link to={`/groups/${post.group_id}`} className="group-link">
                                        {post.group_name}
                                    </Link>
                                </>
                            )}
                            {post.page_name && (
                                <>
                                    <span className="separator-arrow">▶</span>
                                    <Link to={`/p/${post.page_id}`} className="page-link">
                                        {post.page_name}
                                    </Link>
                                </>
                            )}
                        </span>
                        <span className="post-time">
                            {new Date(post.created_at).toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="post-options-wrapper" ref={menuRef}>
                    <button
                        className="post-options-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        aria-label="Post options"
                    >
                        <MoreHorizontal size={20} />
                    </button>
                    {showMenu && (
                        <div className="post-options-menu">
                            <button className="menu-item" onClick={handleCopyLink}>
                                <Link2 size={18} /> Copy Link
                            </button>
                            {!isOwner && !post.is_anonymous && (
                                <>
                                    <button className="menu-item" onClick={handleHidePost}>
                                        <EyeOff size={18} /> Not Interested
                                    </button>
                                    <button
                                        className="menu-item"
                                        onClick={() => {
                                            showToast(`Unfollowed @${post.user}`, 'info');
                                            setShowMenu(false);
                                        }}
                                    >
                                        <UserMinus size={18} /> Unfollow @{post.user}
                                    </button>
                                    <button className="menu-item danger" onClick={handleBlockUser}>
                                        <UserMinus size={18} /> Block @{post.user}
                                    </button>
                                    <button className="menu-item danger" onClick={handleReportPost}>
                                        <Flag size={18} /> Report Post
                                    </button>
                                </>
                            )}
                            {isOwner && (
                                <>
                                    {currentUser?.role === 'admin' && (
                                        <button
                                            className="menu-item"
                                            onClick={() => setShowMenu(false)}
                                        >
                                            <FileText size={18} /> Edit Post
                                        </button>
                                    )}
                                    <button className="menu-item danger" onClick={handleDeletePost}>
                                        <Trash2 size={18} /> Delete Post
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div
                className={`post-content-wrapper ${shouldBlur(post) && !isNsfwRevealed ? 'nsfw-blurred' : ''}`}
            >
                <div
                    className="post-content"
                    onClick={post.is_sponsored ? handleAdClick : undefined}
                >
                    {post.content && <p className="post-text">{renderContent(post.content)}</p>}
                    {post.is_sponsored && post.description && (
                        <p className="post-description">{post.description}</p>
                    )}

                    {post.location && (
                        <div className="post-location-preview">
                            <MapPreview location={post.location} />
                        </div>
                    )}

                    {post.poll && (
                        <div className="post-poll-container" onClick={(e) => e.stopPropagation()}>
                            <h4 className="poll-question">{post.poll.question}</h4>
                            <div className="poll-options">
                                {(() => {
                                    const totalVotes = post.poll.options.reduce(
                                        (acc, opt) => acc + (opt.voter_ids?.length || 0),
                                        0,
                                    );
                                    const hasVoted = post.poll.options.some((opt) =>
                                        opt.voter_ids?.includes(currentUser?.id),
                                    );
                                    return post.poll.options.map((opt, idx) => {
                                        const voteCount = opt.voter_ids?.length || 0;
                                        const percentage =
                                            totalVotes > 0
                                                ? Math.round((voteCount / totalVotes) * 100)
                                                : 0;
                                        const isMyVote = opt.voter_ids?.includes(currentUser?.id);
                                        return (
                                            <div
                                                key={idx}
                                                className={`poll-option ${isMyVote ? 'voted' : ''} ${hasVoted ? 'results-view' : ''}`}
                                                onClick={() =>
                                                    !hasVoted &&
                                                    votePoll({ postId, optionIndex: idx })
                                                }
                                            >
                                                {hasVoted && (
                                                    <div
                                                        className="poll-option-bg"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                )}
                                                <div className="poll-option-content">
                                                    <span className="poll-option-text">
                                                        {opt.text}
                                                    </span>
                                                    {hasVoted && (
                                                        <span className="poll-option-percentage">
                                                            {percentage}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                            <div className="poll-footer">
                                <span>
                                    {post.poll.options.reduce(
                                        (acc, opt) => acc + (opt.voter_ids?.length || 0),
                                        0,
                                    )}{' '}
                                    votes
                                </span>
                                {post.poll.is_multiple && (
                                    <span className="poll-badge">Multiple Choice</span>
                                )}
                            </div>
                        </div>
                    )}

                    {post.media_urls &&
                        post.media_urls.length > 0 &&
                        (() => {
                            const videoRegex = /\.(mp4|webm|mov|avi|mkv|3gp|ts|mts|flv)([?&-]|$)/i;
                            const imageRegex = /\.(jpg|jpeg|png|gif|webp|avif|svg)([?&-]|$)/i;
                            const docRegex = /\.(pdf|xls|xlsx|doc|docx|ppt|pptx)([?&-]|$)/i;
                            const audioRegex = /\.(mp3|wav|ogg|m4a)([?&-]|$)/i;
                            const featuredVideo = post.media_urls.find(
                                (u) => u.match(videoRegex) || post.post_type === 'video',
                            );
                            const remainingMedia = post.media_urls.filter(
                                (u) => u !== featuredVideo,
                            );
                            const featuredAudio = remainingMedia.find(
                                (u) => u.match(audioRegex) || post.post_type === 'audio',
                            );
                            const remainingMedia2 = remainingMedia.filter(
                                (u) => u !== featuredAudio,
                            );
                            const documents = remainingMedia2.filter(
                                (u) => u.match(docRegex) || post.post_type === 'file',
                            );
                            const images = remainingMedia2.filter(
                                (u) =>
                                    !documents.includes(u) &&
                                    (u.match(imageRegex) ||
                                        (!u.match(videoRegex) &&
                                            !u.match(audioRegex) &&
                                            post.post_type !== 'video' &&
                                            post.post_type !== 'audio')),
                            );

                            return (
                                <div className="post-media-container">
                                    {featuredVideo && (
                                        <div className="video-priority-container">
                                            <div className="video-wrapper">
                                                <CustomVideoPlayer
                                                    src={getVariantUrl(featuredVideo)}
                                                    poster={
                                                        getVideoThumbnail(featuredVideo) ||
                                                        featuredVideo + '?poster=true'
                                                    }
                                                    crossOrigin="anonymous"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {featuredAudio && (
                                        <div
                                            className="audio-container"
                                            style={{ padding: '1rem' }}
                                        >
                                            <CustomAudioPlayer
                                                src={featuredAudio}
                                                filename={
                                                    featuredAudio.split('/').pop()?.split('?')[0] ||
                                                    'Audio'
                                                }
                                                id={featuredAudio}
                                            />
                                        </div>
                                    )}
                                    {images.length > 0 && (
                                        <div
                                            className={`image-grid ${images.length > 1 ? 'grid-layout' : ''}`}
                                        >
                                            {images.slice(0, 3).map((url, idx) => (
                                                <div key={idx} className="image-grid-cell">
                                                    <img
                                                        src={getResponsiveImageUrl(
                                                            getOptimizedUrl(
                                                                url,
                                                                'f_auto,q_auto,w_400',
                                                            ),
                                                        )}
                                                        alt="Post media"
                                                        loading="lazy"
                                                        crossOrigin="anonymous"
                                                        className="image-grid-img"
                                                    />
                                                    {idx === 2 && images.length > 3 && (
                                                        <div className="image-grid-overlay">
                                                            +{images.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {documents.map((url, idx) => {
                                        const meta = getFileMeta(url);
                                        const Icon = meta.icon;
                                        const isPdf = meta.type === 'pdf';
                                        return (
                                            <div key={`doc-${idx}`} className="doc-tile">
                                                {isPdf ? (
                                                    <div className="pdf-thumb">
                                                        <img
                                                            src={
                                                                url.replace(/\.[^/.]+$/, '.jpg') +
                                                                '?page=1'
                                                            }
                                                            alt="PDF Preview"
                                                            crossOrigin="anonymous"
                                                            className="pdf-thumb-img"
                                                        />
                                                        <span className="pdf-badge">PDF</span>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="doc-icon-box"
                                                        style={{ background: meta.color }}
                                                    >
                                                        <Icon size={24} color="white" />
                                                    </div>
                                                )}
                                                <div className="doc-info">
                                                    <span className="doc-name">
                                                        {url.split('/').pop().split('?')[0]}
                                                    </span>
                                                    <span className="doc-label">{meta.label}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                </div>

                {shouldBlur(post) && !isNsfwRevealed && (
                    <div className="nsfw-overlay" onClick={() => setIsNsfwRevealed(true)}>
                        <Shield size={32} />
                        <p>Sensitive Content</p>
                        <button className="reveal-btn">Tap to View</button>
                    </div>
                )}
            </div>

            {post.is_sponsored ? (
                <div className="sponsored-footer-flex">
                    <button className="sponsored-cta-btn" onClick={handleAdClick}>
                        {post.cta_text || 'Learn More'}
                    </button>
                </div>
            ) : (
                <>
                    <div className="post-stats">
                        <span>{likesCount} Likes</span>
                        <span onClick={() => setShowComments(!showComments)}>
                            {commentsCount} Comments
                        </span>
                        <span>{shareCount} Shares</span>
                    </div>
                    <div className="post-actions-divider" />
                    <div className="post-actions">
                        <button
                            className={`action-btn ${isLiked ? 'liked' : ''}`}
                            onClick={handleLikeToggle}
                        >
                            <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
                            <span>Like</span>
                        </button>
                        <button
                            className="action-btn"
                            onClick={() => setShowComments(!showComments)}
                        >
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
                            <span>Save</span>
                        </button>
                    </div>
                </>
            )}

            {showComments && (
                <div className="comments-section">
                    {!currentUser?.is_verified ? (
                        <div className="verification-notice-card">
                            <Shield size={32} color="#2ed573" />
                            <p>Verification required to join the conversation.</p>
                            <Link to="/verification" className="verification-link">
                                Verify now for Ksh 20
                            </Link>
                        </div>
                    ) : (
                        <div className="comment-form-flex">
                            <Avatar
                                src={currentUser?.avatar_url}
                                name={currentUser?.username}
                                size="sm"
                            />
                            <form onSubmit={handleCommentSubmit} className="comment-form-relative">
                                <textarea
                                    ref={commentInputRef}
                                    placeholder="Write a comment..."
                                    value={commentText}
                                    onChange={(e) => {
                                        setCommentText(e.target.value);
                                        e.target.style.height = 'inherit';
                                        e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                                    }}
                                    rows="1"
                                    className="comment-textarea"
                                />
                                <div className="comment-form-actions-absolute">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleMediaSelect}
                                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                                        hidden
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowStickerPicker(!showStickerPicker)}
                                        className={`btn-media ${showStickerPicker ? 'active' : ''}`}
                                        title="Add Sticker"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
                                            <path d="M15 3v6h6" />
                                            <path d="M10 12.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z" />
                                            <path d="M14 12.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z" />
                                            <path d="M10 16c.5-1.5 1.5-2 2-2s1.5.5 2 2" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="btn-media"
                                        title="Add media"
                                    >
                                        <Image size={16} />
                                    </button>
                                    {showStickerPicker && (
                                        <div className="sticker-picker-absolute">
                                            <StickerPicker
                                                onSelect={(url) => handleCommentSubmit(null, url)}
                                                onClose={() => setShowStickerPicker(false)}
                                            />
                                        </div>
                                    )}
                                    {commentMedia && (
                                        <div className="media-preview-flex">
                                            <span className="media-preview-name">
                                                {commentMedia.name}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleRemoveMedia}
                                                className="btn-remove-media"
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
                                        className="comment-submit-btn"
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

        </div>
    );
};

export default React.memo(PostCard, (prev, next) => {
    const p = prev.post;
    const n = next.post;
    return (
        p.id === n.id &&
        p.likes === n.likes &&
        p.comments === n.comments &&
        p.share_count === n.share_count &&
        p.is_liked === n.is_liked &&
        p.is_saved === n.is_saved &&
        p.content === n.content &&
        p.status === n.status
    );
});
