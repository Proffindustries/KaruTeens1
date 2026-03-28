import React, { useState, useRef, useEffect } from 'react';
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    PhoneOff,
    Eye,
    Users,
    MessageCircle,
    Share2,
    Settings,
    Maximize2,
    Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import '../styles/LiveStreamPage.css';

const LiveStreamPage = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [isLive, setIsLive] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [viewers, setViewers] = useState(0);
    const [streamKey, setStreamKey] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [activeStreams, setActiveStreams] = useState([
        {
            id: 1,
            title: 'CS101: Data Structures Tutorial',
            streamer: 'prof_chen',
            viewers: 234,
            thumbnail: null,
        },
        {
            id: 2,
            title: 'Exam Prep: Organic Chemistry',
            streamer: 'study_buddy',
            viewers: 156,
            thumbnail: null,
        },
        {
            id: 3,
            title: 'Late Night Study Session',
            streamer: 'night_owl',
            viewers: 89,
            thumbnail: null,
        },
    ]);
    const [chatMessages, setChatMessages] = useState([
        { user: 'alice', message: 'Great explanation! 🎉' },
        { user: 'bob', message: 'Can you go over the linked list part again?' },
        { user: 'carol', message: 'This is so helpful thank you!' },
    ]);
    const [newMessage, setNewMessage] = useState('');

    const videoRef = useRef(null);
    const mediaStreamRef = useRef(null);

    useEffect(() => {
        return () => {
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    const startPreview = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            mediaStreamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsPreviewing(true);
        } catch (err) {
            showToast('Could not access camera/microphone', 'error');
        }
    };

    const stopPreview = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }
        setIsPreviewing(false);
    };

    const goLive = () => {
        if (!streamKey) {
            showToast('Please enter a stream key in settings', 'error');
            return;
        }
        setIsLive(true);
        setViewers(1);
        showToast('You are now live! 🎉', 'success');

        // Simulate viewer growth
        const interval = setInterval(() => {
            setViewers((v) => Math.min(v + Math.floor(Math.random() * 5), 9999));
        }, 3000);

        return () => clearInterval(interval);
    };

    const endStream = () => {
        stopPreview();
        setIsLive(false);
        setViewers(0);
        showToast('Stream ended', 'info');
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        setChatMessages([...chatMessages, { user: user?.username || 'you', message: newMessage }]);
        setNewMessage('');
    };

    const copyStreamLink = () => {
        navigator.clipboard.writeText(`https://karuteens.com/live/${user?.username}`);
        showToast('Stream link copied!', 'success');
    };

    return (
        <div className="live-stream-page">
            <div className="live-header">
                <h1>📹 Live Streams</h1>
                <p>Watch live study sessions or go live yourself</p>
            </div>

            {!isLive && !isPreviewing && (
                <>
                    <div className="start-stream-section">
                        <h2>Go Live</h2>
                        <div className="start-stream-card" onClick={startPreview}>
                            <Video size={48} />
                            <h3>Start Streaming</h3>
                            <p>Share your screen or camera with other students</p>
                        </div>
                        <button className="btn btn-outline" onClick={() => setShowSettings(true)}>
                            <Settings size={18} /> Stream Settings
                        </button>
                    </div>

                    <div className="active-streams-section">
                        <h2>Live Now ({activeStreams.length})</h2>
                        <div className="streams-grid">
                            {activeStreams.map((stream) => (
                                <motion.div
                                    key={stream.id}
                                    className="stream-card"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    <div className="stream-thumbnail">
                                        <div className="live-badge">LIVE</div>
                                        <Video size={32} />
                                        <div className="viewer-count">
                                            <Eye size={14} /> {stream.viewers}
                                        </div>
                                    </div>
                                    <div className="stream-info">
                                        <h4>{stream.title}</h4>
                                        <p>@{stream.streamer}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {(isPreviewing || isLive) && (
                <div className="stream-broadcast">
                    <div className="video-container">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="broadcast-video"
                        />
                        {isLive && (
                            <div className="live-indicator">
                                <span className="live-dot"></span> LIVE
                            </div>
                        )}
                        {isLive && (
                            <div className="viewer-badge">
                                <Eye size={16} /> {viewers} watching
                            </div>
                        )}
                    </div>

                    <div className="stream-controls">
                        {!isLive ? (
                            <>
                                <button className="control-btn" onClick={stopPreview}>
                                    <VideoOff size={20} /> Cancel
                                </button>
                                <button className="control-btn primary" onClick={goLive}>
                                    <Video size={20} /> Go Live
                                </button>
                            </>
                        ) : (
                            <>
                                <button className="control-btn danger" onClick={endStream}>
                                    <PhoneOff size={20} /> End Stream
                                </button>
                                <button className="control-btn" onClick={copyStreamLink}>
                                    <Share2 size={20} /> Share
                                </button>
                            </>
                        )}
                    </div>

                    {isLive && (
                        <div className="live-chat">
                            <div className="chat-header">
                                <h4>Live Chat</h4>
                                <Users size={16} />
                            </div>
                            <div className="chat-messages">
                                {chatMessages.map((msg, idx) => (
                                    <div key={idx} className="chat-message">
                                        <span className="chat-user">{msg.user}:</span>
                                        <span className="chat-text">{msg.message}</span>
                                    </div>
                                ))}
                            </div>
                            <form className="chat-input" onSubmit={sendMessage}>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Send a message..."
                                />
                            </form>
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowSettings(false)}
                    >
                        <motion.div
                            className="modal-content"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h3>Stream Settings</h3>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Stream Key</label>
                                    <input
                                        type="password"
                                        value={streamKey}
                                        onChange={(e) => setStreamKey(e.target.value)}
                                        placeholder="Enter your stream key"
                                    />
                                    <p className="form-hint">
                                        Get your stream key from your streaming software (OBS,
                                        StreamYard, etc.)
                                    </p>
                                </div>
                                <div className="form-group">
                                    <label>Stream URL</label>
                                    <input
                                        type="text"
                                        value="rtmp://live.karuteens.com/live"
                                        readOnly
                                        className="copy-input"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowSettings(false)}
                                >
                                    Save
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LiveStreamPage;
