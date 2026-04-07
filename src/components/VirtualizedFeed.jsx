import React from 'react';
import PostCard from './PostCard.jsx';
import PostSkeleton from './Skeleton.jsx';

const VirtualizedFeed = ({ posts = [], isLoading, error, height = 600 }) => {
    if (isLoading && posts.length === 0) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: height,
                }}
            >
                {[1, 2, 3].map((i) => (
                    <PostSkeleton key={`initial-skeleton-${i}`} />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: height,
                    textAlign: 'center',
                    padding: '2rem',
                }}
            >
                <p>Failed to load the feed. Please try again later.</p>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: height,
                    textAlign: 'center',
                    padding: '4rem 2rem',
                }}
            >
                {/* Star icon would go here */}
                <div style={{ fontSize: '48px', marginBottom: '1rem', opacity: '0.3' }}>⭐</div>
                <h3>No posts yet!</h3>
                <p style={{ color: 'rgb(var(--text-muted))' }}>
                    Be the first student to share something on Karu Teens.
                </p>
            </div>
        );
    }

    return (
        <div style={{ height: height, overflowY: 'auto', padding: '1rem' }}>
            {posts.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}
        </div>
    );
};

export default VirtualizedFeed;
