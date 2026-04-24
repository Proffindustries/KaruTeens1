import React from 'react';
import { Link } from 'react-router-dom';
import {
    LayoutGrid,
    BookOpen,
    Heart,
    ShoppingBag,
    MessageCircle,
    Users,
    Calendar,
    Video,
    Bot,
    User,
    Settings,
    Info,
    Bell,
    Shield,
    DollarSign,
    Crown,
    Activity,
} from 'lucide-react';
import '../styles/ExplorePage.css';
import Avatar from '../components/Avatar.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useTrendingTopics } from '../hooks/useContent.js';
import { Hash, TrendingUp } from 'lucide-react';
import AdComponent from '../components/AdComponent.jsx';

const ExplorePage = () => {
    const { user, isAuthenticated } = useAuth();
    const { data: trending } = useTrendingTopics();

    // All pages grouped by category
    const categories = [
        {
            title: 'Social & Community',
            links: [
                {
                    name: 'My Feed',
                    path: '/feed',
                    icon: <LayoutGrid size={24} />,
                    color: '#3742fa',
                    desc: 'Your personal timeline',
                },
                {
                    name: 'Messages',
                    path: '/messages',
                    icon: <MessageCircle size={24} />,
                    color: '#2ed573',
                    desc: 'Chat with friends',
                },
                {
                    name: 'Groups',
                    path: '/groups',
                    icon: <Users size={24} />,
                    color: '#ff9f43',
                    desc: 'Student communities',
                },
                {
                    name: 'Pages',
                    path: '/pages',
                    icon: <BookOpen size={24} />,
                    color: '#00d2d3',
                    desc: 'Official campus pages',
                },
                {
                    name: 'Events',
                    path: '/events',
                    icon: <Calendar size={24} />,
                    color: '#ff4757',
                    desc: 'Campus activities',
                },
                {
                    name: 'Reels',
                    path: '/reels',
                    icon: <Video size={24} />,
                    color: '#ff4757',
                    desc: 'Short student videos',
                },
                {
                    name: 'Stories',
                    path: '/status',
                    icon: <Activity size={24} />,
                    color: '#e056fd',
                    desc: 'Student updates',
                },
                {
                    name: 'Confessions',
                    path: '/confessions',
                    icon: <Shield size={24} />,
                    color: '#6c5ce7',
                    desc: 'Anonymous campus confessions',
                },
                {
                    name: 'Live Streams',
                    path: '/live',
                    icon: <Video size={24} />,
                    color: '#ff3f34',
                    desc: 'Watch & go live',
                },
            ],
        },
        {
            title: 'Academic & Tools',
            links: [
                {
                    name: 'Study Rooms',
                    path: '/study-rooms',
                    icon: <Video size={24} />,
                    color: '#5352ed',
                    desc: 'Virtual collaboration',
                },
                {
                    name: 'Study Playlists',
                    path: '/study-playlists',
                    icon: <BookOpen size={24} />,
                    color: '#20bf6b',
                    desc: 'Curated music for focus',
                },
                {
                    name: 'Recall',
                    path: '/recall',
                    icon: <BookOpen size={24} />,
                    color: '#ff6348',
                    desc: 'Notes & Question papers',
                },
                {
                    name: 'Revision Materials',
                    path: '/revision-materials',
                    icon: <LayoutGrid size={24} />,
                    color: '#1e90ff',
                    desc: 'Curated study resources',
                },
                {
                    name: 'Templates',
                    path: '/templates',
                    icon: <LayoutGrid size={24} />,
                    color: '#a29bfe',
                    desc: 'Document templates',
                },
                {
                    name: 'Timetable',
                    path: '/timetable',
                    icon: <Calendar size={24} />,
                    color: '#fdcb6e',
                    desc: 'Your class schedule',
                },
                {
                    name: 'AI Assistant',
                    path: '/ai-assistant',
                    icon: <Bot size={24} />,
                    color: '#2f3542',
                    desc: 'Advanced study helper',
                },
            ],
        },
        {
            title: 'Lifestyle & Perks',
            links: [
                {
                    name: 'Marketplace',
                    path: '/marketplace',
                    icon: <ShoppingBag size={24} />,
                    color: '#20bf6b',
                    desc: 'Student marketplace',
                },
                {
                    name: 'Dating / Match',
                    path: '/date',
                    icon: <Heart size={24} />,
                    color: '#fc5c65',
                    desc: 'Meet your campus match',
                },
                {
                    name: 'Leaderboards',
                    path: '/leaderboards',
                    icon: <Crown size={24} />,
                    color: '#f1c40f',
                    desc: 'Top students this week',
                },
                {
                    name: 'Premium',
                    path: '/premium',
                    icon: <Crown size={24} />,
                    color: '#ffd32a',
                    desc: 'Get exclusive features',
                },
                {
                    name: 'Donate',
                    path: '/donate',
                    icon: <DollarSign size={24} />,
                    color: '#05c46b',
                    desc: 'Support the platform',
                },
            ],
        },
        {
            title: 'Account & Settings',
            links: [
                {
                    name: 'My Profile',
                    path: user ? `/profile/${user.username}` : '/profile',
                    icon: <User size={24} />,
                    color: '#1e90ff',
                    desc: 'Manage your presence',
                },
                {
                    name: 'Settings',
                    path: '/settings',
                    icon: <Settings size={24} />,
                    color: '#747d8c',
                    desc: 'App preferences',
                },
                {
                    name: 'Notifications',
                    path: '/notifications',
                    icon: <Bell size={24} />,
                    color: '#fa8231',
                    desc: 'Stay updated',
                },
                {
                    name: 'Activity Feed',
                    path: '/activity',
                    icon: <Activity size={24} />,
                    color: '#e84393',
                    desc: 'Your recent interactions',
                },
                {
                    name: 'Search',
                    path: '/search',
                    icon: <Info size={24} />,
                    color: '#3dc1d3',
                    desc: 'Find people & content',
                },
            ],
        },
        {
            title: 'Information & Support',
            links: [
                {
                    name: 'Campus Hub (Blog)',
                    path: '/blog',
                    icon: <BookOpen size={24} />,
                    color: '#ff9f43',
                    desc: 'Expert guides & study tips',
                },
                {
                    name: 'About KaruTeens',
                    path: '/about',
                    icon: <Info size={24} />,
                    color: '#4b7bec',
                    desc: 'Learn about our mission',
                },
                {
                    name: 'Contact Support',
                    path: '/contact',
                    icon: <MessageCircle size={24} />,
                    color: '#eb3b5a',
                    desc: 'Get help from our team',
                },
                {
                    name: 'Legal & Privacy',
                    path: '/legal',
                    icon: <Shield size={24} />,
                    color: '#485460',
                    desc: 'Terms and conditions',
                },
            ],
        },
    ];

    return (
        <div className="container explore-page">
            <div
                className="explore-header"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '3rem',
                }}
            >
                <div className="explore-title-box">
                    <h1>Explore KaruTeens</h1>
                    <p>All your campus needs in one place. Navigate quickly to any section.</p>
                </div>
                {isAuthenticated && (
                    <Link to={`/profile/${user.username}`}>
                        <Avatar
                            src={user.avatar_url}
                            name={user.username}
                            size="3xl"
                            className="explore-profile-avatar shadow-lg"
                        />
                    </Link>
                )}
            </div>

            {trending && trending.length > 0 && (
                <div className="trending-hashtags-strip card mb-12">
                    <div className="flex items-center gap-2 mb-4 text-primary font-bold">
                        <TrendingUp size={20} />
                        <span>Trending on Campus</span>
                    </div>
                    <div className="hashtags-cloud">
                        {trending.map((tag, i) => (
                            <Link
                                key={i}
                                to={`/feed?search=${encodeURIComponent(tag.id)}`}
                                className="trending-tag"
                            >
                                <span className="hashtag-icon">
                                    <Hash size={14} />
                                </span>
                                <span className="hashtag-name">{tag.id.replace('#', '')}</span>
                                <span className="hashtag-count">{tag.count}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="explore-grid">
                {categories.map((cat, idx) => (
                    <div key={idx} className="explore-section">
                        <h2>{cat.title}</h2>
                        <div className="links-grid">
                            {cat.links.map((link, lIdx) => (
                                <Link to={link.path} key={lIdx} className="explore-card">
                                    <div
                                        className="explore-icon"
                                        style={{ background: `${link.color}15`, color: link.color }}
                                    >
                                        {link.icon}
                                    </div>
                                    <div className="explore-info">
                                        <h3>{link.name}</h3>
                                        <p>{link.desc}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}

                <div
                    className="explore-ad-full shadow-sm card"
                    style={{ padding: '0', gridColumn: '1 / -1', overflow: 'hidden' }}
                >
                    <AdComponent page="explore" />
                </div>

                {/* Admin Link Separate */}
                <div className="explore-section">
                    <h2>Admin Area</h2>
                    <div className="links-grid">
                        <Link to="/admin" className="explore-card admin-card">
                            <div
                                className="explore-icon"
                                style={{ background: '#e74c3c15', color: '#e74c3c' }}
                            >
                                <Shield size={24} />
                            </div>
                            <div className="explore-info">
                                <h3>Admin Dashboard</h3>
                                <p>Management & Stats</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExplorePage;
