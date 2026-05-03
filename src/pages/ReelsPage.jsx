import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Music, User, ArrowLeft, Loader, Shield } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import '../styles/ReelsPage.css';
import { shouldBlur } from '../utils/contentFilters';
import { getVariantUrl } from '../utils/mediaUtils';

const ReelsPage = () => {
    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const containerRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();

    useEffect(() => {
        const fetchReels = async () => {
            try {
                setLoading(true);
                const { data } = await api.get('/reels');
                setReels(data);
            } catch (error) {
                showToast('Failed to fetch reels', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchReels();
    }, [showToast]);

    const handleScroll = useCallback(() => {
        const container = containerRef.current;
        if (container) {
            const index = Math.round(container.scrollTop / container.clientHeight);
            setCurrentIndex(index);
        }
    }, []);

    const handleBack = () => {
        if (location.key !== 'default') {
            navigate(-1);
        } else {
            navigate('/feed');
        }
    };

    return (
        <div className="reels-page">
            <div className="reels-header">
                <button className="back-btn" onClick={handleBack}>
                    <ArrowLeft size={24} />
                </button>
                <h2>Reels</h2>
            </div>

            <div className="reels-container" ref={containerRef} onScroll={handleScroll}>
                {loading ? (
                    <div className="loading-reels">
                        <Loader className="animate-spin" size={48} />
                        <p>Loading reels...</p>
                    </div>
                ) : reels.length > 0 ? (
                    reels.map((reel, index) => (
                        <ReelItem key={reel.id} reel={reel} isActive={index === currentIndex} />
                    ))
                ) : (
                    <div className="empty-reels">
                        <p>No reels found. Be the first to upload!</p>
                        <button className="btn btn-primary" onClick={() => navigate('/feed')}>
                            Go to Feed
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const ReelItem = ({ reel, isActive }) => {
    const videoRef = useRef(null);
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(reel.like_count || 0);
    const [isNsfwRevealed, setIsNsfwRevealed] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (isActive) {
            videoRef.current?.play().catch(() => {});
        } else {
            videoRef.current?.pause();
            if (videoRef.current) videoRef.current.currentTime = 0;
            // Reset NSFW reveal when navigating away if desired, or keep it.
            // setIsNsfwRevealed(false);
        }
    }, [isActive]);

    const handleLike = async () => {
        try {
            await api.post(`/reels/${reel.id}/like`);
            setLiked(!liked);
            setLikesCount((prev) => (liked ? prev - 1 : prev + 1));
        } catch (error) {
            showToast('Failed to like reel', 'error');
        }
    };

    return (
        <div className="reel-item">
            <div
                className={`reel-video-wrapper ${shouldBlur(reel) && !isNsfwRevealed ? 'nsfw-blurred' : ''}`}
            >
                <video
                    ref={videoRef}
                    src={getVariantUrl(reel.video_url)}
                    className="reel-video"
                    loop
                    playsInline
                    onClick={() => {
                        if (videoRef.current.paused) videoRef.current.play();
                        else videoRef.current.pause();
                    }}
                />

                {shouldBlur(reel) && !isNsfwRevealed && (
                    <div className="nsfw-overlay" onClick={() => setIsNsfwRevealed(true)}>
                        <Shield size={32} />
                        <p>Sensitive Content</p>
                        <button className="reveal-btn">Tap to View</button>
                    </div>
                )}
            </div>

            <div className="reel-overlay">
                <div className="reel-info">
                    <div className="reel-user">
                        <div className="user-avatar-small">
                            {reel.user_avatar ? (
                                <img src={reel.user_avatar} alt={reel.username} loading="lazy" />
                            ) : (
                                <User size={20} />
                            )}
                        </div>
                        <h3>@{reel.username}</h3>
                        <button className="follow-btn-small">Follow</button>
                    </div>
                    <p className="reel-description">{reel.description}</p>
                    <div className="reel-music">
                        <Music size={14} />
                        <span>Original Audio - {reel.username}</span>
                    </div>
                </div>

                <div className="reel-actions">
                    <button className={`action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
                        <Heart size={28} fill={liked ? '#ff4757' : 'none'} />
                        <span>{likesCount}</span>
                    </button>
                    <button className="action-btn">
                        <MessageCircle size={28} />
                        <span>{reel.comment_count || 0}</span>
                    </button>
                    <button className="action-btn">
                        <Share2 size={28} />
                        <span>Share</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReelsPage;
