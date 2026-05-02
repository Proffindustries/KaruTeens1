import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Plus,
    Image as ImageIcon,
    Video,
    FileText,
    TrendingUp,
    Star,
    Sparkles,
    Hash,
} from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import PostCard from '../components/PostCard.jsx';
import CreatePostModal from '../components/CreatePostModal.jsx';
import { PostSkeleton } from '../components/Skeleton.jsx';
import '../styles/FeedPage.css';
import Avatar from '../components/Avatar.jsx';
import {
    useInfiniteFeed,
    useForYouFeed,
    useTrendingPosts,
    useTrendingTopics,
} from '../hooks/useContent';
import { useAuth, useLogout } from '../hooks/useAuth.js';
import { Link, useSearchParams } from 'react-router-dom';
import AdComponent from '../components/AdComponent.jsx';

import SearchBar from '../components/SearchBar.jsx';

const FeedPage = () => {
    const [searchParams] = useSearchParams();
    const searchQuery = searchParams.get('search');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [feedType, setFeedType] = useState('infinite'); // 'infinite', 'for-you', or 'trending'
    const { ref, inView } = useInView({ threshold: 0 });
    const logout = useLogout();
    const { user } = useAuth();

    // Trending topics for sidebar
    const { data: trending, isLoading: isTrendingLoading } = useTrendingTopics();

    // Use the correct feed hook based on active tab
    const homeFeed = useInfiniteFeed(searchQuery);
    const forYouFeed = useForYouFeed();
    const trendingFeed = useTrendingPosts();

    const activeFeed =
        feedType === 'for-you' ? forYouFeed : feedType === 'trending' ? trendingFeed : homeFeed;

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } = activeFeed;

    // Trigger next page load when sentinel enters view
    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Flatten all pages of posts - memoized to prevent unnecessary recalculations
    const allPosts = useMemo(() => {
        if (!data?.pages) return [];
        return data.pages.flatMap((page) => page || []);
    }, [data]);

    return (
        <div className="container feed-layout">
            <CreatePostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

            {/* Left Sidebar */}
            <aside className="feed-sidebar left-sidebar">
                <div className="card mini-profile-card shadow-sm">
                    <div className="mini-profile-bg"></div>
                    <div className="mini-profile-content">
                        {user ? (
                            <>
                                <Avatar
                                    src={user?.avatar_url}
                                    name={user?.username || 'User'}
                                    className="mini-avatar shadow"
                                />
                                <h3>{user?.username || 'Anonymous'}</h3>
                                <p>{user?.email}</p>
                                <div className="mini-stats">
                                    <div>
                                        <strong>{user?.follower_count || 0}</strong>
                                        <span>Followers</span>
                                    </div>
                                    <div>
                                        <strong>{user?.following_count || 0}</strong>
                                        <span>Following</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="guest-sidebar-cta">
                                <h3>Welcome to KaruTeens</h3>
                                <p>
                                    Join our campus community to share posts and connect with
                                    students.
                                </p>
                                <Link
                                    to="/register"
                                    className="btn btn-primary btn-sm btn-full mt-2"
                                >
                                    Join Now
                                </Link>
                                <Link to="/login" className="btn btn-outline btn-sm btn-full mt-2">
                                    Login
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card sidebar-menu shadow-sm">
                    <h3>Explore</h3>
                    <ul className="nav-links">
                        <li className="active">
                            <TrendingUp size={18} /> Campus Feed
                        </li>
                        <li>
                            <ImageIcon size={18} /> Media Gallery
                        </li>
                    </ul>
                </div>

                <div className="sidebar-ad-box" style={{ marginTop: '1.5rem' }}>
                    <AdComponent page="feed" />
                </div>
            </aside>

            {/* Main Feed Area */}
            <main className="feed-main">
                <SearchBar placeholder="Search hashtags, students, or posts..." />
                {/* Feed Type Toggle */}
                <div className="feed-toggle card shadow-sm">
                    <button
                        className={`toggle-btn ${feedType === 'infinite' ? 'active' : ''}`}
                        onClick={() => setFeedType('infinite')}
                    >
                        🏠 Home
                    </button>
                    <button
                        className={`toggle-btn ${feedType === 'for-you' ? 'active' : ''}`}
                        onClick={() => setFeedType('for-you')}
                    >
                        ✨ For You
                    </button>
                    <button
                        className={`toggle-btn ${feedType === 'trending' ? 'active' : ''}`}
                        onClick={() => setFeedType('trending')}
                    >
                        🔥 Trending
                    </button>
                </div>

                {/* Create Post Widget - Only for logged in users */}
                {user ? (
                    <div className="card create-post-widget shadow-sm">
                        <div className="create-post-top">
                            <Avatar
                                src={user?.avatar_url}
                                name={user?.username || 'User'}
                                className="widget-avatar shadow-sm"
                            />
                            <div
                                className="create-post-input"
                                onClick={() => setIsModalOpen(true)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div
                                    style={{
                                        padding: '0.65rem 1rem',
                                        borderRadius: '20px',
                                        background: 'rgba(var(--border), 0.15)',
                                        color: 'rgb(var(--text-muted))',
                                        fontSize: '0.95rem',
                                        userSelect: 'none',
                                    }}
                                >
                                    What's happening on campus,{' '}
                                    {user.username?.split(' ')[0] || 'Student'}?
                                </div>
                            </div>
                        </div>
                        <div className="create-post-actions">
                            <button className="cp-action" onClick={() => setIsModalOpen(true)}>
                                <ImageIcon size={18} color="#00b894" /> Photo
                            </button>
                            <button className="cp-action" onClick={() => setIsModalOpen(true)}>
                                <Video size={18} color="#6c5ce7" /> Video
                            </button>
                            <button className="cp-action" onClick={() => setIsModalOpen(true)}>
                                <Plus size={18} color="#0984e3" /> More
                            </button>
                            <button
                                className="btn btn-primary btn-sm cp-post-btn"
                                style={{
                                    borderRadius: '20px',
                                    padding: '0.5rem 1.25rem',
                                }}
                                onClick={() => setIsModalOpen(true)}
                            >
                                Post
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="card guest-feed-card">
                        <div className="welcome-icon">
                            <Sparkles size={32} />
                        </div>
                        <h2>What's Happening?</h2>
                        <p>
                            Discover the latest campus news, events, and student highlights from
                            KaruTeens. Join our community to start sharing your own stories!
                        </p>
                        <div className="guest-actions">
                            <Link to="/register" className="btn btn-primary">
                                Get Started
                            </Link>
                            <Link to="/login" className="btn btn-outline">
                                Sign In
                            </Link>
                        </div>
                    </div>
                )}

                {/* Posts Feed */}
                <div className="posts-container">
                    {isLoading ? (
                        [1, 2, 3].map((i) => <PostSkeleton key={`skeleton-${i}`} />)
                    ) : error ? (
                        <div
                            className="error-message card shadow-sm"
                            style={{ padding: '2rem', textAlign: 'center' }}
                        >
                            <p>
                                Failed to load the feed. Please check your connection and try again.
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="btn btn-primary btn-sm mt-2"
                            >
                                Refresh Page
                            </button>
                        </div>
                    ) : allPosts.length === 0 ? (
                        <div
                            className="empty-feed card shadow-sm"
                            style={{ padding: '4rem 2rem', textAlign: 'center' }}
                        >
                            <Star
                                size={48}
                                color="rgba(var(--primary), 0.3)"
                                style={{ marginBottom: '1rem' }}
                            />
                            <h3>No posts yet!</h3>
                            <p style={{ color: 'rgb(var(--text-muted))' }}>
                                Be the first student to share something on Karu Teens.
                            </p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="btn btn-outline btn-sm mt-2"
                            >
                                Create First Post
                            </button>
                        </div>
                    ) : (
                        <>
                            {allPosts.map((post, index) => (
                                <React.Fragment key={post.id}>
                                    <PostCard post={post} />
                                    {index > 0 && (index + 1) % 5 === 0 && (
                                        <div className="feed-ad-wrapper">
                                            <AdComponent page="feed" />
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                            {/* Infinite scroll sentinel */}
                            <div ref={ref} style={{ height: 1 }} />
                            {isFetchingNextPage && (
                                <div style={{ textAlign: 'center', padding: '1rem' }}>
                                    <PostSkeleton />
                                </div>
                            )}
                            {!hasNextPage && allPosts.length > 0 && (
                                <p
                                    style={{
                                        textAlign: 'center',
                                        padding: '2rem',
                                        color: 'rgb(var(--text-muted))',
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    You've seen all posts 🎉
                                </p>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Right Sidebar */}
            <aside className="feed-sidebar right-sidebar">
                <AdComponent page="feed" />
                {/* User Info & Logout Card */}
                {user && (
                    <div
                        className="card user-mini-card shadow-sm"
                        style={{ marginBottom: '1.5rem' }}
                    >
                        <div
                            className="user-mini-flex"
                            style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                        >
                            <Link to={`/profile/${user.username}`}>
                                <Avatar src={user.avatar_url} name={user.username} size="lg" />
                            </Link>
                            <div className="user-mini-text">
                                <Link
                                    to={`/profile/${user.username}`}
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                    <h4 style={{ margin: 0, fontSize: '1rem' }}>{user.username}</h4>
                                </Link>
                                <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                                    {user.email || 'Student'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="btn btn-outline btn-sm"
                            style={{
                                marginTop: '1rem',
                                width: '100%',
                                borderColor: 'rgba(var(--primary), 0.2)',
                                color: 'rgb(var(--text-muted))',
                            }}
                        >
                            Logout
                        </button>
                    </div>
                )}

                {/* Trending Topics */}
                <div className="card trending-card shadow-sm">
                    <h3>
                        <TrendingUp size={20} color="var(--primary)" /> Trending Now
                    </h3>
                    {isTrendingLoading ? (
                        <div className="trending-loading">
                            <div
                                className="trending-skeleton"
                                style={{
                                    height: '24px',
                                    marginBottom: '8px',
                                    background: 'rgba(var(--border), 0.3)',
                                    borderRadius: '4px',
                                    width: '80%',
                                }}
                            />
                            <div
                                className="trending-skeleton"
                                style={{
                                    height: '24px',
                                    marginBottom: '8px',
                                    background: 'rgba(var(--border), 0.3)',
                                    borderRadius: '4px',
                                    width: '60%',
                                }}
                            />
                            <div
                                className="trending-skeleton"
                                style={{
                                    height: '24px',
                                    background: 'rgba(var(--border), 0.3)',
                                    borderRadius: '4px',
                                    width: '70%',
                                }}
                            />
                        </div>
                    ) : (
                        <div className="trending-list">
                            {trending?.length > 0 ? (
                                trending.map((item, idx) => (
                                    <Link
                                        key={idx}
                                        to={`/feed?search=${encodeURIComponent(item.tag)}`}
                                        className="trending-item"
                                        style={{
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            display: 'block',
                                        }}
                                    >
                                        <span
                                            className="trending-tag"
                                            style={{ color: 'var(--primary)', fontWeight: '600' }}
                                        >
                                            {item.tag}
                                        </span>
                                        <span
                                            className="trending-count"
                                            style={{ display: 'block' }}
                                        >
                                            {item.count} posts today
                                        </span>
                                    </Link>
                                ))
                            ) : (
                                <p style={{ fontSize: '0.85rem', color: 'rgb(var(--text-muted))' }}>
                                    No trends yet. Start using hashtags!
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="card suggestions-card shadow-sm" style={{ marginTop: '1.5rem' }}>
                    <h3>Who to follow</h3>
                    <p
                        style={{
                            fontSize: '0.85rem',
                            color: 'rgb(var(--text-muted))',
                            padding: '1rem 0',
                        }}
                    >
                        Follow other students to see their posts in your feed!
                    </p>
                </div>

                <div
                    className="footer-links"
                    style={{
                        marginTop: '2rem',
                        padding: '0 1rem',
                        fontSize: '0.75rem',
                        color: 'rgb(var(--text-muted))',
                        textAlign: 'center',
                    }}
                >
                    <p>&copy; 2025 Karu Teens. Dedicated to Karatina University Students.</p>
                </div>
            </aside>
        </div>
    );
};

export default FeedPage;
