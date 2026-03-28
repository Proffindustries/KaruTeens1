import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Music } from 'lucide-react'; // Add Music icon for placeholder
import { useInView } from 'react-intersection-observer'; // Import useInView
import '../styles/CustomAudioPlayer.css';

const CustomAudioPlayer = React.memo(({ src, filename }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const { ref, inView } = useInView({
        // Use useInView hook
        triggerOnce: true, // Load audio only once when it enters view
        threshold: 0.1, // Trigger when 10% of the audio player is visible
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
        const audio = audioRef.current;
        // Only attach event listeners if the audio is loaded (inView)
        if (!audio || !inView) return;

        const updateProgress = () => {
            const progress = (audio.currentTime / audio.duration) * 100;
            setProgress(progress || 0);
            setCurrentTime(audio.currentTime);
        };

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [inView]); // Re-run effect when inView changes to attach/detach listeners

    // Auto-pause when scrolled out of view
    useEffect(() => {
        const audio = audioRef.current;
        const container = containerRef.current;
        if (!audio || !container || !inView) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    // If audio is playing and scrolled out of view, pause it
                    if (!entry.isIntersecting && !audio.paused) {
                        audio.pause();
                        setIsPlaying(false);
                    }
                });
            },
            {
                threshold: 0.5, // Trigger when 50% of audio player is out of view
            },
        );

        observer.observe(container);

        return () => {
            observer.disconnect();
        };
    }, [inView]);

    // Draw waveform visualization (only if inView)
    useEffect(() => {
        if (!inView) return; // Only draw if component is in view
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw thin vertical bars
        const bars = 100;
        const barWidth = 2; // Very thin bars
        const spacing = width / bars;

        for (let i = 0; i < bars; i++) {
            const barHeight = Math.random() * height * 0.6 + height * 0.2;
            const x = i * spacing + (spacing - barWidth) / 2;
            const y = (height - barHeight) / 2;

            // Color based on progress
            if (i / bars <= progress / 100) {
                ctx.fillStyle = 'rgba(24, 119, 242, 0.9)';
            } else {
                ctx.fillStyle = 'rgba(24, 119, 242, 0.15)';
            }

            ctx.fillRect(x, y, barWidth, barHeight);
        }
    }, [progress, inView]); // Re-run when inView changes

    // Initial waveform render on mount (only if inView)
    useEffect(() => {
        if (!inView) return; // Only draw if component is in view
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const bars = 100;
        const barWidth = 2;
        const spacing = width / bars;

        for (let i = 0; i < bars; i++) {
            const barHeight = Math.random() * height * 0.6 + height * 0.2;
            const x = i * spacing + (spacing - barWidth) / 2;
            const y = (height - barHeight) / 2;
            ctx.fillStyle = 'rgba(24, 119, 242, 0.15)';
            ctx.fillRect(x, y, barWidth, barHeight);
        }
    }, [inView]); // Re-run when inView changes

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch((err) => {
                console.error('Audio play failed:', err);
            });
        }
        setIsPlaying(!isPlaying);
    };

    const handleProgressClick = (e) => {
        const audio = audioRef.current;
        if (!audio || !audio.duration || isNaN(audio.duration)) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audio.currentTime = pos * audio.duration;
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="custom-audio-player" ref={setRefs}>
            {inView ? (
                <audio ref={audioRef} src={src} preload="none" />
            ) : (
                <div className="audio-placeholder">
                    <Music size={48} color="#00b894" />
                    <span className="audio-filename">{filename || 'Audio File'}</span>
                </div>
            )}

            {inView && (
                <>
                    <div className="audio-info">
                        <span className="audio-filename">{filename || 'Audio File'}</span>
                        <span className="audio-time">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="audio-controls-row">
                        <button className="play-pause-btn" onClick={togglePlayPause}>
                            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                        </button>

                        <div className="waveform-container" onClick={handleProgressClick}>
                            <canvas
                                ref={canvasRef}
                                width={800}
                                height={80}
                                className="waveform-canvas"
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
});

export default CustomAudioPlayer;
