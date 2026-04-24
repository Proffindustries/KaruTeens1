import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Settings } from 'lucide-react';
import { useInView } from 'react-intersection-observer'; // Import useInView
import { useAudio } from '../context/AudioContext';
import { useToast } from '../context/ToastContext';
import '../styles/CustomVideoPlayer.css';

const CustomVideoPlayer = React.memo(({ src, poster = '/placeholder-video.jpg' }) => {
    // Add poster prop with a default placeholder
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showCaptions, setShowCaptions] = useState(false);
    const [aspectRatioClass, setAspectRatioClass] = useState('');
    const { stopAudio } = useAudio();
    const { showToast } = useToast();
    const videoRef = useRef(null);
    const containerRef = useRef(null);

    // ... useEffects ...
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    const changeSpeed = () => {
        const rates = [0.5, 1, 1.5, 2];
        const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
        setPlaybackRate(rates[nextIdx]);
    };

    const toggleCaptions = () => setShowCaptions(!showCaptions);

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
            // Detect orientation
            if (video.videoHeight > video.videoWidth) {
                setAspectRatioClass('portrait');
            } else {
                setAspectRatioClass('landscape');
            }
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

    const togglePlayPause = (e) => {
        if (e) e.stopPropagation(); // Prevent bubbling to parent navigation handlers
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.pause();
        } else {
            stopAudio(); // Stop audio if we are starting a video
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
        <div className={`custom-video-player ${aspectRatioClass}`} ref={setRefs}>
            {/* Blurred background backdrop for premium look (like FB/TikTok) */}
            {poster && (
                <div 
                    className="video-blur-backdrop" 
                    style={{ backgroundImage: `url(${poster})` }}
                />
            )}

            {(!isPlaying || !inView) && poster && (
                <div 
                    className="video-poster-overlay" 
                    style={{ backgroundImage: `url(${poster})` }}
                    onClick={togglePlayPause}
                />
            )}

            {inView && (
                <video
                    ref={videoRef}
                    src={src}
                    preload="metadata"
                    className="video-element"
                    onClick={togglePlayPause}
                    playsInline
                    muted={!isPlaying}
                />
            )}

            {!isPlaying && (
                <div className="play-overlay" onClick={togglePlayPause}>
                    <div className="play-button">
                        <Play size={44} fill="currentColor" />
                    </div>
                </div>
            )}

            {inView && isPlaying && ( // Only show controls if video is playing/interacted with
                <div className="video-controls">
                    <div className="progress-bar" onClick={handleProgressClick}>
                        <div className="progress-filled" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="controls-row">
                        <div className="left-controls" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <button className="control-btn-icon" onClick={togglePlayPause}>
                                {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
                            </button>
                            <div className="time-display">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </div>
                        </div>
                        <div className="right-controls">
                            <button className="control-btn" onClick={changeSpeed}>
                                {playbackRate}x
                            </button>
                            <button
                                className={`control-btn ${showCaptions ? 'active' : ''}`}
                                onClick={toggleCaptions}
                                title="Auto-captions"
                            >
                                CC
                            </button>
                            <button className="control-btn-icon" onClick={() => showToast('Video quality: Auto (720p)', 'info')}>
                                <Settings size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showCaptions && isPlaying && (
                <div className="captions-overlay">
                    <p>[Auto-generated captions...]</p>
                </div>
            )}
        </div>
    );
});

export default CustomVideoPlayer;
