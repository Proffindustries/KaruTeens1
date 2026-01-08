import React, { useState } from 'react';
import { Reply, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar.jsx';
import '../styles/Comment.css';

const Comment = ({ comment, onReply, level = 0, replies = [] }) => {
    const [showReplies, setShowReplies] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');

    const handleReplyClick = () => {
        setIsReplying(true);
    };

    const handleReplySubmit = (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        onReply(comment._id, replyText);
        setReplyText('');
        setIsReplying(false);
        setShowReplies(true); // Auto-expand to show new reply
    };

    const handleCancelReply = () => {
        setIsReplying(false);
        setReplyText('');
    };

    const hasReplies = replies && replies.length > 0;
    const maxNestingLevel = 3; // Limit nesting to avoid too deep threads

    return (
        <div className={`comment-wrapper ${level > 0 ? 'is-reply' : ''}`} style={{ marginLeft: `${Math.min(level, maxNestingLevel) * 2}rem` }}>
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
                                onClick={() => setShowReplies(!showReplies)}
                            >
                                {showReplies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                {comment.replies_count} {comment.replies_count === 1 ? 'reply' : 'replies'}
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
                            <input
                                type="text"
                                placeholder={`Reply to ${comment.username}...`}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="reply-input"
                                autoFocus
                            />
                            <div className="reply-actions">
                                <button type="button" onClick={handleCancelReply} className="btn-cancel">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-reply" disabled={!replyText.trim()}>
                                    Reply
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
                                key={reply._id}
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
};

export default Comment;
