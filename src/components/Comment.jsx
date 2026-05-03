import React, { useState, useCallback, useRef } from 'react';
import { Reply, ChevronDown, ChevronUp, Image, X, File, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar.jsx';
import StickerPicker from './StickerPicker.jsx';
import { useDeleteComment } from '../hooks/useContent';
import { saveSticker, isStickerSaved } from '../utils/stickerStorage.js';
import safeLocalStorage from '../utils/storage.js';
import '../styles/Comment.css';

const Comment = React.memo(({ comment, onReply, level = 0, replies = [] }) => {
    const [showReplies, setShowReplies] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replyMedia, setReplyMedia] = useState(null);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const fileInputRef = useRef(null);
    const replyInputRef = useRef(null);

    const { mutate: deleteComment, isPending: isDeleting } = useDeleteComment();
    const storedUser = JSON.parse(safeLocalStorage.getItem('user') || '{}');
    const currentUser = {
        ...storedUser,
        id: storedUser.id || storedUser._id || storedUser.user_id
    };

    const handleReplyClick = useCallback(() => {
        setIsReplying(true);
    }, []);

    const commentId = comment.id;

    const handleDelete = useCallback(() => {
        if (window.confirm('Are you sure you want to delete this comment?')) {
            deleteComment(commentId);
        }
    }, [commentId, deleteComment]);

    const isOwner = currentUser?.username === comment.username || currentUser?.id === comment.user_id;
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

    const handleReplySubmit = useCallback(
        async (e, customStickerUrl = null) => {
            if (e && e.preventDefault) e.preventDefault();
            if (!replyText.trim() && !replyMedia && !customStickerUrl) return;

            setIsSubmittingReply(true);
            try {
                // We pass customStickerUrl as the 4th parameter, so we need to update PostCard's onReply
                await onReply(
                    commentId,
                    customStickerUrl ? 'Sticker' : replyText,
                    replyMedia,
                    customStickerUrl,
                );
                setReplyText('');
                setReplyMedia(null);
                setShowStickerPicker(false);
                if (replyInputRef.current) {
                    replyInputRef.current.style.height = 'inherit';
                }
                setIsReplying(false);
                setShowReplies(true);
            } catch (error) {
                // error feedback is shown via toast in PostCard
            } finally {
                setIsSubmittingReply(false);
            }
        },
        [commentId, onReply, replyText, replyMedia],
    );

    const handleCancelReply = useCallback(() => {
        setIsReplying(false);
        setReplyText('');
        setReplyMedia(null);
    }, []);

    const handleMediaSelect = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            setReplyMedia(file);
        }
    }, []);

    const handleRemoveMedia = useCallback(() => {
        setReplyMedia(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    const toggleReplies = useCallback(() => {
        setShowReplies((prev) => !prev);
    }, []);

    const hasReplies = replies && replies.length > 0;
    const maxNestingLevel = 3;

    return (
        <div
            className={`comment-wrapper ${level > 0 ? 'is-reply' : ''}`}
            style={{ marginLeft: `${Math.min(level, maxNestingLevel) * 2}rem` }}
        >
            <div className={`comment-main ${comment.is_optimistic ? 'is-optimistic' : ''}`}>
                <div className="comment-content">
                    {/* Quoted parent reply - WhatsApp style */}
                    {comment.parentInfo && (
                        <div className="quoted-reply-preview">
                            <span className="quoted-username">{comment.parentInfo.username}</span>
                            <p className="quoted-text">
                                {comment.parentInfo.content.length > 60
                                    ? comment.parentInfo.content.substring(0, 60) + '...'
                                    : comment.parentInfo.content}
                            </p>
                        </div>
                    )}

                    <div className="comment-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Avatar src={comment.user_avatar} name={comment.username} size="sm" />
                            <strong className="comment-author">{comment.username}</strong>
                        </div>
                        <span className="comment-time">
                            {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <p className="comment-text">{comment.content}</p>

                    {comment.media_url && (
                        <div
                            className="comment-media"
                            style={{
                                marginTop: '8px',
                                position: 'relative',
                                display: 'inline-block',
                            }}
                        >
                            {comment.media_type === 'sticker' ? (
                                <div
                                    className="sticker-bubble"
                                    style={{
                                        position: 'relative',
                                        display: 'inline-block',
                                        cursor: 'pointer',
                                    }}
                                    title="Click to save sticker"
                                    onClick={() => {
                                        const result = saveSticker(comment.media_url);
                                        alert(result.message);
                                    }}
                                >
                                    <img
                                        src={comment.media_url}
                                        alt="Sticker"
                                        style={{
                                            width: '80px',
                                            height: '80px',
                                            objectFit: 'contain',
                                            display: 'block',
                                        }}
                                    />
                                    <div
                                        className="sticker-save-hint"
                                        style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            background: 'rgba(0,0,0,0.55)',
                                            color: '#fff',
                                            fontSize: '10px',
                                            textAlign: 'center',
                                            padding: '2px',
                                            borderRadius: '0 0 6px 6px',
                                            opacity: 0,
                                            transition: 'opacity 0.2s',
                                        }}
                                    >
                                        Save
                                    </div>
                                </div>
                            ) : (
                                <img
                                    src={comment.media_url}
                                    alt="Attachment"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '200px',
                                        borderRadius: '8px',
                                    }}
                                />
                            )}
                        </div>
                    )}

                    <div className="comment-actions">
                        <button
                            className="comment-action-btn reply-btn"
                            onClick={handleReplyClick}
                            disabled={level >= maxNestingLevel}
                        >
                            <Reply size={14} />
                            Reply
                        </button>

                        {(isOwner || isAdmin) && (
                            <button
                                className="comment-action-btn delete-btn"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                style={{ color: '#ff4757' }}
                            >
                                <Trash2 size={14} />
                                Delete
                            </button>
                        )}

                        {hasReplies && (
                            <button
                                className="comment-action-btn toggle-replies-btn"
                                onClick={toggleReplies}
                            >
                                {showReplies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                {comment.replies_count}{' '}
                                {comment.replies_count === 1 ? 'reply' : 'replies'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Reply Input */}
            <AnimatePresence>
                {isReplying && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="reply-input-container"
                    >
                        <form onSubmit={handleReplySubmit} className="reply-form">
                            <textarea
                                ref={replyInputRef}
                                placeholder={`Reply to ${comment.username}...`}
                                value={replyText}
                                onChange={(e) => {
                                    setReplyText(e.target.value);
                                    // Auto-expand
                                    e.target.style.height = 'inherit';
                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                }}
                                rows="1"
                                className="reply-textarea"
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '12px',
                                    border: '1px solid #dfe4ea',
                                    outline: 'none',
                                    resize: 'none',
                                    lineHeight: '1.4',
                                    maxHeight: '120px',
                                    display: 'block',
                                    fontFamily: 'inherit',
                                    fontSize: '0.9rem',
                                }}
                            />
                            <div className="reply-actions">
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
                                    className="btn-media"
                                    title="Add Sticker"
                                    style={{
                                        color: showStickerPicker ? 'var(--primary)' : 'inherit',
                                    }}
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
                                    <div
                                        style={{
                                            position: 'absolute',
                                            bottom: '40px',
                                            left: '0',
                                            zIndex: 100,
                                        }}
                                    >
                                        <StickerPicker
                                            onSelect={(url) => handleReplySubmit(null, url)}
                                            onClose={() => setShowStickerPicker(false)}
                                        />
                                    </div>
                                )}
                                {replyMedia && (
                                    <div className="media-preview">
                                        <span>{replyMedia.name}</span>
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
                                    type="button"
                                    onClick={handleCancelReply}
                                    className="btn-cancel"
                                    disabled={isSubmittingReply}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-reply"
                                    disabled={
                                        (!replyText.trim() && !replyMedia) || isSubmittingReply
                                    }
                                >
                                    {isSubmittingReply ? '...' : 'Reply'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Nested Replies */}
            <AnimatePresence>
                {showReplies && hasReplies && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="replies-container"
                    >
                        {replies.map((reply) => (
                            <Comment
                                key={reply.id}
                                comment={reply}
                                onReply={onReply}
                                level={level + 1}
                                replies={reply.replies || []}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

export default Comment;
