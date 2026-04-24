import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

const AudioContext = createContext();

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within AudioProvider');
    }
    return context;
};

export const AudioProvider = ({ children }) => {
    const [currentAudio, setCurrentAudio] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(new Audio());

    const playAudio = useCallback(
        (audioData) => {
            // audioData: { src, filename, id }
            if (currentAudio?.id === audioData.id) {
                if (audioRef.current.paused) {
                    audioRef.current.play();
                    setIsPlaying(true);
                } else {
                    audioRef.current.pause();
                    setIsPlaying(false);
                }
                return;
            }

            audioRef.current.src = audioData.src;
            audioRef.current.play();
            setCurrentAudio(audioData);
            setIsPlaying(true);
        },
        [currentAudio],
    );

    const pauseAudio = useCallback(() => {
        audioRef.current.pause();
        setIsPlaying(false);
    }, []);

    const resumeAudio = useCallback(() => {
        audioRef.current.play();
        setIsPlaying(true);
    }, []);

    const stopAudio = useCallback(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
    }, []);

    const closeAudio = useCallback(() => {
        stopAudio();
        setCurrentAudio(null);
    }, [stopAudio]);

    const seekAudio = useCallback((time) => {
        audioRef.current.currentTime = time;
    }, []);

    useEffect(() => {
        const audio = audioRef.current;

        const updateProgress = () => {
            setCurrentTime(audio.currentTime);
            setDuration(audio.duration || 0);
            setProgress((audio.currentTime / audio.duration) * 100 || 0);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', updateProgress);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('loadedmetadata', updateProgress);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    return (
        <AudioContext.Provider
            value={{
                currentAudio,
                isPlaying,
                progress,
                currentTime,
                duration,
                playAudio,
                pauseAudio,
                resumeAudio,
                stopAudio,
                closeAudio,
                seekAudio,
            }}
        >
            {children}
        </AudioContext.Provider>
    );
};
