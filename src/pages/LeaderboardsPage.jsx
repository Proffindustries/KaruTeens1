import React, { useState, useEffect } from 'react';
import {
    Trophy,
    Flame,
    Users,
    MessageCircle,
    BookOpen,
    Star,
    Crown,
    TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import api from '../api/client';
import { LeaderboardSkeleton } from '../components/Skeleton.jsx';
import '../styles/LeaderboardsPage.css';

const LeaderboardsPage = () => {
    const [activeTab, setActiveTab] = useState('points');
    const [leaderboards, setLeaderboards] = useState({
        points: [],
        streak: [],
        posts: [],
        helpful: [],
    });
    const [isLoading, setIsLoading] = useState(false);
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const tabs = [
        { id: 'points', label: 'Top Points', icon: <Star size={18} /> },
        { id: 'streak', label: 'Streaks', icon: <Flame size={18} /> },
        { id: 'posts', label: 'Most Posts', icon: <MessageCircle size={18} /> },
        { id: 'helpful', label: 'Most Helpful', icon: <Users size={18} /> },
    ];

    const getRankIcon = (rank) => {
        if (rank === 1) return <Crown size={20} color="#f1c40f" fill="#f1c40f" />;
        if (rank === 2) return <Crown size={20} color="#bdc3c7" fill="#bdc3c7" />;
        if (rank === 3) return <Crown size={20} color="#e67e22" fill="#e67e22" />;
        return <span className="rank-number">{rank}</span>;
    };

    const renderLeaderboard = () => {
        if (isLoading) {
            return [1, 2, 3, 4, 5].map((i) => <LeaderboardSkeleton key={i} />);
        }
        const data = leaderboards[activeTab];
        return (
            <div className="leaderboard-list">
                {data.map((user) => (
                    <Link
                        to={`/profile/${user.username}`}
                        key={user.rank}
                        className={`leaderboard-item ${user.username === currentUser.username ? 'current-user' : ''}`}
                    >
                        <div className="rank">{getRankIcon(user.rank)}</div>
                        <Avatar src={user.avatar} name={user.username} size="md" />
                        <div className="user-info">
                            <span className="username">@{user.username}</span>
                            <span className="stat-label">
                                {activeTab === 'points' && `${user.points.toLocaleString()} pts`}
                                {activeTab === 'streak' && `${user.streak} days 🔥`}
                                {activeTab === 'posts' && `${user.posts} posts`}
                                {activeTab === 'helpful' && `${user.helpful} helps`}
                            </span>
                        </div>
                        {user.streak && activeTab !== 'streak' && (
                            <span className="streak-badge">{user.streak}🔥</span>
                        )}
                    </Link>
                ))}
            </div>
        );
    };

    // Fetch leaderboards data from API
    useEffect(() => {
        const fetchLeaderboards = async () => {
            setIsLoading(true);
            try {
                const { data } = await api.get('/leaderboards');
                setLeaderboards(data);
            } catch (error) {
                console.error('Failed to load leaderboards:', error);
                // Keep empty state, UI will handle loading/error states
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeaderboards();
    }, []);

    return (
        <div className="container leaderboards-page">
            <div className="leaderboards-header">
                <h1>
                    <Trophy size={32} /> Leaderboards
                </h1>
                <p>See who's top of the campus this week!</p>
            </div>

            <div className="leaderboard-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="leaderboard-content card">{renderLeaderboard()}</div>

            <div className="leaderboard-footer">
                <p>🏆 Rankings reset every Monday at midnight</p>
                <p>💡 Earn points by posting, commenting, and helping others!</p>
            </div>
        </div>
    );
};

export default LeaderboardsPage;
