import React from 'react';
import { RefreshCw } from 'lucide-react';
import PostRow from './PostRow';

const PostTable = ({
    posts,
    selectedPosts,
    onToggleSelection,
    onSelectAll,
    isLoading,
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
        <div className="posts-table-container">
            {isLoading ? (
                <div className="loading-state">
                    <RefreshCw size={32} className="spin-anim" />
                    <p>Loading posts...</p>
                </div>
            ) : (
                <>
                    <div className="table-header">
                        <div className="select-all">
                            <input
                                type="checkbox"
                                checked={selectedPosts.length === posts.length && posts.length > 0}
                                onChange={onSelectAll}
                            />
                            <span>Select All</span>
                        </div>
                        <div className="table-actions">
                            <span className="post-count">{posts.length} posts found</span>
                            <button className="refresh-btn" onClick={() => {}}>
                                <RefreshCw size={18} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedPosts.length === posts.length &&
                                                posts.length > 0
                                            }
                                            onChange={onSelectAll}
                                        />
                                    </th>
                                    <th>Post Info</th>
                                    <th>Status & Type</th>
                                    <th>Author & Date</th>
                                    <th>Content</th>
                                    <th>Analytics</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {posts.map((post) => (
                                    <PostRow
                                        key={post.id}
                                        post={post}
                                        isSelected={selectedPosts.includes(post.id)}
                                        onToggleSelection={onToggleSelection}
                                        onView={onView}
                                        onAnalytics={onAnalytics}
                                        onWorkflow={onWorkflow}
                                        onEdit={onEdit}
                                        onApprove={onApprove}
                                        onReject={onReject}
                                        onPublish={onPublish}
                                        onDelete={onDelete}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default PostTable;
