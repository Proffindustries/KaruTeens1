import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { usePost } from '../hooks/useContent.js';
import PostCard from '../components/PostCard.jsx';
import '../styles/PostDetailPage.css';

const PostDetailPage = () => {
    const { postId } = useParams();
    const navigate = useNavigate();
    const { data: post, isLoading, error } = usePost(postId);

    if (isLoading) {
        return (
            <div className="container post-detail-page-loading">
                <Loader2 className="animate-spin" size={40} />
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="container post-detail-page-error">
                <h2>Post not found</h2>
                <p>The post may have been deleted or the link is incorrect.</p>
                <Link to="/feed" className="btn btn-primary">Back to Feed</Link>
            </div>
        );
    }

    return (
        <div className="container post-detail-page">
            <div className="post-detail-header">
                <button onClick={() => navigate(-1)} className="back-link-btn">
                    <ArrowLeft size={24} /> Back
                </button>
                <h1>Post</h1>
            </div>

            <div className="post-detail-content">
                <PostCard post={post} />
            </div>
        </div>
    );
};

export default PostDetailPage;
