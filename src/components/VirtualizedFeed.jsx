import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import PostCard from './PostCard.jsx';
import PostSkeleton from './Skeleton.jsx';

const ROW_HEIGHT = 600;
const OVERSCAN_COUNT = 3;

const Row = React.memo(({ data, index, style }) => {
    const post = data[index];
    if (!post) return null;
    return (
        <div style={style}>
            <PostCard post={post} />
        </div>
    );
});

const VirtualizedFeed = ({ posts = [], isLoading, error, height = 600 }) => {
    const itemCount = posts.length;

    if (isLoading && itemCount === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height }}>
                {[1, 2, 3].map((i) => (
                    <PostSkeleton key={`skeleton-${i}`} />
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
                    height,
                    padding: '2rem',
                    textAlign: 'center',
                }}
            >
                <p>Failed to load the feed. Please try again later.</p>
            </div>
        );
    }

    if (itemCount === 0) {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height,
                    padding: '4rem 2rem',
                    textAlign: 'center',
                }}
            >
                <div style={{ fontSize: '48px', marginBottom: '1rem', opacity: 0.3 }}>⭐</div>
                <h3>No posts yet!</h3>
                <p style={{ color: 'rgb(var(--text-muted))' }}>
                    Be the first student to share something on Karu Teens.
                </p>
            </div>
        );
    }

    return (
        <List
            height={height}
            itemCount={itemCount}
            itemSize={ROW_HEIGHT}
            itemData={posts}
            overscanCount={OVERSCAN_COUNT}
            width="100%"
        >
            {Row}
        </List>
    );
};

export default VirtualizedFeed;
