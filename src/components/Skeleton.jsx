import React from 'react';
import '../styles/Skeleton.css';

const Skeleton = React.memo(({ className, width, height, circle }) => {
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
});

export const PostSkeleton = React.memo(() => (
    <div className="post-card skeleton-card card">
        <div className="post-header" style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
            <Skeleton circle width="42px" height="42px" />
            <div style={{ flex: 1 }}>
                <Skeleton width="40%" height="0.8rem" className="skeleton-text" />
                <Skeleton width="20%" height="0.6rem" />
            </div>
        </div>
        <div className="post-content" style={{ padding: '0 1rem 1rem' }}>
            <Skeleton width="90%" height="0.9rem" className="skeleton-text" />
            <Skeleton width="95%" height="0.9rem" className="skeleton-text" />
            <Skeleton width="40%" height="0.9rem" />
            <div
                style={{ marginTop: '1rem', height: '200px', borderRadius: '8px' }}
                className="skeleton"
            />
        </div>
    </div>
));

export const ProfileSkeleton = React.memo(() => (
    <div className="profile-page-skeleton">
        <div className="profile-header-card skeleton-card card" style={{ height: '400px' }}>
            <div className="profile-cover skeleton" style={{ height: '180px' }}></div>
            <div style={{ padding: '0 2rem', marginTop: '-50px' }}>
                <Skeleton circle width="120px" height="120px" className="profile-avatar-lg" />
                <div style={{ marginTop: '1rem' }}>
                    <Skeleton width="250px" height="2rem" />
                    <Skeleton width="150px" height="1rem" style={{ marginTop: '0.5rem' }} />
                    <Skeleton width="80%" height="1rem" style={{ marginTop: '1rem' }} />
                </div>
            </div>
        </div>
        <div
            className="profile-content-grid"
            style={{
                marginTop: '2rem',
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                gap: '2rem',
            }}
        >
            <div className="card" style={{ padding: '1rem' }}>
                <Skeleton width="100px" height="1.5rem" style={{ marginBottom: '1rem' }} />
                <Skeleton width="100%" height="1rem" style={{ marginBottom: '0.5rem' }} />
                <Skeleton width="100%" height="1rem" style={{ marginBottom: '0.5rem' }} />
                <Skeleton width="100%" height="1rem" />
            </div>
            <div className="main-column">
                <PostSkeleton />
                <PostSkeleton />
            </div>
        </div>
    </div>
));

export const NotificationSkeleton = React.memo(() => (
    <div
        className="notification-skeleton card"
        style={{
            padding: '1rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            marginBottom: '1rem',
        }}
    >
        <Skeleton circle width="40px" height="40px" />
        <div style={{ flex: 1 }}>
            <Skeleton width="70%" height="0.9rem" />
            <Skeleton width="30%" height="0.6rem" style={{ marginTop: '0.4rem' }} />
        </div>
    </div>
));

export const LeaderboardSkeleton = React.memo(() => (
    <div className="leaderboard-skeleton card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '50px 50px 1fr 100px',
                gap: '1rem',
                alignItems: 'center',
            }}
        >
            <Skeleton width="20px" height="1rem" />
            <Skeleton circle width="40px" height="40px" />
            <Skeleton width="150px" height="1rem" />
            <Skeleton width="60px" height="1rem" />
        </div>
    </div>
));

export const MaterialSkeleton = React.memo(() => (
    <div
        className="material-card card skeleton-card"
        style={{ display: 'flex', gap: '1rem', padding: '1rem' }}
    >
        <Skeleton width="50px" height="50px" style={{ borderRadius: '12px' }} />
        <div style={{ flex: 1 }}>
            <Skeleton width="80px" height="0.6rem" style={{ marginBottom: '0.4rem' }} />
            <Skeleton width="60%" height="1rem" style={{ marginBottom: '0.6rem' }} />
            <Skeleton width="100%" height="0.8rem" />
        </div>
    </div>
));

export default Skeleton;
