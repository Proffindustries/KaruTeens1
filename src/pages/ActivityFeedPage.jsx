import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Heart,
    MessageCircle,
    UserPlus,
    Share2,
    AtSign,
    Trash2,
    Bell,
    User,
    Clock,
    Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext.jsx';
import {
    useActivityFeed,
    useMarkActivityRead,
    useDeleteActivity,
    useMarkAllActivityRead,
} from '../hooks/useActivity';
import Avatar from '../components/Avatar.jsx';
import '../styles/ActivityFeedPage.css';

const ActivityFeedPage = () => {
    const navigate = useNavigate();
    const { data: activities, isLoading, error } = useActivityFeed();
    const { mutate: markRead } = useMarkActivityRead();
    const { mutate: deleteActivity } = useDeleteActivity();
    const { mutate: markAllRead } = useMarkAllActivityRead();
    const { showToast } = useToast();

    const getActivityIcon = (type) => {
        const icons = {
            like: <Heart size={18} fill="#ff4757" color="#ff4757" />,
            comment: <MessageCircle size={18} color="#3742fa" />,
            follow: <UserPlus size={18} color="#2ed573" />,
            share: <Share2 size={18} color="#ffa502" />,
            mention: <AtSign size={18} color="#9b59b6" />,
            post: <Bell size={18} color="#e84393" />,
        };
        return icons[type] || <Bell size={18} color="#666" />;
    };

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

    const handleActivityClick = (activity) => {
        // Mark as read
        if (!activity.read) {
            markRead(activity.id);
        }

        // Navigate based on activity type
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
    };

    const handleDelete = useCallback(
        (e, activityId) => {
            e.stopPropagation();
            deleteActivity(activityId);
        },
        [deleteActivity],
    );

    const ActivityRow = useCallback(
        ({ index, style, data }) => {
            const {
                activities,
                markRead,
                deleteActivity,
                getActivityIcon,
                formatTime,
                handleActivityClick,
            } = data;
            const activity = activities[index];

            if (!activity) return null;

            const actorName = activity.actor?.username || 'Unknown';

            return (
                <motion.div
                    style={style}
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`activity-item ${!activity.read ? 'unread' : ''}`}
                    onClick={() => handleActivityClick(activity)}
                >
                    <div className="activity-avatar">
                        {activity.actor?.avatar_url ? (
                            <img src={activity.actor.avatar_url} alt={actorName} loading="lazy" />
                        ) : (
                            <div className="avatar-placeholder">{actorName[0].toUpperCase()}</div>
                        )}
                        <div className="type-badge">{getActivityIcon(activity.type)}</div>
                    </div>
                    <div className="activity-content">
                        <p className="activity-text">
                            <strong>{actorName}</strong> {activity.content}
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
                </motion.div>
            );
        },
        [handleDelete],
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
                    <div className="loading-skeleton">Loading...</div>
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
                    <button
                        onClick={() => window.location.reload()}
                        className="btn btn-primary btn-sm mt-2"
                    >
                        Refresh Page
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
                    <div className="empty-activity">
                        <Bell size={48} color="#ddd" />
                        <p>No activity yet.</p>
                        <p className="hint">When people interact with you, you'll see it here.</p>
                    </div>
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
                                            {activity.actor?.avatar_url ? (
                                                <img
                                                    src={activity.actor.avatar_url}
                                                    alt={activity.actor.username}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="avatar-placeholder">
                                                    {activity.actor?.username?.[0]?.toUpperCase() ||
                                                        '?'}
                                                </div>
                                            )}
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
