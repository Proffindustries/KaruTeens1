import React from 'react';
import { formatEngagementRate, getStatusBadge, getReadingTimeText } from './utils';

const WorkflowModal = ({ post, show, onClose }) => {
    if (!show || !post) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '1200px' }}
            >
                <div className="modal-header">
                    <h3>Post Workflow: {post.title}</h3>
                    <button className="close-btn" onClick={onClose}>
                        ×
                    </button>
                </div>
                <div className="modal-body">
                    <div className="workflow-container">
                        <div className="workflow-section">
                            <h4>Post Status Timeline</h4>
                            <div className="timeline">
                                <div className="timeline-item">
                                    <div className="timeline-dot"></div>
                                    <div className="timeline-content">
                                        <strong>Draft Created</strong>
                                        <span>{new Date(post.created_at).toLocaleString()}</span>
                                        <p>Post created by {post.author_name}</p>
                                    </div>
                                </div>
                                {post.approved_at && (
                                    <div className="timeline-item">
                                        <div className="timeline-dot approved"></div>
                                        <div className="timeline-content">
                                            <strong>Approved</strong>
                                            <span>
                                                {new Date(post.approved_at).toLocaleString()}
                                            </span>
                                            <p>Approved by {post.approved_by}</p>
                                        </div>
                                    </div>
                                )}
                                {post.published_at && (
                                    <div className="timeline-item">
                                        <div className="timeline-dot published"></div>
                                        <div className="timeline-content">
                                            <strong>Published</strong>
                                            <span>
                                                {new Date(post.published_at).toLocaleString()}
                                            </span>
                                            <p>Post went live to public</p>
                                        </div>
                                    </div>
                                )}
                                {post.rejected_at && (
                                    <div className="timeline-item">
                                        <div className="timeline-dot rejected"></div>
                                        <div className="timeline-content">
                                            <strong>Rejected</strong>
                                            <span>
                                                {new Date(post.rejected_at).toLocaleString()}
                                            </span>
                                            <p>Rejected by {post.rejected_by}</p>
                                            <p className="rejection-reason">
                                                {post.rejection_reason}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="workflow-section">
                            <h4>Content Analytics</h4>
                            <div className="analytics-grid">
                                <div className="analytics-card">
                                    <h5>Total Views</h5>
                                    <div className="metric-value">
                                        {post.analytics.total_views.toLocaleString()}
                                    </div>
                                </div>
                                <div className="analytics-card">
                                    <h5>Unique Views</h5>
                                    <div className="metric-value">
                                        {post.analytics.unique_views}
                                    </div>
                                </div>
                                <div className="analytics-card">
                                    <h5>Engagement Rate</h5>
                                    <div className="metric-value">
                                        {formatEngagementRate(post.analytics.engagement_rate)}
                                    </div>
                                </div>
                                <div className="analytics-card">
                                    <h5>Avg Reading Time</h5>
                                    <div className="metric-value">
                                        {post.analytics.avg_reading_time || 0} min
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="workflow-section">
                            <h4>Content Details</h4>
                            <div className="content-details-grid">
                                <div className="detail-item">
                                    <strong>Status:</strong>
                                    <span
                                        className={`status-pill ${getStatusBadge(post.status).color}`}
                                    >
                                        {getStatusBadge(post.status).text}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <strong>Type:</strong>
                                    <span>{post.post_type}</span>
                                </div>
                                <div className="detail-item">
                                    <strong>Category:</strong>
                                    <span>{post.category}</span>
                                </div>
                                <div className="detail-item">
                                    <strong>Reading Time:</strong>
                                    <span>{getReadingTimeText(post.reading_time || 0)}</span>
                                </div>
                                <div className="detail-item">
                                    <strong>Plagiarism Score:</strong>
                                    <span>{post.plagiarism_score || 0}%</span>
                                </div>
                                <div className="detail-item">
                                    <strong>Content Rating:</strong>
                                    <span>{post.content_rating || 'G'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowModal;
