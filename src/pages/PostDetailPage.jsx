import React from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePost } from '../hooks/useContent';
import PostCard from '../components/PostCard.jsx';
import AdComponent from '../components/AdComponent.jsx';
import SEO from '../components/SEO.jsx';
import { PostSkeleton } from '../components/Skeleton.jsx';
import '../styles/PostDetailPage.css';

const PostDetailPage = () => {
    const { postId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { data: post, isLoading, error } = usePost(postId);

    const handleBack = () => {
        if (location.key !== 'default') {
            navigate(-1);
        } else {
            navigate('/feed', { replace: true });
        }
    };

    if (isLoading) {
        return (
            <div className="container post-detail-page">
                <PostSkeleton />
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="container post-detail-page-error">
                <h2>Post not found</h2>
                <p>The post may have been deleted or the link is incorrect.</p>
                <Link to="/feed" className="btn btn-primary">
                    Back to Feed
                </Link>
            </div>
        );
    }

    const postUrl = window.location.href;
    const postImage =
        post.media_urls && post.media_urls.length > 0
            ? post.media_urls[0]
            : 'https://karuteens.site/logo512.png';

    return (
        <div className="container post-detail-page">
            <SEO
                title={post.user ? `Post by ${post.user}` : 'KaruTeens Post'}
                description={
                    post.content
                        ? post.content.substring(0, 150)
                        : 'Check out this update on KaruTeens.'
                }
                image={postImage}
                url={postUrl}
            />
            <div className="post-detail-header">
                <button onClick={handleBack} className="back-link">
                    <ArrowLeft size={24} /> Back
                </button>
                <h1>Post</h1>
            </div>

            <div className="post-detail-content">
                <PostCard post={post} />
                <div className="post-detail-ad" style={{ margin: '2rem 0' }}>
                    <AdComponent page="post-detail" />
                </div>
            </div>
        </div>
    );
};

export default PostDetailPage;
