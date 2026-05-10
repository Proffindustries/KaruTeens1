import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, Share2, AtSign, Trash2, Bell, Clock } from 'lucide-react';
import {
    useActivityFeed,
    useMarkActivityRead,
    useDeleteActivity,
    useMarkAllActivityRead,
} from '../hooks/useActivity';
import EmptyState from '../components/EmptyState';
import Avatar from '../components/Avatar';
import '../styles/ActivityFeedPage.css';

const ACTIVITY_ICONS = {
    like: <Heart size={18} fill="#ff4757" color="#ff4757" />,
    comment: <MessageCircle size={18} color="#3742fa" />,
    follow: <UserPlus size={18} color="#2ed573" />,
    share: <Share2 size={18} color="#ffa502" />,
    mention: <AtSign size={18} color="#9b59b6" />,
    post: <Bell size={18} color="#e84393" />,
};

const getActivityIcon = (type) => ACTIVITY_ICONS[type] || <Bell size={18} color="#666" />;

const formatTime = (timeStr) => {
    if (!timeStr) return 'Unknown time';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return 'Invalid date';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

const ActivityFeedPage = () => {
    const navigate = useNavigate();
    const { data: activities, isLoading, error, refetch } = useActivityFeed();
    const { mutate: markRead } = useMarkActivityRead();
    const { mutate: deleteActivity } = useDeleteActivity();
    const { mutate: markAllRead } = useMarkAllActivityRead();
    const handleActivityClick = useCallback(
        (activity) => {
            if (!activity.read) {
                markRead(activity.id);
            }

            switch (activity.type) {
                case 'post':
                case 'like':
                case 'comment':
                case 'share':
                case 'mention':
                    if (activity.target?.id) {
                        navigate(`/post/${activity.target.id}`);
                    }
                    break;
                case 'follow':
                    navigate(`/profile/${activity.actor.username}`);
                    break;
                default:
                    break;
            }
        },
        [markRead, navigate],
    );

    const handleDelete = useCallback(
        (e, activityId) => {
            e.stopPropagation();
            deleteActivity(activityId);
        },
        [deleteActivity],
    );

    const groupedActivities = React.useMemo(() => {
        if (!activities) return [];

        const groups = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        activities.forEach((activity) => {
            const activityDate = new Date(activity.created_at);
            activityDate.setHours(0, 0, 0, 0);

            let groupKey;
            if (activityDate.getTime() === today.getTime()) {
                groupKey = 'Today';
            } else if (activityDate.getTime() === yesterday.getTime()) {
                groupKey = 'Yesterday';
            } else {
                groupKey = activityDate.toLocaleDateString();
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(activity);
        });

        return groups;
    }, [activities]);

    const totalUnread = React.useMemo(() => {
        return activities?.filter((a) => !a.read).length || 0;
    }, [activities]);

    if (isLoading) {
        return (
            <div className="container activity-feed-page">
                <div className="page-header">
                    <h1>Activity</h1>
                </div>
                <div className="activity-feed card">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="activity-item-skeleton">
                            <div className="skeleton-avatar" />
                            <div className="skeleton-content">
                                <div className="skeleton-line skeleton-line--title" />
                                <div className="skeleton-line skeleton-line--meta" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container activity-feed-page">
                <div className="page-header">
                    <h1>Activity</h1>
                    <p className="error-text">
                        Failed to load activity feed. Please check your connection and try again.
                    </p>
                    <button onClick={() => refetch()} className="btn btn-primary btn-sm mt-2">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container activity-feed-page">
            <div className="page-header">
                <h1>Activity</h1>
                <div className="header-actions">
                    {totalUnread > 0 && (
                        <>
                            <span className="activity-count">{totalUnread} new</span>
                            <button className="mark-all-read-btn" onClick={() => markAllRead()}>
                                Mark all as read
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="activity-feed card">
                {activities?.length === 0 ? (
                    <EmptyState
                        icon={Bell}
                        title="No activity yet"
                        message="When people interact with you, you'll see it here."
                    />
                ) : (
                    <div className="activity-list">
                        {Object.entries(groupedActivities).map(([groupTitle, groupActivities]) => (
                            <div key={groupTitle} className="activity-group">
                                <div className="group-header">
                                    <span>{groupTitle}</span>
                                </div>
                                {groupActivities.map((activity) => (
                                    <div
                                        key={activity.id}
                                        className={`activity-item ${!activity.read ? 'unread' : ''}`}
                                        onClick={() => handleActivityClick(activity)}
                                    >
                                        <div className="activity-avatar">
                                            <Avatar
                                                src={activity.actor?.avatar_url}
                                                name={activity.actor?.username}
                                                size="md"
                                            />
                                            <div className="type-badge">
                                                {getActivityIcon(activity.type)}
                                            </div>
                                        </div>
                                        <div className="activity-content">
                                            <p className="activity-text">
                                                <strong>{activity.actor?.username}</strong>{' '}
                                                {activity.content}
                                            </p>
                                            <div className="activity-meta">
                                                <Clock size={12} />
                                                <span>{formatTime(activity.created_at)}</span>
                                            </div>
                                        </div>
                                        <div className="activity-actions">
                                            <button
                                                className="delete-btn"
                                                onClick={(e) => handleDelete(e, activity.id)}
                                                title="Delete activity"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            {!activity.read && <div className="unread-dot"></div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityFeedPage;
