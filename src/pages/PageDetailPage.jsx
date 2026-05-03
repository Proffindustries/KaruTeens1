import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    Users,
    Calendar,
    ChevronLeft,
    CheckCircle,
    Star,
    MapPin,
    Plus,
    Layout as LayoutIcon,
    Image as ImageIcon,
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';
import { usePage, useFollowPage, useUnfollowPage } from '../hooks/usePages';
import { useInfinitePagePosts } from '../hooks/useInfiniteQueries';
import PostCard from '../components/PostCard.jsx';
import { PostSkeleton } from '../components/Skeleton.jsx';
import Avatar from '../components/Avatar.jsx';
import CreatePostModal from '../components/CreatePostModal.jsx';
import '../styles/PageDetail.css';

const PageDetailPage = () => {
    const { slug } = useParams();
    const { data: page, isLoading, error } = usePage(slug);
    const { mutate: follow } = useFollowPage();
    const { mutate: unfollow } = useUnfollowPage();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);

    const handleDeletePage = async () => {
        if (
            window.confirm(
                'Are you sure you want to DELETE this page? This action cannot be undone.',
            )
        ) {
            try {
                await api.delete(`/pages/${page.id}`);
                showToast('Page deleted!', 'success');
                navigate('/pages');
            } catch (err) {
                showToast('Failed to delete page', 'error');
            }
        }
    };
    const [activeTab, setActiveTab] = useState('posts');

    const {
        data: postsData,
        isLoading: isLoadingPosts,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfinitePagePosts(page?.id);

    const posts = postsData?.pages?.flatMap((page) => page) || [];

    if (isLoading) {
        return (
            <div className="container py-8">
                <div className="animate-pulse">
                    <div className="h-64 bg-gray-200 rounded-2xl mb-8"></div>
                    <div className="h-10 bg-gray-200 w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 w-1/2 mb-8"></div>
                </div>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="container py-20 text-center">
                <h2>Page Not Found</h2>
                <p>The page you're looking for doesn't exist.</p>
                <Link to="/pages" className="btn btn-primary mt-4">
                    Browse Pages
                </Link>
            </div>
        );
    }

    const handleFollowToggle = () => {
        if (page.is_following) {
            unfollow(page.id);
        } else {
            follow(page.id);
        }
    };

    return (
        <div className="page-detail-container">
            {/* Cover and Header */}
            <div className="page-header-wrapper">
                <div
                    className="page-cover"
                    style={{
                        backgroundImage: `url(${page.cover_url || 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=1000'})`,
                    }}
                >
                    <Link to="/pages" className="back-button">
                        <ChevronLeft size={20} /> Back
                    </Link>
                </div>

                <div className="container">
                    <div className="header-content">
                        <div className="page-avatar-lg-wrapper">
                            <Avatar
                                src={page.avatar_url}
                                name={page.name}
                                className="page-avatar-lg"
                            />
                            {page.is_official && (
                                <div className="official-badge-detail">
                                    <Star size={14} fill="currentColor" />
                                </div>
                            )}
                        </div>

                        <div className="header-info">
                            <div className="title-row">
                                <h1>{page.name}</h1>
                                {page.is_official && (
                                    <CheckCircle size={20} className="verified-icon" />
                                )}
                            </div>
                            <p className="slug">p/{page.slug}</p>
                            <p className="description">{page.description}</p>

                            <div className="meta-info">
                                <span>
                                    <Users size={16} /> {page.follower_count} Followers
                                </span>
                                <span>
                                    <LayoutIcon size={16} /> {page.category}
                                </span>
                                <span>
                                    <Calendar size={16} /> Created{' '}
                                    {new Date(page.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        <div className="header-actions">
                            {page.is_creator ? (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setIsPostModalOpen(true)}
                                    >
                                        <Plus size={18} /> New Post
                                    </button>
                                    <button
                                        className="btn btn-outline danger"
                                        onClick={handleDeletePage}
                                    >
                                        Delete Page
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className={`btn ${page.is_following ? 'btn-outline' : 'btn-primary'}`}
                                    onClick={handleFollowToggle}
                                >
                                    {page.is_following ? 'Following' : 'Follow Page'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container main-content mt-8">
                <div className="content-grid">
                    <div className="feed-column">
                        <div className="feed-header">
                            <button
                                className={activeTab === 'posts' ? 'active' : ''}
                                onClick={() => setActiveTab('posts')}
                            >
                                Posts
                            </button>
                            <button
                                className={activeTab === 'media' ? 'active' : ''}
                                onClick={() => setActiveTab('media')}
                            >
                                Media
                            </button>
                            <button
                                className={activeTab === 'about' ? 'active' : ''}
                                onClick={() => setActiveTab('about')}
                            >
                                About
                            </button>
                        </div>

                        <div className="posts-list">
                            {activeTab === 'posts' && (
                                <>
                                    {isLoadingPosts ? (
                                        [1, 2, 3].map((n) => <PostSkeleton key={n} />)
                                    ) : (posts || []).length > 0 ? (
                                        posts.map((post) => <PostCard key={post.id} post={post} />)
                                    ) : (
                                        <div className="empty-feed">
                                            <ImageIcon size={48} />
                                            <p>No posts yet from this page.</p>
                                            {page.is_creator && (
                                                <button
                                                    className="btn btn-primary mt-4"
                                                    onClick={() => setIsPostModalOpen(true)}
                                                >
                                                    Create the first post
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {activeTab === 'media' && (
                                <div className="media-grid">
                                    {(posts || []).filter(
                                        (p) => p.media_urls && p.media_urls.length > 0,
                                    ).length > 0 ? (
                                        posts
                                            .filter((p) => p.media_urls && p.media_urls.length > 0)
                                            .map((post) => <PostCard key={post.id} post={post} />)
                                    ) : (
                                        <div className="empty-feed">
                                            <ImageIcon size={48} />
                                            <p>No media posts found.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'about' && (
                                <div className="card about-section-mobile">
                                    <h3>About {page.name}</h3>
                                    <p className="description-text">{page.description}</p>
                                    <div className="about-details">
                                        <div className="detail-item">
                                            <Users size={18} />
                                            <span>
                                                <strong>{page.follower_count || 0}</strong> Followers
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <Calendar size={18} />
                                            <span>
                                                Created{' '}
                                                {new Date(page.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <Star size={18} />
                                            <span>Category: {page.category}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab !== 'about' && hasNextPage && (
                                <button
                                    className="btn btn-outline w-full mb-8"
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                >
                                    {isFetchingNextPage ? 'Loading...' : 'Load More'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="sidebar-column">
                        <div className="card about-card">
                            <h3>About {page.name}</h3>
                            <p>{page.description}</p>
                            <div className="about-stats">
                                <div className="stat">
                                    <strong>{page.post_count}</strong>
                                    <span>Posts</span>
                                </div>
                                <div className="stat">
                                    <strong>{page.follower_count}</strong>
                                    <span>Followers</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isPostModalOpen && (
                <CreatePostModal
                    isOpen={isPostModalOpen}
                    onClose={() => setIsPostModalOpen(false)}
                    pageId={page.id}
                    pageName={page.name}
                />
            )}
        </div>
    );
};

export default PageDetailPage;
