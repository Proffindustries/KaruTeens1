import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import '../styles/CustomVideoPlayer.css';

const CustomVideoPlayer = ({ src }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const videoRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

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
    }, []);

    // Auto-pause when scrolled out of view
    useEffect(() => {
        const video = videoRef.current;
        const container = containerRef.current;
        if (!video || !container) return;

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
            }
        );

        observer.observe(container);

        return () => {
            observer.disconnect();
        };
    }, []);

    const togglePlayPause = () => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.pause();
        } else {
            video.play().catch(err => {
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
        <div className="custom-video-player" ref={containerRef}>
            <video
                ref={videoRef}
                src={src}
                className="video-element"
                onClick={togglePlayPause}
            />

            {!isPlaying && (
                <div className="play-overlay" onClick={togglePlayPause}>
                    <div className="play-button">
                        <Play size={48} fill="white" />
                    </div>
                </div>
            )}

            <div className="video-controls">
                <div className="progress-bar" onClick={handleProgressClick}>
                    <div className="progress-filled" style={{ width: `${progress}%` }} />
                </div>
                <div className="time-display">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>
            </div>
        </div>
    );
};

export default CustomVideoPlayer;
