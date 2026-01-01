import React, { useState, useEffect } from 'react';
import { Plus, Image as ImageIcon, Video, FileText, TrendingUp, Loader2 } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import PostCard from '../components/PostCard.jsx';
import CreatePostModal from '../components/CreatePostModal.jsx';
import { PostSkeleton } from '../components/Skeleton.jsx';
import '../styles/FeedPage.css';
import Avatar from '../components/Avatar.jsx';
import { useInfiniteFeed, useTrendingTopics } from '../hooks/useContent.js';
import { useAuth, useLogout } from '../hooks/useAuth.js';
import { Link } from 'react-router-dom';

const FeedPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { ref, inView } = useInView();
    const logout = useLogout();
    const { user } = useAuth();

    // Infinite Feed Hook
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        error
    } = useInfiniteFeed();

    // Trending Hook
    const { data: trending, isLoading: isTrendingLoading } = useTrendingTopics();

    // Trigger next page load when sentinel enters view
    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);



    // Flatten all pages of posts
    const allPosts = data?.pages.flatMap(page => page) || [];

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
                            <div><strong>0</strong><span>Followers</span></div>
                            <div><strong>0</strong><span>Following</span></div>
                        </div>
                    </div>
                </div>

                <div className="card sidebar-menu shadow-sm">
                    <h3>Explore</h3>
                    <ul className="nav-links">
                        <li className="active"><TrendingUp size={18} /> Campus Feed</li>
                        <li><ImageIcon size={18} /> Media Gallery</li>
                    </ul>
                </div>
            </aside>

            {/* Main Feed Area */}
            <main className="feed-main">
                {/* Create Post Widget */}
                <div className="card create-post-widget shadow-sm">
                    <div className="create-post-top">
                        <Avatar
                            src={user.avatar_url}
                            name={user.username || 'User'}
                            className="widget-avatar shadow-sm"
                        />
                        <div className="fake-input" onClick={() => setIsModalOpen(true)}>
                            What's happening on campus, {user.username.split(' ')[0]}?
                        </div>
                    </div>
                    <div className="create-post-actions">
                        <button className="cp-action" onClick={() => setIsModalOpen(true)}><ImageIcon size={18} color="#00b894" /> Photo</button>
                        <button className="cp-action" onClick={() => setIsModalOpen(true)}><Video size={18} color="#6c5ce7" /> Video</button>
                        <button className="cp-action" onClick={() => setIsModalOpen(true)}><Plus size={18} color="#0984e3" /> More</button>
                        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto', borderRadius: '20px', padding: '0.5rem 1.25rem' }} onClick={() => setIsModalOpen(true)}>Post</button>
                    </div>
                </div>

                {/* Posts Feed */}
                <div className="posts-container">
                    {isLoading ? (
                        [1, 2, 3].map(i => <PostSkeleton key={i} />)
                    ) : error ? (
                        <div className="error-message card shadow-sm" style={{ padding: '2rem', textAlign: 'center' }}>
                            <p>Failed to load the feed. Please try again later.</p>
                        </div>
                    ) : (
                        <>
                            {allPosts.length === 0 && (
                                <div className="empty-feed card shadow-sm" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                                    <Sparkles size={48} color="rgba(var(--primary), 0.3)" style={{ marginBottom: '1rem' }} />
                                    <h3>No posts yet!</h3>
                                    <p style={{ color: 'rgb(var(--text-muted))' }}>Be the first student to share something on Karu Teens.</p>
                                </div>
                            )}
                            {allPosts.map(post => (
                                <PostCard key={post.id} post={post} />
                            ))}

                            {/* Infinite Scroll Load Trigger */}
                            <div ref={ref} className="infinite-scroll-sentinel">
                                {isFetchingNextPage && (
                                    <div className="loader-container">
                                        <Loader2 className="animate-spin" color="rgb(var(--primary))" />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Right Sidebar */}
            <aside className="feed-sidebar right-sidebar">
                {/* User Info & Logout Card */}
                {user && (
                    <div className="card user-mini-card shadow-sm" style={{ marginBottom: '1.5rem' }}>
                        <div className="user-mini-flex" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Link to={`/profile/${user.username}`}>
                                <Avatar src={user.avatar_url} name={user.username} size="lg" />
                            </Link>
                            <div className="user-mini-text">
                                <Link to={`/profile/${user.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <h4 style={{ margin: 0, fontSize: '1rem' }}>{user.username}</h4>
                                </Link>
                                <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>{user.email || 'Student'}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="btn btn-outline btn-sm"
                            style={{ marginTop: '1rem', width: '100%', borderColor: 'rgba(var(--primary), 0.2)', color: 'rgb(var(--text-muted))' }}
                        >
                            Logout
                        </button>
                    </div>
                )}

                {/* Trending Topics */}
                <div className="card trending-card shadow-sm">
                    <h3><TrendingUp size={20} color="var(--primary)" /> Trending Now</h3>
                    {isTrendingLoading ? (
                        <div className="loader-container"><Loader2 className="animate-spin" size={20} /></div>
                    ) : (
                        <div className="trending-list">
                            {trending?.length > 0 ? trending.map((item, idx) => (
                                <div key={idx} className="trending-item">
                                    <span className="trending-tag">{item.tag}</span>
                                    <span className="trending-count">{item.count} posts today</span>
                                </div>
                            )) : (
                                <p style={{ fontSize: '0.85rem', color: 'rgb(var(--text-muted))' }}>No trends yet. Start using hashtags!</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="card suggestions-card shadow-sm" style={{ marginTop: '1.5rem' }}>
                    <h3>Who to follow</h3>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="suggestion-item">
                            <div className="sug-info">
                                <Avatar name={`User ${i}`} size="md" className="sug-avatar shadow-sm" />
                                <div className="sug-text">
                                    <strong>Campus Leader {i}</strong>
                                    <span>Main Campus</span>
                                </div>
                            </div>
                            <button className="btn btn-outline btn-xs" style={{ borderRadius: '15px' }}>Follow</button>
                        </div>
                    ))}
                </div>

                <div className="footer-links" style={{ marginTop: '2rem', padding: '0 1rem', fontSize: '0.75rem', color: 'rgb(var(--text-muted))', textAlign: 'center' }}>
                    <p>&copy; 2025 Karu Teens. Dedicated to Karatina University Students.</p>
                </div>
            </aside>
        </div>
    );
};

export default FeedPage;
