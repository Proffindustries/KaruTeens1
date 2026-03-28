import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Image as ImageIcon, Video, FileText, TrendingUp, Star } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import PostCard from '../components/PostCard.jsx';
import CreatePostModal from '../components/CreatePostModal.jsx';
import { PostSkeleton } from '../components/Skeleton.jsx';
import VirtualizedFeed from '../components/VirtualizedFeed.jsx';
import '../styles/FeedPage.css';
import Avatar from '../components/Avatar.jsx';
import { useInfiniteFeed, useTrendingTopics } from '../hooks/useContent.js';
import { useAuth, useLogout } from '../hooks/useAuth.js';
import { useProfile } from '../hooks/useUser.js';
import { Link } from 'react-router-dom';

const FeedPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [feedType, setFeedType] = useState('infinite'); // 'infinite', 'for-you', or 'trending'
    const { ref, inView } = useInView();
    const logout = useLogout();
    const { user } = useAuth();
    const { data: profileData, isLoading: isProfileLoading } = useProfile(user?.username || '');

    // Infinite Feed Hook
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
        useInfiniteFeed();

    // Trending Hook
    const { data: trending, isLoading: isTrendingLoading } = useTrendingTopics();

    // Trigger next page load when sentinel enters view
    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Flatten all pages of posts - memoized to prevent unnecessary recalculations
    const allPosts = useMemo(() => {
        if (!data?.pages) return [];
        return data.pages.flatMap((page) => page || []) || [];
    }, [data]);

    return (
        <div className="container feed-layout">
            <CreatePostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

            {/* Left Sidebar */}
            <aside className="feed-sidebar left-sidebar">
                <div className="card mini-profile-card shadow-sm">
                    <div className="mini-profile-bg"></div>
                    <div className="mini-profile-content">
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
            </aside>

            {/* Main Feed Area */}
            <main className="feed-main">
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

                {/* Create Post Widget */}
                <div className="card create-post-widget shadow-sm">
                    <div className="create-post-top">
                        <Avatar
                            src={user.avatar_url}
                            name={user.username || 'User'}
                            className="widget-avatar shadow-sm"
                        />
                        <div className="create-post-input">
                            <textarea
                                id="post-input"
                                placeholder="What's happening on campus, {user.username?.split(' ')[0] || 'User'}?"
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        // Handle post submission
                                        const textarea = e.target;
                                        const content = textarea.value.trim();
                                        if (content) {
                                            // TODO: Implement actual post creation
                                            console.log('Creating post:', content);
                                            textarea.value = '';
                                            textarea.rows = 1;
                                        }
                                    } else if (e.key === 'Enter' && e.shiftKey) {
                                        // Allow shift+enter for new line
                                        textarea.rows = parseInt(textarea.rows) + 1;
                                    }
                                }}
                                onInput={(e) => {
                                    // Auto-resize textarea based on content
                                    const textarea = e.target;
                                    textarea.style.height = 'auto';
                                    textarea.style.height = textarea.scrollHeight + 'px';
                                }}
                            />
                        </div>
                    </div>
                    <div className="create-post-actions">
                        <button
                            className="cp-action"
                            onClick={() => {
                                const textarea = document.getElementById('post-input');
                                if (textarea) {
                                    const content = textarea.value.trim();
                                    if (content) {
                                        // TODO: Implement actual post creation
                                        console.log('Creating post:', content);
                                        textarea.value = '';
                                        textarea.style.height = 'auto';
                                    }
                                }
                            }}
                        >
                            <ImageIcon size={18} color="#00b894" /> Photo
                        </button>
                        <button
                            className="cp-action"
                            onClick={() => {
                                const textarea = document.getElementById('post-input');
                                if (textarea) {
                                    const content = textarea.value.trim();
                                    if (content) {
                                        // TODO: Implement actual post creation
                                        console.log('Creating post:', content);
                                        textarea.value = '';
                                        textarea.style.height = 'auto';
                                    }
                                }
                            }}
                        >
                            <Video size={18} color="#6c5ce7" /> Video
                        </button>
                        <button
                            className="cp-action"
                            onClick={() => {
                                const textarea = document.getElementById('post-input');
                                if (textarea) {
                                    const content = textarea.value.trim();
                                    if (content) {
                                        // TODO: Implement actual post creation
                                        console.log('Creating post:', content);
                                        textarea.value = '';
                                        textarea.style.height = 'auto';
                                    }
                                }
                            }}
                        >
                            <Plus size={18} color="#0984e3" /> More
                        </button>
                        <button
                            className="btn btn-primary btn-sm"
                            style={{
                                marginLeft: 'auto',
                                borderRadius: '20px',
                                padding: '0.5rem 1.25rem',
                            }}
                            onClick={() => {
                                const textarea = document.getElementById('post-input');
                                if (textarea) {
                                    const content = textarea.value.trim();
                                    if (content) {
                                        // TODO: Implement actual post creation
                                        console.log('Creating post:', content);
                                        textarea.value = '';
                                        textarea.style.height = 'auto';
                                    }
                                }
                            }}
                        >
                            Post
                        </button>
                    </div>
                </div>

                {/* Posts Feed */}
                <div className="posts-container">
                    {isLoading ? (
                        <div
                            style={{
                                height: 600,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            {[1, 2, 3].map((i) => (
                                <PostSkeleton key={`skeleton-${i}`} />
                            ))}
                        </div>
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
                        <VirtualizedFeed
                            posts={allPosts}
                            isLoading={isFetchingNextPage}
                            error={error}
                            height={600}
                        />
                    )}
                </div>
            </main>

            {/* Right Sidebar */}
            <aside className="feed-sidebar right-sidebar">
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
                                    <div key={idx} className="trending-item">
                                        <span className="trending-tag">{item.tag}</span>
                                        <span className="trending-count">
                                            {item.count} posts today
                                        </span>
                                    </div>
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
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="suggestion-item">
                            <div className="sug-info">
                                <Avatar
                                    name={`User ${i}`}
                                    size="md"
                                    className="sug-avatar shadow-sm"
                                />
                                <div className="sug-text">
                                    <strong>Campus Leader {i}</strong>
                                    <span>Main Campus</span>
                                </div>
                            </div>
                            <button
                                className="btn btn-outline btn-xs"
                                style={{ borderRadius: '15px' }}
                            >
                                Follow
                            </button>
                        </div>
                    ))}
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
