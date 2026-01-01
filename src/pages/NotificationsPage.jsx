import React from 'react';
import { Heart, MessageCircle, UserPlus, Star, Trash2, Bell, MessageSquare } from 'lucide-react';
import { useNotifications, useMarkNotificationRead, useDeleteNotification, useMarkAllRead } from '../hooks/useNotifications.js';
import '../styles/NotificationsPage.css';

const NotificationsPage = () => {
    const { data: notifications, isLoading, error } = useNotifications();
    const { mutate: markRead } = useMarkNotificationRead();
    const { mutate: deleteNotif } = useDeleteNotification();
    const { mutate: markAllRead } = useMarkAllRead();

    const getIcon = (type) => {
        switch (type) {
            case 'like': return <Heart size={20} fill="#ff4757" color="#ff4757" />;
            case 'comment': return <MessageCircle size={20} color="#3742fa" />;
            case 'message': return <MessageSquare size={20} color="#2ed573" />;
            case 'follow': return <UserPlus size={20} color="#2ed573" />;
            default: return <Bell size={20} color="#ffa502" />;
        }
    };

    const formatTime = (timeStr) => {
        const date = new Date(timeStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    if (isLoading) return <div className="container notifications-page"><p>Loading notifications...</p></div>;
    if (error) return <div className="container notifications-page"><p>Error loading notifications.</p></div>;

    return (
        <div className="container notifications-page">
            <div className="page-header">
                <h1>Notifications</h1>
                <div className="header-actions">
                    <span className="notif-count">{notifications?.filter(n => !n.is_read).length} Unread</span>
                    {notifications?.some(n => !n.is_read) && (
                        <button className="mark-all-read-btn" onClick={() => markAllRead()}>
                            Mark all as read
                        </button>
                    )}
                </div>
            </div>

            <div className="notifications-list card">
                {notifications?.length === 0 ? (
                    <div className="empty-notifs">
                        <Bell size={48} color="#ddd" />
                        <p>No notifications yet.</p>
                    </div>
                ) : (
                    notifications.map(notif => (
                        <div
                            key={notif.id}
                            className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                            onClick={() => !notif.is_read && markRead(notif.id)}
                        >
                            <div className="notif-avatar">
                                {notif.actor_avatar_url ? (
                                    <img src={notif.actor_avatar_url} alt="" />
                                ) : (
                                    <div className="avatar-placeholder">{notif.actor_username[0]}</div>
                                )}
                                <div className="type-badge">
                                    {getIcon(notif.notification_type)}
                                </div>
                            </div>
                            <div className="notif-content">
                                <p>
                                    <strong>{notif.actor_username} </strong>
                                    {notif.content}
                                </p>
                                <span className="notif-time">{formatTime(notif.created_at)}</span>
                            </div>
                            <div className="notif-actions">
                                <button
                                    className="delete-notif-btn"
                                    onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id); }}
                                    title="Delete notification"
                                >
                                    <Trash2 size={16} />
                                </button>
                                {!notif.is_read && <div className="unread-dot"></div>}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
