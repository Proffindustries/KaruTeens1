import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useStories, useMarkStoryViewed } from '../hooks/useStories';
import { useAuth } from '../hooks/useAuth';
import { Plus, Search, X, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import '../styles/StatusPage.css';
import CreateStoryModal from '../components/CreateStoryModal';
import Avatar from '../components/Avatar';
import { shouldBlur } from '../utils/contentFilters.js';
import { getVariantUrl } from '../utils/mediaUtils.js';

const StatusPage = () => {
    const { data: usersWithStories, isLoading } = useStories();
    const { user: currentUser } = useAuth();
    const { mutate: markViewed } = useMarkStoryViewed();

    const [viewingUserIndex, setViewingUserIndex] = useState(null);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [revealedNsfwStories, setRevealedNsfwStories] = useState(new Set());

    const myStoriesData = usersWithStories?.find(
        (u) => u.user_id === currentUser?.id || u.user_id === currentUser?.user_id,
    );
    const otherUsersStories =
        usersWithStories?.filter(
            (u) => u.user_id !== currentUser?.id && u.user_id !== currentUser?.user_id,
        ) || [];

    const closeViewer = useCallback(() => {
        setViewingUserIndex(null);
        setCurrentStoryIndex(0);
        setProgress(0);
    }, []);

    const openViewer = (userId) => {
        const index = usersWithStories.findIndex((u) => u.user_id === userId);
        if (index !== -1) {
            setViewingUserIndex(index);
            const firstUnviewed = usersWithStories[index].stories.findIndex((s) => !s.is_viewed);
            setCurrentStoryIndex(firstUnviewed !== -1 ? firstUnviewed : 0);
        }
    };

    const handlePrevStory = () => {
        if (viewingUserIndex === null) return;

        if (currentStoryIndex > 0) {
            setCurrentStoryIndex((prev) => prev - 1);
            setProgress(0);
        } else {
            if (viewingUserIndex > 0) {
                setViewingUserIndex((prev) => prev - 1);
                setCurrentStoryIndex(0);
                setProgress(0);
            }
        }
    };

    const handleNextStory = useCallback(() => {
        if (viewingUserIndex === null) return;
        const userStories = usersWithStories[viewingUserIndex].stories;

        if (currentStoryIndex < userStories.length - 1) {
            setCurrentStoryIndex((prev) => prev + 1);
            setProgress(0);
        } else {
            if (viewingUserIndex < usersWithStories.length - 1) {
                setViewingUserIndex((prev) => prev + 1);
                setCurrentStoryIndex(0);
                setProgress(0);
            } else {
                closeViewer();
            }
        }
    }, [viewingUserIndex, currentStoryIndex, usersWithStories, closeViewer]);

    // Effect to reset progress and mark story as viewed when current story changes
    useEffect(() => {
        if (viewingUserIndex !== null && usersWithStories && usersWithStories[viewingUserIndex]) {
            const userStories = usersWithStories[viewingUserIndex].stories;
            const currentStory = userStories[currentStoryIndex];

            if (currentStory && !currentStory.is_viewed) {
                markViewed(currentStory.id);
            }
        }
    }, [viewingUserIndex, currentStoryIndex, usersWithStories, markViewed]);

    const viewingUser = viewingUserIndex !== null ? usersWithStories[viewingUserIndex] : null;
    const activeStory = viewingUser ? viewingUser.stories[currentStoryIndex] : null;

    // Ref to always have access to latest handleNextStory without causing effect re-runs
    const handleNextStoryRef = useRef(handleNextStory);
    useEffect(() => {
        handleNextStoryRef.current = handleNextStory;
    }, [handleNextStory]);

    // Effect to manage the progress bar interval
    useEffect(() => {
        let interval;
        const isNsfwAndHidden = activeStory?.is_nsfw && !revealedNsfwStories.has(activeStory.id);

        if (viewingUserIndex !== null && !isPaused && !isNsfwAndHidden) {
            const duration = 5000;
            const step = 50;

            interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 100) {
                        handleNextStoryRef.current();
                        return 0;
                    }
                    return prev + (step / duration) * 100;
                });
            }, step);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [viewingUserIndex, currentStoryIndex, isPaused, activeStory, revealedNsfwStories]);

    if (isLoading) return <div className="p-4 text-center">Loading updates...</div>;

    return (
        <div className="status-page container mx-auto px-4 pb-20">
            <div className="status-header">
                <h1>Updates</h1>
                <div className="search-bar-sm">
                    <Search size={16} />
                    <input type="text" placeholder="Search..." />
                </div>
            </div>

            <div className="status-grid">
                {/* My Status */}
                <div
                    className="status-item"
                    onClick={() =>
                        myStoriesData
                            ? openViewer(myStoriesData.user_id)
                            : setIsCreateModalOpen(true)
                    }
                >
                    <div className={`status-ring ${!myStoriesData ? 'yours' : ''}`}>
                        <Avatar
                            src={currentUser?.avatar_url}
                            name={currentUser?.username || 'Me'}
                            className="w-full h-full rounded-full"
                        />
                        {!myStoriesData && (
                            <div className="add-status-btn">
                                <Plus size={14} />
                            </div>
                        )}
                    </div>
                    <span>My Status</span>
                </div>

                {/* Other Users */}
                {otherUsersStories.map((userData) => (
                    <div
                        key={userData.user_id}
                        className="status-item"
                        onClick={() => openViewer(userData.user_id)}
                    >
                        <div
                            className={`status-ring ${userData.has_unviewed ? 'has-new' : 'viewed'}`}
                        >
                            <Avatar
                                src={userData.avatar_url}
                                name={userData.username}
                                className="w-full h-full rounded-full"
                            />
                        </div>
                        <span>{userData.username}</span>
                    </div>
                ))}
            </div>

            {/* Viewer Overlay */}
            {viewingUser && activeStory && (
                <div className="status-viewer-overlay">
                    <button className="viewer-close" onClick={closeViewer}>
                        <X size={24} />
                    </button>

                    <button className="nav-btn prev" onClick={handlePrevStory}>
                        <ChevronLeft size={24} />
                    </button>

                    <div
                        className="viewer-content"
                        onMouseDown={() => setIsPaused(true)}
                        onMouseUp={() => setIsPaused(false)}
                        onTouchStart={() => setIsPaused(true)}
                        onTouchEnd={() => setIsPaused(false)}
                    >
                        {/* Progress Bars */}
                        <div className="viewer-progress-container">
                            {viewingUser.stories.map((story, idx) => (
                                <div
                                    key={story.id}
                                    className="viewer-progress-bar-bg"
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.3)',
                                        height: '2px',
                                        borderRadius: '2px',
                                    }}
                                >
                                    <div
                                        className="viewer-progress-bar"
                                        style={{
                                            width:
                                                idx < currentStoryIndex
                                                    ? '100%'
                                                    : idx === currentStoryIndex
                                                      ? `${progress}%`
                                                      : '0%',
                                            height: '100%',
                                            background: 'white',
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Header */}
                        <div className="viewer-header">
                            <Avatar
                                src={viewingUser.avatar_url}
                                name={viewingUser.username}
                                size="sm"
                                className="mr-2"
                            />
                            <div className="flex flex-col">
                                <span>{viewingUser.username}</span>
                                <span className="viewer-time">
                                    {new Date(activeStory.created_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div
                            className={`viewer-media-wrapper ${shouldBlur(activeStory) && !revealedNsfwStories.has(activeStory.id) ? 'nsfw-story-blurred' : ''}`}
                        >
                            {activeStory.media_type === 'video' ? (
                                <video
                                    src={getVariantUrl(activeStory.media_url)}
                                    className="viewer-image"
                                    style={{ objectFit: 'contain' }}
                                    autoPlay
                                    playsInline
                                    loop={false}
                                />
                            ) : (
                                <img
                                    src={activeStory.media_url}
                                    alt="Story"
                                    className="viewer-image"
                                    style={{ objectFit: 'contain' }}
                                />
                            )}

                            {shouldBlur(activeStory) &&
                                !revealedNsfwStories.has(activeStory.id) && (
                                    <div
                                        className="nsfw-story-overlay"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setRevealedNsfwStories((prev) =>
                                                new Set(prev).add(activeStory.id),
                                            );
                                        }}
                                    >
                                        <Shield size={48} color="white" />
                                        <p>Sensitive Content</p>
                                        <button className="reveal-btn-story">Tap to Reveal</button>
                                    </div>
                                )}
                        </div>

                        {/* Footer / Reply */}
                        <div className="viewer-footer" onMouseDown={(e) => e.stopPropagation()}>
                            <div className="pipe-input-container">
                                <input
                                    type="text"
                                    placeholder="Reply..."
                                    onFocus={() => setIsPaused(true)}
                                    onBlur={() => setIsPaused(false)}
                                />
                                <button>Send</button>
                            </div>
                        </div>
                    </div>

                    <button className="nav-btn next" onClick={handleNextStory}>
                        <ChevronRight size={24} />
                    </button>
                </div>
            )}

            <CreateStoryModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
};

export default StatusPage;
