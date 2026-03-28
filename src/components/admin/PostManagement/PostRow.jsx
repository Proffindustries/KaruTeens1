import React from 'react';
import {
    Star,
    Crown,
    CheckCircle,
    ShieldCheck,
    FileClock,
    Calendar,
    AlertTriangle,
    XCircle,
    User,
    Clock,
    Globe,
    Image,
    Video,
    AudioLines,
    MessageSquare,
    Share2,
    Shield,
    Eye,
    ThumbsUp,
    MessageCircle,
    Share,
    TrendingUp,
} from 'lucide-react';
import PostActionButtons from './PostActionButtons';
import {
    getStatusBadge,
    getPostTypeBadge,
    getDaysSinceCreated,
    getReadingTimeText,
    formatEngagementRate,
} from './utils';

const PostRow = ({
    post,
    isSelected,
    onToggleSelection,
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
        <tr className={post.status === 'rejected' ? 'rejected-post' : ''}>
            <td>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelection(post.id)}
                />
            </td>
            <td>
                <div className="post-info">
                    <div className="post-title">
                        <h4>{post.title}</h4>
                        {post.is_featured && (
                            <span className="featured-badge">
                                <Star size={12} />
                                Featured
                            </span>
                        )}
                        {post.is_premium && (
                            <span className="premium-badge">
                                <Crown size={12} />
                                Premium
                            </span>
                        )}
                    </div>
                    <div className="post-excerpt">{post.excerpt}</div>
                    <div className="post-meta">
                        <span className="slug-badge">{post.slug}</span>
                        {post.tags &&
                            post.tags.map((tag) => (
                                <span key={tag} className="tag-badge">
                                    {tag}
                                </span>
                            ))}
                    </div>
                </div>
            </td>
            <td>
                <div className="status-info">
                    <div className="status-badge">
                        <span className={`status-pill ${getStatusBadge(post.status).color}`}>
                            {getStatusBadge(post.status).icon}
                            {getStatusBadge(post.status).text}
                        </span>
                        <span
                            className={`post-type-pill ${getPostTypeBadge(post.post_type).color}`}
                        >
                            {getPostTypeBadge(post.post_type).icon}
                            {getPostTypeBadge(post.post_type).text}
                        </span>
                    </div>
                    <div className="status-dates">
                        {post.approved_at && (
                            <div className="status-date">
                                <ShieldCheck size={12} />
                                <span>
                                    Approved: {new Date(post.approved_at).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                        {post.published_at && (
                            <div className="status-date">
                                <CheckCircle size={12} />
                                <span>
                                    Published: {new Date(post.published_at).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                        {post.scheduled_publish_date && (
                            <div className="status-date">
                                <Calendar size={12} />
                                <span>
                                    Scheduled:{' '}
                                    {new Date(post.scheduled_publish_date).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>
                    {post.rejection_reason && (
                        <div className="rejection-reason">
                            <XCircle size={12} />
                            <span>{post.rejection_reason}</span>
                        </div>
                    )}
                </div>
            </td>
            <td>
                <div className="author-info">
                    <div className="author-details">
                        <div className="author-name">
                            <User size={14} />
                            <span>{post.author_name}</span>
                        </div>
                        <div className="author-id">
                            <span>ID: {post.author_id}</span>
                        </div>
                    </div>
                    <div className="date-info">
                        <div className="created-date">
                            <Calendar size={12} />
                            <span>Created: {new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="days-since">
                            <Clock size={12} />
                            <span>{getDaysSinceCreated(post.created_at)} days ago</span>
                        </div>
                    </div>
                    <div className="content-details">
                        <div className="reading-time">
                            <Clock size={12} />
                            <span>{getReadingTimeText(post.reading_time || 0)}</span>
                        </div>
                        <div className="language">
                            <Globe size={12} />
                            <span>{post.language}</span>
                        </div>
                        {post.plagiarism_score && (
                            <div className="plagiarism-score">
                                <AlertTriangle size={12} />
                                <span>{post.plagiarism_score}% similarity</span>
                            </div>
                        )}
                    </div>
                </div>
            </td>
            <td>
                <div className="content-info">
                    <div className="content-features">
                        {post.featured_image && (
                            <span className="feature-badge image">
                                <Image size={12} />
                                Featured Image
                            </span>
                        )}
                        {post.video_url && (
                            <span className="feature-badge video">
                                <Video size={12} />
                                Video
                            </span>
                        )}
                        {post.audio_url && (
                            <span className="feature-badge audio">
                                <AudioLines size={12} />
                                Audio
                            </span>
                        )}
                        {post.gallery_images && post.gallery_images.length > 0 && (
                            <span className="feature-badge gallery">
                                <Image size={12} />
                                Gallery ({post.gallery_images.length})
                            </span>
                        )}
                    </div>
                    <div className="content-controls">
                        <div className="comments-control">
                            <MessageSquare size={12} />
                            <span>
                                {post.allow_comments ? 'Comments Enabled' : 'Comments Disabled'}
                            </span>
                        </div>
                        <div className="sharing-control">
                            <Share2 size={12} />
                            <span>
                                {post.allow_sharing ? 'Sharing Enabled' : 'Sharing Disabled'}
                            </span>
                        </div>
                    </div>
                    {post.content_rating && (
                        <div className="content-rating">
                            <Shield size={12} />
                            <span>Rating: {post.content_rating}</span>
                        </div>
                    )}
                </div>
            </td>
            <td>
                <div className="analytics-info">
                    <div className="metric-row">
                        <div className="metric-item">
                            <Eye size={14} />
                            <span>{post.analytics.total_views.toLocaleString()}</span>
                            <small>Views</small>
                        </div>
                        <div className="metric-item">
                            <ThumbsUp size={14} />
                            <span>{post.analytics.total_likes}</span>
                            <small>Likes</small>
                        </div>
                    </div>
                    <div className="metric-row">
                        <div className="metric-item">
                            <MessageCircle size={14} />
                            <span>{post.analytics.total_comments}</span>
                            <small>Comments</small>
                        </div>
                        <div className="metric-item">
                            <Share size={14} />
                            <span>{post.analytics.total_shares}</span>
                            <small>Shares</small>
                        </div>
                    </div>
                    <div className="metric-row">
                        <div className="metric-item">
                            <TrendingUp size={14} />
                            <span>{formatEngagementRate(post.analytics.engagement_rate)}</span>
                            <small>Engagement</small>
                        </div>
                        <div className="metric-item">
                            <Clock size={14} />
                            <span>{post.analytics.avg_reading_time || 0} min</span>
                            <small>Avg Time</small>
                        </div>
                    </div>
                </div>
            </td>
            <td>
                <PostActionButtons
                    post={post}
                    onView={onView}
                    onAnalytics={onAnalytics}
                    onWorkflow={onWorkflow}
                    onEdit={onEdit}
                    onApprove={onApprove}
                    onReject={onReject}
                    onPublish={onPublish}
                    onDelete={onDelete}
                />
            </td>
        </tr>
    );
};

export default PostRow;
