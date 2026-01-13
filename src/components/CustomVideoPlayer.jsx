import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { useInView } from 'react-intersection-observer'; // Import useInView
import '../styles/CustomVideoPlayer.css';

const CustomVideoPlayer = ({ src, poster = '/placeholder-video.jpg' }) => {
    // Add poster prop with a default placeholder
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const videoRef = useRef(null);
    const containerRef = useRef(null);

    const { ref, inView } = useInView({
        // Use useInView hook
        triggerOnce: true, // Load video only once when it enters view
        threshold: 0.1, // Trigger when 10% of the video is visible
    });

    // Combine refs for the container and inView observer
    const setRefs = React.useCallback(
        (node) => {
            containerRef.current = node;
            ref(node);
        },
        [ref],
    );

    useEffect(() => {
        const video = videoRef.current;
        // Only attach event listeners if the video is loaded (inView)
        if (!video || !inView) return;

        const updateProgress = () => {
            const progress = (video.currentTime / video.duration) * 100;
            setProgress(progress || 0);
            setCurrentTime(video.currentTime);
        };

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        video.addEventListener('timeupdate', updateProgress);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', updateProgress);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('ended', handleEnded);
        };
    }, [inView]); // Re-run effect when inView changes to attach/detach listeners

    // Auto-pause when scrolled out of view (existing functionality, but now depends on inView for setup)
    useEffect(() => {
        const video = videoRef.current;
        const container = containerRef.current;
        if (!video || !container || !inView) return; // Only if in view

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    // If video is playing and scrolled out of view, pause it
                    if (!entry.isIntersecting && !video.paused) {
                        video.pause();
                        setIsPlaying(false);
                    }
                });
            },
            {
                threshold: 0.5, // Trigger when 50% of video is out of view
            },
        );

        observer.observe(container);

        return () => {
            observer.disconnect();
        };
    }, [inView]); // Re-run when inView changes

    const togglePlayPause = () => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.pause();
        } else {
            video.play().catch((err) => {
                console.error('Video play failed:', err);
            });
        }
        setIsPlaying(!isPlaying);
    };

    const handleProgressClick = (e) => {
        const video = videoRef.current;
        if (!video || !video.duration || isNaN(video.duration)) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.currentTime = pos * video.duration;
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="custom-video-player" ref={setRefs}>
            {inView ? ( // Conditionally render video element when in view
                <video
                    ref={videoRef}
                    src={src}
                    poster={poster} // Add poster attribute
                    preload="none" // Prevent automatic preloading
                    className="video-element"
                    onClick={togglePlayPause}
                />
            ) : (
                // Placeholder when not in view, showing the poster image
                <div
                    className="video-placeholder"
                    style={{ backgroundImage: `url(${poster})` }}
                    onClick={togglePlayPause}
                >
                    <div className="play-overlay">
                        <div className="play-button">
                            <Play size={48} fill="white" />
                        </div>
                    </div>
                </div>
            )}

            {!isPlaying &&
                (inView || !src) && ( // Show play overlay only if video is loaded or if it's just a placeholder with no src
                    <div className="play-overlay" onClick={togglePlayPause}>
                        <div className="play-button">
                            <Play size={48} fill="white" />
                        </div>
                    </div>
                )}

            {inView && ( // Only show controls if video is loaded
                <div className="video-controls">
                    <div className="progress-bar" onClick={handleProgressClick}>
                        <div className="progress-filled" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="time-display">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomVideoPlayer;
