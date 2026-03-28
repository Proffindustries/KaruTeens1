import React, { memo } from 'react';
import {
    Eye,
    BarChart3,
    FileSearch,
    Edit,
    FileCheck,
    XCircle,
    FileText,
    Trash2,
} from 'lucide-react';

const PostActionButtons = memo(
    ({
        post,
        onView,
        onAnalytics,
        onWorkflow,
        onEdit,
        onApprove,
        onReject,
        onPublish,
        onDelete,
    }) => {
        return (
            <div className="action-buttons">
                <button className="action-btn view" onClick={() => onView(post)} title="View Post">
                    <Eye size={16} />
                </button>
                <button
                    className="action-btn analytics"
                    onClick={() => onAnalytics(post)}
                    title="View Analytics"
                >
                    <BarChart3 size={16} />
                </button>
                <button
                    className="action-btn workflow"
                    onClick={() => onWorkflow(post)}
                    title="View Workflow"
                >
                    <FileSearch size={16} />
                </button>
                <button className="action-btn edit" onClick={() => onEdit(post)} title="Edit Post">
                    <Edit size={16} />
                </button>
                {post.status === 'pending_review' && (
                    <>
                        <button
                            className="action-btn approve"
                            onClick={() => onApprove(post.id)}
                            title="Approve Post"
                        >
                            <FileCheck size={16} />
                        </button>
                        <button
                            className="action-btn reject"
                            onClick={() => onReject(post.id)}
                            title="Reject Post"
                        >
                            <XCircle size={16} />
                        </button>
                    </>
                )}
                {post.status === 'approved' && (
                    <button
                        className="action-btn publish"
                        onClick={() => onPublish(post.id)}
                        title="Publish Post"
                    >
                        <FileText size={16} />
                    </button>
                )}
                <button
                    className="action-btn delete"
                    onClick={() => onDelete(post.id)}
                    title="Delete Post"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        );
    },
);

PostActionButtons.displayName = 'PostActionButtons';

export default PostActionButtons;
