import React from 'react';
import { Play, Pause, Square, X, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '../context/AudioContext';
import '../styles/GlobalAudioPlayer.css';

const GlobalAudioPlayer = React.memo(() => {
    const {
        currentAudio,
        isPlaying,
        progress,
        currentTime,
        duration,
        resumeAudio,
        pauseAudio,
        stopAudio,
        closeAudio,
    } = useAudio();

    if (!currentAudio) return null;

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="global-audio-player"
            >
                <div className="gap-content">
                    <div className="gap-info">
                        <div className="gap-icon">
                            <Music size={14} />
                        </div>
                        <div className="gap-details">
                            <span className="gap-filename">
                                {currentAudio.filename || 'Audio File'}
                            </span>
                            <span className="gap-time">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>
                    </div>

                    <div className="gap-controls">
                        <button
                            className="gap-btn"
                            onClick={isPlaying ? pauseAudio : resumeAudio}
                            title={isPlaying ? 'Pause' : 'Play'}
                        >
                            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button className="gap-btn" onClick={stopAudio} title="Stop">
                            <Square size={16} />
                        </button>
                        <button className="gap-btn close" onClick={closeAudio} title="Close">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="gap-progress-container">
                    <div className="gap-progress-fill" style={{ width: `${progress}%` }} />
                </div>
            </motion.div>
        </AnimatePresence>
    );
});

export default GlobalAudioPlayer;
