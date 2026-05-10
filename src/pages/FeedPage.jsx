import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Plus,
    Image as ImageIcon,
    Video,
    TrendingUp,
    Star,
    Sparkles,
    Hash,
    ArrowUp,
    Bookmark,
    WifiOff,
    RefreshCw,
    X,
    Search,
    PenSquare,
} from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { useQuery } from '@tanstack/react-query';
import PostCard from '../components/PostCard.jsx';
import CreatePostModal from '../components/CreatePostModal.jsx';
import ReportModal from '../components/ReportModal.jsx';
import { PostSkeleton } from '../components/Skeleton.jsx';
import '../styles/FeedPage.css';
import Avatar from '../components/Avatar.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import {
    useInfiniteFeed,
    useForYouFeed,
    useTrendingPosts,
    useTrendingTopics,
} from '../hooks/useContent';
import { useAuth, useLogout } from '../hooks/useAuth.js';
import { Link, useSearchParams } from 'react-router-dom';
import AdComponent from '../components/AdComponent.jsx';
import { useConnectionQuality } from '../hooks/useConnectionQuality';
import { useDataSweeper } from '../hooks/useDataSweeper';
import api from '../api/client';
import { STALE_TIMES } from '../utils/queryConfig';

const FEED_TYPE_KEY = 'feedType';
const SCROLL_TOP_THRESHOLD = 500;

const FeedPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const searchQuery = searchParams.get('search');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [feedType, setFeedType] = useState(() => {
        try {
            return sessionStorage.getItem(FEED_TYPE_KEY) || 'infinite';
        } catch {
            return 'infinite';
        }
    });
    const logout = useLogout();
    const { user } = useAuth();
    const connectionQuality = useConnectionQuality();
    const isSlowConnection = connectionQuality.isSlow;
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [newPostsCount, setNewPostsCount] = useState(0);
    const [reportPost, setReportPost] = useState(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchInput, setSearchInput] = useState(searchQuery || '');
    const searchInputRef = useRef(null);
    const virtuosoRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const latestPostIdRef = useRef(null);

    useDataSweeper(5 * 60 * 1000);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > SCROLL_TOP_THRESHOLD);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const { data: trending, isLoading: isTrendingLoading } = useTrendingTopics();

    const { data: userSuggestions } = useQuery({
        queryKey: ['userSuggestions'],
        queryFn: async () => {
            try {
                const { data } = await api.get('/follows/suggestions');
                return data;
            } catch {
                try {
                    const { data } = await api.get('/users/recommended');
                    return data;
                } catch {
                    return [];
                }
            }
        },
        staleTime: STALE_TIMES.USER_PROFILE,
        enabled: !!user,
        retry: false,
    });

    const queryOptions = useMemo(
        () => ({
            enabled: feedType === 'infinite',
            staleTime: isSlowConnection ? 5 * 60 * 1000 : 3 * 60 * 1000,
        }),
        [feedType, isSlowConnection],
    );

    const homeFeed = useInfiniteFeed(searchQuery, {
        ...queryOptions,
        enabled: feedType === 'infinite',
    });
    const forYouFeed = useForYouFeed({ enabled: feedType === 'for-you' });
    const trendingFeed = useTrendingPosts({ enabled: feedType === 'trending' });

    const activeFeed =
        feedType === 'for-you' ? forYouFeed : feedType === 'trending' ? trendingFeed : homeFeed;
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error, refetch } =
        activeFeed;

    useEffect(() => {
        try {
            sessionStorage.setItem(FEED_TYPE_KEY, feedType);
        } catch (e) {
            console.warn('Failed to save feed type:', e);
        }
    }, [feedType]);

    const handleFeedTypeChange = useCallback((type) => {
        setFeedType(type);
        setNewPostsCount(0);
    }, []);

    const allPosts = useMemo(() => {
        if (!data?.pages) return [];
        return data.pages.flatMap((page) => page || []);
    }, [data]);

    useEffect(() => {
        if (allPosts.length > 0 && !latestPostIdRef.current) {
            latestPostIdRef.current = allPosts[0]?.id;
        }
    }, [allPosts]);

    const showAds = !isSlowConnection;

    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleSearchSubmit = useCallback(
        (e) => {
            e.preventDefault();
            if (searchInput.trim()) {
                setSearchParams({ search: searchInput.trim() });
            } else {
                setSearchParams({});
            }
            setIsSearchOpen(false);
        },
        [searchInput, setSearchParams],
    );

    const openSearch = useCallback(() => {
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
    }, []);

    const handleKeyDown = useCallback(
        (e) => {
            const target = e.target;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            )
                return;
            switch (e.key) {
                case 'p':
                    e.preventDefault();
                    setIsModalOpen(true);
                    break;
                case '/':
                    e.preventDefault();
                    openSearch();
                    break;
            }
        },
        [openSearch],
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const clearSearch = useCallback(() => {
        setSearchParams({});
    }, [setSearchParams]);

    const handleReport = useCallback((post) => {
        setReportPost(post);
    }, []);

    const closeReport = useCallback(() => {
        setReportPost(null);
    }, []);

    const goToTop = useCallback(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const showSearchChip = !!searchQuery;

    return (
        <div className="container feed-layout">
            <CreatePostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            {reportPost && <ReportModal post={reportPost} onClose={closeReport} />}

            {isOffline && (
                <div className="offline-banner">
                    <WifiOff size={16} />
                    <span>You're offline. Some features may be unavailable.</span>
                </div>
            )}

            {showScrollTop && (
                <button className="scroll-top-fab" onClick={goToTop} aria-label="Scroll to top">
                    <ArrowUp size={24} />
                </button>
            )}

            <aside className="feed-sidebar left-sidebar">
                <div className="card mini-profile-card shadow-sm">
                    <div className="mini-profile-bg" />
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
                            <Link to="/explore?tab=media">
                                <ImageIcon size={18} /> Media Gallery
                            </Link>
                        </li>
                        {user && (
                            <li>
                                <Link to={`/profile/${user.username}?tab=saved`}>
                                    <Bookmark size={18} /> Saved Posts
                                </Link>
                            </li>
                        )}
                    </ul>
                </div>
                <div className="sidebar-ad-box" style={{ marginTop: '1.5rem' }}>
                    <AdComponent page="feed" />
                </div>
            </aside>

            <main className="feed-main" ref={scrollContainerRef}>
                {isLoading ? (
                    <Virtuoso
                        style={{ height: 'calc(100vh - 5rem)' }}
                        data={[]}
                        itemContent={() => null}
                        components={{
                            Header: () => (
                                <>
                                    <div className="feed-top-bar">
                                        <div className="feed-top-left">
                                            <button className="feed-icon-btn" aria-label="Search">
                                                <Search size={20} />
                                            </button>
                                            <button
                                                className="feed-icon-btn feed-create-btn"
                                                aria-label="Create post"
                                            >
                                                <PenSquare size={20} />
                                            </button>
                                        </div>
                                        <div className="rotating-prompt-bar">
                                            <span className="rotating-prompt-text visible">
                                                Loading...
                                            </span>
                                        </div>
                                    </div>
                                    {[1, 2, 3].map((i) => (
                                        <PostSkeleton key={`skeleton-${i}`} />
                                    ))}
                                </>
                            ),
                        }}
                    />
                ) : error ? (
                    <Virtuoso
                        style={{ height: 'calc(100vh - 5rem)' }}
                        data={[]}
                        itemContent={() => null}
                        components={{
                            Header: () => (
                                <div
                                    className="error-message card shadow-sm"
                                    style={{ padding: '2rem', textAlign: 'center', margin: '2rem' }}
                                >
                                    <p>
                                        Failed to load the feed. Please check your connection and
                                        try again.
                                    </p>
                                    <button
                                        onClick={() => refetch()}
                                        className="btn btn-primary btn-sm mt-2"
                                    >
                                        <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
                                        Retry
                                    </button>
                                </div>
                            ),
                        }}
                    />
                ) : allPosts.length === 0 && !user ? (
                    <Virtuoso
                        style={{ height: 'calc(100vh - 5rem)' }}
                        data={[]}
                        itemContent={() => null}
                        components={{
                            Header: () => (
                                <div className="card guest-feed-card" style={{ margin: '1rem' }}>
                                    <div className="welcome-icon">
                                        <Sparkles size={32} />
                                    </div>
                                    <h2>What's Happening?</h2>
                                    <p>
                                        Discover the latest campus news, events, and student
                                        highlights from KaruTeens.
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
                            ),
                        }}
                    />
                ) : (
                    <Virtuoso
                        ref={virtuosoRef}
                        style={{ height: 'calc(100vh - 5rem)' }}
                        data={allPosts}
                        itemContent={(index, post) => (
                            <ErrorBoundary lightweight key={post.id}>
                                <PostCard post={post} onReport={() => handleReport(post)} />
                                {showAds && index > 0 && (index + 1) % 5 === 0 && (
                                    <div className="feed-ad-wrapper">
                                        <AdComponent page="feed" />
                                    </div>
                                )}
                            </ErrorBoundary>
                        )}
                        endReached={loadMore}
                        components={{
                            Header: () => (
                                <>
                                    <div className="feed-top-bar">
                                        <div className="feed-top-left">
                                            <div
                                                className={`feed-search-wrapper ${isSearchOpen ? 'open' : ''}`}
                                            >
                                                {isSearchOpen ? (
                                                    <form
                                                        className="feed-search-form"
                                                        onSubmit={handleSearchSubmit}
                                                    >
                                                        <input
                                                            ref={searchInputRef}
                                                            type="text"
                                                            className="feed-search-input"
                                                            placeholder="Search hashtags, students, or posts..."
                                                            value={searchInput}
                                                            onChange={(e) =>
                                                                setSearchInput(e.target.value)
                                                            }
                                                            onBlur={() => {
                                                                if (!searchInput)
                                                                    setIsSearchOpen(false);
                                                            }}
                                                        />
                                                        <button
                                                            type="submit"
                                                            className="feed-search-go"
                                                            aria-label="Search"
                                                        >
                                                            <Search size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="feed-search-close"
                                                            onClick={() => {
                                                                setIsSearchOpen(false);
                                                                setSearchInput('');
                                                            }}
                                                            aria-label="Close search"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </form>
                                                ) : (
                                                    <button
                                                        className="feed-icon-btn"
                                                        onClick={openSearch}
                                                        aria-label="Search"
                                                    >
                                                        <Search size={20} />
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                className="feed-icon-btn feed-create-btn"
                                                onClick={() => setIsModalOpen(true)}
                                                aria-label="Create post"
                                            >
                                                <PenSquare size={20} />
                                            </button>
                                        </div>
                                        <RotatingPrompt onClick={() => setIsModalOpen(true)} />
                                    </div>
                                    <div className="feed-toggle card shadow-sm">
                                        <button
                                            className={`toggle-btn ${feedType === 'infinite' ? 'active' : ''}`}
                                            onClick={() => handleFeedTypeChange('infinite')}
                                        >
                                            🏠 Home
                                        </button>
                                        <button
                                            className={`toggle-btn ${feedType === 'for-you' ? 'active' : ''}`}
                                            onClick={() => handleFeedTypeChange('for-you')}
                                        >
                                            ✨ For You
                                        </button>
                                        <button
                                            className={`toggle-btn ${feedType === 'trending' ? 'active' : ''}`}
                                            onClick={() => handleFeedTypeChange('trending')}
                                        >
                                            🔥 Trending
                                        </button>
                                    </div>
                                    {showSearchChip && (
                                        <div className="search-filter-chip">
                                            <Hash size={14} />
                                            <span>
                                                Searching: <strong>{searchQuery}</strong>
                                            </span>
                                            <button
                                                className="chip-clear"
                                                onClick={clearSearch}
                                                aria-label="Clear search"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                    {newPostsCount > 0 && (
                                        <button
                                            className="new-posts-banner"
                                            onClick={() => {
                                                refetch();
                                                setNewPostsCount(0);
                                            }}
                                        >
                                            {newPostsCount} new post{newPostsCount > 1 ? 's' : ''}{' '}
                                            available
                                        </button>
                                    )}
                                </>
                            ),
                            Footer: () => (
                                <>
                                    {isFetchingNextPage && (
                                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                                            <PostSkeleton />
                                        </div>
                                    )}
                                    {!hasNextPage && allPosts.length > 0 && (
                                        <p className="feed-end-text">You've seen all posts</p>
                                    )}
                                </>
                            ),
                        }}
                        overscan={200}
                        increaseViewportBy={{ top: 400, bottom: 400 }}
                    />
                )}
            </main>

            <aside className="feed-sidebar right-sidebar">
                <AdComponent page="feed" />
                {user && (
                    <div
                        className="card user-mini-card shadow-sm"
                        style={{ marginBottom: '1.5rem' }}
                    >
                        <div className="user-mini-flex">
                            <Link to={`/profile/${user.username}`}>
                                <Avatar src={user.avatar_url} name={user.username} size="lg" />
                            </Link>
                            <div className="user-mini-text">
                                <Link to={`/profile/${user.username}`} className="user-mini-link">
                                    <h4>{user.username}</h4>
                                </Link>
                                <p className="text-muted">{user.email || 'Student'}</p>
                            </div>
                        </div>
                        <button onClick={logout} className="btn btn-outline btn-sm logout-btn">
                            Logout
                        </button>
                    </div>
                )}
                <div className="card trending-card shadow-sm">
                    <h3>
                        <TrendingUp size={20} color="var(--primary)" /> Trending Now
                    </h3>
                    {isTrendingLoading ? (
                        <div className="trending-loading">
                            {[80, 60, 70].map((w, i) => (
                                <div
                                    key={i}
                                    className="trending-skeleton"
                                    style={{
                                        height: '24px',
                                        marginBottom: i < 2 ? '8px' : 0,
                                        background: 'rgba(var(--text-muted), 0.15)',
                                        borderRadius: '4px',
                                        width: `${w}%`,
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="trending-list">
                            {trending?.length > 0 ? (
                                trending.map((item, idx) => (
                                    <Link
                                        key={idx}
                                        to={`/feed?search=${encodeURIComponent(item.tag)}`}
                                        className="trending-item"
                                    >
                                        <span className="trending-tag">{item.tag}</span>
                                        <span className="trending-count">
                                            {item.count} posts today
                                        </span>
                                    </Link>
                                ))
                            ) : (
                                <p className="trending-empty">
                                    No trends yet. Start using hashtags!
                                </p>
                            )}
                        </div>
                    )}
                </div>
                {user && userSuggestions?.length > 0 && (
                    <div className="card suggestions-card shadow-sm">
                        <h3>Who to follow</h3>
                        <div className="suggestion-list">
                            {userSuggestions.slice(0, 3).map((s) => (
                                <div key={s.id} className="suggestion-item">
                                    <div className="sug-info">
                                        <Avatar src={s.avatar_url} name={s.username} size="sm" />
                                        <div className="sug-text">
                                            <strong>{s.username}</strong>
                                            <span>{s.school || 'Student'}</span>
                                        </div>
                                    </div>
                                    <Link
                                        to={`/profile/${s.username}`}
                                        className="btn btn-outline btn-xs"
                                    >
                                        View
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="feed-footer">
                    <p>&copy; 2025 Karu Teens. Dedicated to Karatina University Students.</p>
                </div>
            </aside>
        </div>
    );
};

const PROMPTS = [
    "What's popping?",
    'Share your campus story',
    'Got a hot take?',
    'Study group anyone?',
    'Spill the tea ☕',
    'Campus gossip?',
    'Something funny?',
    'Lost something?',
    'Event happening?',
    'Shoutout someone',
    'Confession time?',
    'Drop a recommendation',
];

const RotatingPrompt = ({ onClick }) => {
    const [index, setIndex] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setVisible(false);
            setTimeout(() => {
                setIndex((prev) => (prev + 1) % PROMPTS.length);
                setVisible(true);
            }, 300);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <button className="rotating-prompt-bar" onClick={onClick}>
            <span className={`rotating-prompt-text ${visible ? 'visible' : 'hidden'}`}>
                {PROMPTS[index]}
            </span>
            <PenSquare size={16} className="rotating-prompt-icon" />
        </button>
    );
};

export default FeedPage;
