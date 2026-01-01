import React from 'react';
import '../styles/Skeleton.css';

const Skeleton = ({ className, width, height, circle }) => {
    const style = {
        width: width || '100%',
        height: height || '1rem',
    };

    return (
        <div
            className={`skeleton ${circle ? 'skeleton-circle' : ''} ${className || ''}`}
            style={style}
        />
    );
};

export const PostSkeleton = () => (
    <div className="post-card skeleton-card">
        <div className="post-header" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem' }}>
            <Skeleton circle width="42px" height="42px" />
            <div style={{ flex: 1 }}>
                <Skeleton width="40%" height="0.8rem" className="skeleton-text" />
                <Skeleton width="20%" height="0.6rem" />
            </div>
        </div>
        <div className="post-content" style={{ padding: '0 1.5rem 1rem' }}>
            <Skeleton width="90%" height="0.9rem" className="skeleton-text" />
            <Skeleton width="95%" height="0.9rem" className="skeleton-text" />
            <Skeleton width="40%" height="0.9rem" />
            <div style={{ marginTop: '1rem', height: '200px' }} className="skeleton" />
        </div>
    </div>
);

export default Skeleton;
