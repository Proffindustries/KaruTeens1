import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import '../styles/CustomAudioPlayer.css';

const CustomAudioPlayer = ({ src, filename }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

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
    }, []);

    // Auto-pause when scrolled out of view
    useEffect(() => {
        const audio = audioRef.current;
        const container = containerRef.current;
        if (!audio || !container) return;

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
            }
        );

        observer.observe(container);

        return () => {
            observer.disconnect();
        };
    }, []);

    // Draw waveform visualization
    useEffect(() => {
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
    }, [progress]);

    // Initial waveform render on mount
    useEffect(() => {
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
    }, []);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(err => {
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
        <div className="custom-audio-player" ref={containerRef}>
            <audio ref={audioRef} src={src} />

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
        </div>
    );
};

export default CustomAudioPlayer;
