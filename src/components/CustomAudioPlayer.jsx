import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Music } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { useAudio } from '../context/AudioContext';
import '../styles/CustomAudioPlayer.css';

const CustomAudioPlayer = React.memo(({ src, filename, id }) => {
    const {
        playAudio,
        currentAudio,
        isPlaying: isGlobalPlaying,
        progress: globalProgress,
        currentTime: globalCurrentTime,
        duration: globalDuration,
        seekAudio,
    } = useAudio();

    const isThisAudioCurrent = currentAudio?.id === (id || src);
    const isPlaying = isThisAudioCurrent && isGlobalPlaying;

    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const { ref, inView } = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    const setRefs = React.useCallback(
        (node) => {
            containerRef.current = node;
            ref(node);
        },
        [ref],
    );

    useEffect(() => {
        if (isThisAudioCurrent) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setProgress(globalProgress);
            setCurrentTime(globalCurrentTime);
            setDuration(globalDuration);
        }
    }, [isThisAudioCurrent, globalProgress, globalCurrentTime, globalDuration]);

    useEffect(() => {
        let mounted = true;
        const audio = audioRef.current;
        if (!audio || !inView || isThisAudioCurrent) return;

        const updateProgress = () => {
            if (mounted) {
                const p = (audio.currentTime / audio.duration) * 100;
                setProgress(p || 0);
                setCurrentTime(audio.currentTime);
            }
        };

        const handleLoadedMetadata = () => {
            if (mounted) {
                setDuration(audio.duration);
            }
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
            mounted = false;
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [inView, isThisAudioCurrent]);

    // Draw waveform visualization
    useEffect(() => {
        if (!inView) return;
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

            if (i / bars <= progress / 100) {
                ctx.fillStyle = 'rgba(24, 119, 242, 0.9)';
            } else {
                ctx.fillStyle = 'rgba(24, 119, 242, 0.15)';
            }

            ctx.fillRect(x, y, barWidth, barHeight);
        }
    }, [progress, inView]);

    const togglePlayPause = (e) => {
        e.stopPropagation();
        playAudio({ src, filename, id: id || src });
    };

    const handleProgressClick = (e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;

        if (isThisAudioCurrent) {
            seekAudio(pos * globalDuration);
        } else if (audioRef.current && audioRef.current.duration) {
            audioRef.current.currentTime = pos * audioRef.current.duration;
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="custom-audio-player" ref={setRefs} onClick={(e) => e.stopPropagation()}>
            {inView ? (
                <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" />
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
