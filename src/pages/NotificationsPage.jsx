import React, { useState, useEffect, useMemo } from 'react';
import { Heart, MessageCircle, UserPlus, Trash2, Bell, MessageSquare, ShieldAlert, Eye } from 'lucide-react';
import {
    useNotifications,
    useMarkNotificationRead,
    useDeleteNotification,
    useMarkAllRead,
} from '../hooks/useNotifications.js';
import { NotificationSkeleton } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState';
import Avatar from '../components/Avatar';
import { HeartIcon, ForkIcon } from '../assets/hannibal_icons';
import '../styles/NotificationsPage.css';

// Hannibal Copywriting Helpers
const HANNIBAL_TEMPLATES = {
    like: (user) => `A certain ${user} found your contribution... palatable. They have expressed their admiration.`,
    comment: (user) => `${user} wishes to discuss your thoughts further. Shall we join them at the table?`,
    follow: (user) => `${user} is now observing your movements. A mutual interest, I presume?`,
    mention: (user) => `You have been summoned by ${user}. Their curiosity is quite focused on you.`,
    login: () => `Your sanctuary was approached from an unfamiliar coordinates. We have taken the liberty of securing the perimeter.`,
    profile_view: (user) => `${user} was recently examining your profile. They seem quite... thorough.`,
};

const SEASONAL_SPECIALS = [
    "Tonight's special: braised short ribs with morel reduction. Pair with a '95 Margaux. (P.S. – Your heart rate while reading this was 68 BPM. Intriguing.)",
    "The silence of your profile lately is deafening. Perhaps a fresh contribution? Like a lamb to the slaughter.",
    "You have been hovering over your screen for quite some time. Indecision is a bitter seasoning, don't you think?",
    "It is well past midnight. The wolf is at the door, and yet you are still here, consuming content. Such a refined appetite.",
    "Your recent interactions suggest a preference for... spice. I've noted your penchant for the controversial.",
    "A certain user has viewed your 'About' section three times today. They are studying you. I suggest you study them back.",
];

const getHannibalContent = (notif) => {
    const type = notif.notification_type;
    const user = notif.actor_username;
    
    if (HANNIBAL_TEMPLATES[type]) {
        return HANNIBAL_TEMPLATES[type](user);
    }
    
    // Fallback for special cases or generic
    const content = notif.content || '';
    if (content.toLowerCase().includes('viewed your profile')) return HANNIBAL_TEMPLATES.profile_view(user);
    if (content.toLowerCase().includes('followed you after reading')) return `${user} has been following your trail. They revisited your past thoughts before deciding to... join you.`;
    
    return content;
};

// Sound Effect Helper
const playHannibalSound = (priority) => {
    // Description: Low cello note (Bach's Cello Suite No. 1) for normal
    // Description: Surgical steel clink for high priority
    console.log(`[Sound] Playing ${priority === 'high' ? 'surgical steel clink' : 'low cello note'}`);
    // In a real implementation, we would use:
    // const audio = new Audio(priority === 'high' ? '/sounds/clink.mp3' : '/sounds/cello.mp3');
    // audio.play();
};

const NotificationsPage = () => {
    const { data: notifications, isLoading, error, refetch } = useNotifications();
    const { mutate: markRead } = useMarkNotificationRead();
    const { mutate: deleteNotif } = useDeleteNotification();
    const { mutate: markAllRead } = useMarkAllRead();
    
    const [engagements, setEngagements] = useState(0);
    const [showSeasonal, setShowSeasonal] = useState(false);
    const [activeSpecial, setActiveSpecial] = useState(SEASONAL_SPECIALS[0]);
    const [slicingId, setSlicingId] = useState(null);
    const [prevCount, setPrevCount] = useState(0);

    // Rotate seasonal specials
    useEffect(() => {
        if (showSeasonal) {
            const interval = setInterval(() => {
                setActiveSpecial(SEASONAL_SPECIALS[Math.floor(Math.random() * SEASONAL_SPECIALS.length)]);
            }, 15000); // Change every 15s
            return () => clearInterval(interval);
        }
    }, [showSeasonal]);

    // Play sound when new notifications arrive
    useEffect(() => {
        if (notifications && notifications.length > prevCount) {
            const newNotif = notifications[0]; // Assuming newest is first
            const isCritical = newNotif.notification_type === 'login' || (newNotif.content || '').toLowerCase().includes('security');
            playHannibalSound(isCritical ? 'high' : 'normal');
            setPrevCount(notifications.length);
        }
    }, [notifications, prevCount]);

    // Grouping logic based on "Palate Intensity"
    const groupedNotifications = useMemo(() => {
        if (!notifications) return { digestif: [], platPrincipal: [], amuseBouche: [] };

        const groups = {
            digestif: [],      // High Intensity / Critical
            platPrincipal: [], // Medium Intensity / Engagement
            amuseBouche: []    // Low Intensity / Nudge
        };

        notifications.forEach(notif => {
            const type = notif.notification_type;
            const content = (notif.content || '').toLowerCase();

            // Digestif: Login alerts, Security, being "watched" explicitly
            if (type === 'login' || content.includes('security') || content.includes('login')) {
                groups.digestif.push(notif);
            }
            // Plat Principal: Mentions, Quotes, Profile Views, Follows from high-value actors
            else if (type === 'mention' || type === 'comment' || content.includes('viewed your profile')) {
                groups.platPrincipal.push(notif);
            }
            // Amuse-bouche: General Likes and Follows
            else {
                groups.amuseBouche.push(notif);
            }
        });

        return groups;
    }, [notifications]);

    const handleAction = (id, action) => {
        if (action === 'discard') {
            setSlicingId(id);
            setTimeout(() => {
                deleteNotif(id);
                setSlicingId(null);
            }, 500);
        } else if (action === 'savor') {
            markRead(id);
            setEngagements(prev => prev + 1);
        } else if (action === 'dissect') {
            markRead(id);
            setEngagements(prev => prev + 1);
            // Logic to open full context would go here
        } else if (action === 'return') {
            deleteNotif(id);
            // Logic to block/flag would go here
        }
    };

    if (isLoading)
        return (
            <div className="container notifications-page">
                <div className="page-header">
                    <h1>Notifications</h1>
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                    <NotificationSkeleton key={i} />
                ))}
            </div>
        );

    const canClearAll = engagements >= 10 || (notifications?.filter(n => !n.is_read).length === 0);

    const renderNotifItem = (notif) => {
        const isDigestif = groupedNotifications.digestif.includes(notif);
        const contentStr = (notif.content || '').toLowerCase();
        const isWatched = contentStr.includes('viewed') || contentStr.includes('followed you after');

        return (
            <div
                key={notif.id}
                className={`notification-item ${!notif.is_read ? 'unread' : ''} ${slicingId === notif.id ? 'slicing' : ''}`}
                onClick={() => !notif.is_read && handleAction(notif.id, 'savor')}
            >
                <div className="notif-avatar">
                    <Avatar
                        src={notif.actor_avatar_url}
                        name={notif.actor_username}
                        size="md"
                    />
                    <div className="type-badge">
                        {isDigestif ? <HeartIcon size={16} /> : <ForkIcon size={16} />}
                    </div>
                </div>
                <div className="notif-content">
                    <p>
                        {isWatched && <Eye size={14} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--hannibal-blood)' }} />}
                        {getHannibalContent(notif)}
                    </p>
                    <span className="notif-time">
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — A brief moment ago
                    </span>
                </div>
                <div className="notif-actions">
                    <button className="hannibal-btn btn-savor" onClick={(e) => { e.stopPropagation(); handleAction(notif.id, 'savor'); }}>Savor</button>
                    <button className="hannibal-btn btn-dissect" onClick={(e) => { e.stopPropagation(); handleAction(notif.id, 'dissect'); }}>Dissect</button>
                    <button className="hannibal-btn btn-discard" onClick={(e) => { e.stopPropagation(); handleAction(notif.id, 'discard'); }}>Discard</button>
                    <button className="hannibal-btn btn-return" onClick={(e) => { e.stopPropagation(); handleAction(notif.id, 'return'); }}>Return to Sender</button>
                </div>
            </div>
        );
    };

    return (
        <div className="container notifications-page">
            <div className="page-header">
                <h1>The Table is Set</h1>
                <div className="header-actions">
                    <span className="notif-count">
                        {notifications?.filter((n) => !n.is_read).length} Courses Remaining
                    </span>
                    <button 
                        className="mark-all-read-btn" 
                        onClick={() => markAllRead()}
                        disabled={!canClearAll}
                        title={!canClearAll ? "You must prove your palate first (10 engagements required)" : "Clear the table"}
                    >
                        {canClearAll ? "Clear the Table" : `Prove Your Palate (${10 - engagements} more)`}
                    </button>
                </div>
            </div>

            <div className="notifications-list">
                {notifications?.length === 0 && !showSeasonal ? (
                    <EmptyState icon={Bell} title="The dining room is silent." />
                ) : (
                    <div className="notifications-items">
                        {showSeasonal && (
                            <div className="chefs-table intensity-section">
                                <div className="special-text" style={{ fontSize: '1.2rem', color: '#fff' }}>
                                    "{activeSpecial}"
                                </div>
                                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                                    <button className="hannibal-btn" onClick={() => setEngagements(e => e + 5)}>Acknowledge</button>
                                    <button className="hannibal-btn" onClick={() => setShowSeasonal(false)}>Decline Table</button>
                                </div>
                            </div>
                        )}

                        {groupedNotifications.digestif.length > 0 && (
                            <div className="intensity-section">
                                <h2 className="intensity-title">Digestif</h2>
                                {groupedNotifications.digestif.map(renderNotifItem)}
                            </div>
                        )}

                        {groupedNotifications.platPrincipal.length > 0 && (
                            <div className="intensity-section">
                                <h2 className="intensity-title">Plat Principal</h2>
                                {groupedNotifications.platPrincipal.map(renderNotifItem)}
                            </div>
                        )}

                        {groupedNotifications.amuseBouche.length > 0 && (
                            <div className="intensity-section">
                                <h2 className="intensity-title">Amuse-Bouche</h2>
                                {groupedNotifications.amuseBouche.map(renderNotifItem)}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="seasonal-special-toggle">
                <h3>Advanced Palatal Profiles</h3>
                <p>Enable "Seasonal Specials" for a more... intimate experience.</p>
                <button 
                    className={`hannibal-btn ${showSeasonal ? 'btn-active-special' : ''}`}
                    onClick={() => setShowSeasonal(!showSeasonal)}
                >
                    {showSeasonal ? "Specials Active" : "Opt-in to Specials"}
                </button>
                {showSeasonal && (
                    <div className="special-alert-container">
                        <div className="special-icon"><HeartIcon size={20} /></div>
                        <div className="special-text">
                            "{activeSpecial}"
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
