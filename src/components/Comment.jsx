import React, { useState, useCallback, useRef } from 'react';
import { Reply, ChevronDown, ChevronUp, Image, X, File } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar.jsx';
import '../styles/Comment.css';

const Comment = React.memo(({ comment, onReply, level = 0, replies = [] }) => {
    const [showReplies, setShowReplies] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replyMedia, setReplyMedia] = useState(null);
    const fileInputRef = useRef(null);
    const replyInputRef = useRef(null);

    const handleReplyClick = useCallback(() => {
        setIsReplying(true);
    }, []);

    const commentId = comment.id;

    const handleReplySubmit = useCallback(
        async (e) => {
            e.preventDefault();
            if (!replyText.trim() && !replyMedia) return;

            setIsSubmittingReply(true);
            try {
                await onReply(commentId, replyText, replyMedia);
                setReplyText('');
                setReplyMedia(null);
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

                    <div className="comment-actions">
                        <button
                            className="comment-action-btn reply-btn"
                            onClick={handleReplyClick}
                            disabled={level >= maxNestingLevel}
                        >
                            <Reply size={14} />
                            Reply
                        </button>

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
                                    fontSize: '0.9rem'
                                }}
                            />
                            <div className="reply-actions">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleMediaSelect}
                                    accept="image/*,video/*"
                                    hidden
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="btn-media"
                                    title="Add media"
                                >
                                    <Image size={16} />
                                </button>
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
                                    disabled={(!replyText.trim() && !replyMedia) || isSubmittingReply}
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
