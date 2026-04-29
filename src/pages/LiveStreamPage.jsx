import React, { useState, useRef, useEffect, useCallback } from 'react';
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
    Heart,
    X,
    Send,
    MoreVertical,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { useAbly } from '../context/AblyContext';
import '../styles/LiveStreamPage.css';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

const LiveStreamPage = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { ably } = useAbly();
    
    const [isLive, setIsLive] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [currentStream, setCurrentStream] = useState(null);
    const [activeStreams, setActiveStreams] = useState([]);
    const [viewers, setViewers] = useState(0);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [hearts, setHearts] = useState([]);
    const [showSettings, setShowSettings] = useState(false);
    const [streamTitle, setStreamTitle] = useState(`${user?.username}'s Live`);
    const [gifts, setGifts] = useState([]);

    const videoRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const peerConnections = useRef({}); // For streamer: viewerId -> PC
    const viewerPc = useRef(null); // For viewer: single PC
    const chatEndRef = useRef(null);

    // Fetch active streams on mount
    useEffect(() => {
        const fetchStreams = async () => {
            try {
                const { data } = await api.get('/live/active');
                setActiveStreams(data);
            } catch (err) {
                console.error('Failed to fetch active streams', err);
            }
        };
        fetchStreams();
        const interval = setInterval(fetchStreams, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // --- Streamer Logic ---

    const startPreview = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: true,
            });
            mediaStreamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            setIsPreviewing(true);
        } catch (err) {
            showToast('Could not access camera', 'error');
        }
    };

    const goLive = async () => {
        try {
            const { data } = await api.post('/live/start', { title: streamTitle });
            setCurrentStream(data);
            setIsLive(true);
            
            // Subscribe to streamer's signaling channel
            if (ably) {
                const channel = ably.channels.get(`live:${user.id}:signaling`);
                
                channel.subscribe('join-request', async (msg) => {
                    const viewerId = msg.data.viewerId;
                    console.log(`Streamer: Received join request from ${viewerId}`);
                    
                    const pc = new RTCPeerConnection(ICE_SERVERS);
                    peerConnections.current[viewerId] = pc;

                    mediaStreamRef.current.getTracks().forEach(track => {
                        pc.addTrack(track, mediaStreamRef.current);
                    });

                    pc.onicecandidate = (event) => {
                        if (event.candidate) {
                            channel.publish(`ice-candidate:${viewerId}`, { 
                                candidate: event.candidate,
                                from: user.id 
                            });
                        }
                    };

                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    
                    channel.publish(`offer:${viewerId}`, { 
                        offer, 
                        streamerId: user.id,
                        streamerName: user.username 
                    });
                });

                channel.subscribe('answer', async (msg) => {
                    const { answer, viewerId } = msg.data;
                    const pc = peerConnections.current[viewerId];
                    if (pc) {
                        await pc.setRemoteDescription(new RTCSessionDescription(answer));
                    }
                });

                // Chat & Hearts
                const chatChannel = ably.channels.get(`live:${user.id}:chat`);
                chatChannel.subscribe('message', (msg) => {
                    setChatMessages(prev => [...prev.slice(-50), msg.data]);
                });
                chatChannel.subscribe('heart', () => {
                    sendHeartLocally();
                });
                chatChannel.subscribe('gift', (msg) => {
                    handleIncomingGift(msg.data);
                });
            }

            showToast('You are now live!', 'success');
        } catch (err) {
            showToast('Failed to start stream', 'error');
        }
    };

    const stopLive = async () => {
        if (currentStream) {
            await api.post(`/live/${currentStream.id}/end`);
        }
        
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop());
            mediaStreamRef.current = null;
        }

        setIsLive(false);
        setIsPreviewing(false);
        setCurrentStream(null);
    };

    // --- Viewer Logic ---

    const joinStream = async (stream) => {
        setCurrentStream(stream);
        setIsLive(true);

        if (ably) {
            const signalingChannel = ably.channels.get(`live:${stream.user_id}:signaling`);
            const chatChannel = ably.channels.get(`live:${stream.user_id}:chat`);

            const pc = new RTCPeerConnection(ICE_SERVERS);
            viewerPc.current = pc;

            pc.ontrack = (event) => {
                if (videoRef.current) videoRef.current.srcObject = event.streams[0];
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    signalingChannel.publish(`ice-candidate:${user.id}`, { 
                        candidate: event.candidate,
                        from: user.id 
                    });
                }
            };

            signalingChannel.subscribe(`offer:${user.id}`, async (msg) => {
                await pc.setRemoteDescription(new RTCSessionDescription(msg.data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                signalingChannel.publish('answer', { answer, viewerId: user.id });
            });

            signalingChannel.publish('join-request', { viewerId: user.id });

            chatChannel.subscribe('message', (msg) => {
                setChatMessages(prev => [...prev.slice(-50), msg.data]);
            });
            chatChannel.subscribe('heart', () => {
                sendHeartLocally();
            });
            chatChannel.subscribe('gift', (msg) => {
                handleIncomingGift(msg.data);
            });
        }
    };

    const leaveStream = () => {
        if (viewerPc.current) {
            viewerPc.current.close();
            viewerPc.current = null;
        }
        setCurrentStream(null);
        setIsLive(false);
        setChatMessages([]);
    };

    // --- Interaction Logic ---

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !ably || !currentStream) return;
        
        const msg = {
            user: user?.username || 'Guest',
            text: newMessage,
            timestamp: Date.now()
        };
        
        const chatChannel = ably.channels.get(`live:${currentStream.user_id}:chat`);
        chatChannel.publish('message', msg);
        setNewMessage('');
    };

    const sendHeartLocally = () => {
        const id = Date.now();
        setHearts(prev => [...prev, id]);
        setTimeout(() => {
            setHearts(prev => prev.filter(h => h !== id));
        }, 2000);
    };

    const sendHeart = () => {
        if (!ably || !currentStream) return;
        const chatChannel = ably.channels.get(`live:${currentStream.user_id}:chat`);
        chatChannel.publish('heart', {});
    };

    const sendGift = (giftType) => {
        if (!ably || !currentStream) return;
        const chatChannel = ably.channels.get(`live:${currentStream.user_id}:chat`);
        chatChannel.publish('gift', { type: giftType, user: user?.username });
    };

    const handleIncomingGift = (gift) => {
        const id = Date.now();
        setGifts(prev => [...prev, { ...gift, id }]);
        setTimeout(() => {
            setGifts(prev => prev.filter(g => g.id !== id));
        }, 4000);
    };

    // --- Render Helpers ---

    if (isLive && currentStream) {
        const isOwner = currentStream.user_id === user?.id;
        
        return (
            <div className="live-stream-page immersive">
                <div className="stream-broadcast">
                    <div className="video-container">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted={isOwner}
                            className="broadcast-video"
                        />
                        
                        <div className="stream-overlay">
                            <div className="overlay-top">
                                <div className="streamer-info">
                                    <img 
                                        src={currentStream.user_avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + currentStream.username} 
                                        className="streamer-avatar" 
                                        alt="" 
                                    />
                                    <div>
                                        <div className="streamer-name">{currentStream.username}</div>
                                        <div className="live-badge">LIVE</div>
                                    </div>
                                </div>
                                <div className="viewer-stats">
                                    <div className="viewer-count-pill">
                                        <Eye size={14} style={{ marginRight: 4 }} />
                                        {viewers || 1}
                                    </div>
                                    <button className="action-btn" onClick={isOwner ? stopLive : leaveStream}>
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="overlay-right">
                                <button className="action-btn heart" onClick={sendHeart}>
                                    <Heart size={24} />
                                    <span className="action-label">Like</span>
                                </button>
                                <button className="action-btn gift-trigger" onClick={() => setShowSettings(!showSettings)}>
                                    <span style={{ fontSize: '24px' }}>🎁</span>
                                    <span className="action-label">Gift</span>
                                </button>
                                {showSettings && (
                                    <div className="gift-menu shadow-lg">
                                        <div className="gift-item" onClick={() => { sendGift('Rose'); setShowSettings(false); }}>🌹 Rose</div>
                                        <div className="gift-item" onClick={() => { sendGift('Fire'); setShowSettings(false); }}>🔥 Fire</div>
                                        <div className="gift-item" onClick={() => { sendGift('Ice Cream'); setShowSettings(false); }}>🍦 Ice Cream</div>
                                        <div className="gift-item" onClick={() => { sendGift('Crown'); setShowSettings(false); }}>👑 Crown</div>
                                    </div>
                                )}
                                <button className="action-btn">
                                    <Share2 size={24} />
                                    <span className="action-label">Share</span>
                                </button>
                            </div>

                            {/* Gift Animation Overlay */}
                            <div className="gifts-overlay-container">
                                <AnimatePresence>
                                    {gifts.map(gift => (
                                        <motion.div
                                            key={gift.id}
                                            initial={{ opacity: 0, x: -100, scale: 0.5 }}
                                            animate={{ opacity: 1, x: 20, scale: 1.2 }}
                                            exit={{ opacity: 0, scale: 1.5 }}
                                            className="gift-animation-pill"
                                        >
                                            <div className="gift-user-avatar">
                                                {gift.user[0].toUpperCase()}
                                            </div>
                                            <div className="gift-info">
                                                <strong>{gift.user}</strong>
                                                <span>sent a {gift.type}</span>
                                            </div>
                                            <div className="gift-icon-big">
                                                {gift.type === 'Rose' && '🌹'}
                                                {gift.type === 'Fire' && '🔥'}
                                                {gift.type === 'Ice Cream' && '🍦'}
                                                {gift.type === 'Crown' && '👑'}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            <div className="overlay-bottom">
                                <div className="live-chat-preview">
                                    {chatMessages.map((msg, idx) => (
                                        <div key={idx} className="chat-bubble">
                                            <span className="chat-user">{msg.user}</span>
                                            {msg.text}
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                                <form className="chat-input-wrapper" onSubmit={sendMessage}>
                                    <input
                                        type="text"
                                        className="chat-input-pill"
                                        placeholder="Add comment..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                    />
                                    <button type="submit" className="action-btn" style={{ background: '#ff0050' }}>
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Floating Hearts Container */}
                        <div className="hearts-container">
                            {hearts.map(id => (
                                <div key={id} className="floating-heart" style={{ left: `${Math.random() * 40 + 60}%` }}>
                                    <Heart fill="#ff0050" color="#ff0050" size={32} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="live-stream-page">
            <div className="live-landing">
                <div className="live-header">
                    <h1>📹 Live Streams</h1>
                    <p>Experience the campus hub in real-time</p>
                </div>

                <div className="live-actions" style={{ marginBottom: '3rem', textAlign: 'center' }}>
                    {!isPreviewing ? (
                        <button className="btn btn-primary" style={{ padding: '1.5rem 3rem', fontSize: '1.2rem', borderRadius: '40px' }} onClick={startPreview}>
                            <Video size={24} /> Go Live Now
                        </button>
                    ) : (
                        <div className="preview-container" style={{ maxWidth: '400px', margin: '0 auto' }}>
                            <div className="video-container" style={{ aspectRatio: '9/16', marginBottom: '1rem' }}>
                                <video ref={videoRef} autoPlay muted playsInline className="broadcast-video" style={{ borderRadius: '20px' }} />
                                <div className="overlay-top" style={{ position: 'absolute', top: '10px', left: '10px' }}>
                                    <div className="live-badge" style={{ background: '#777' }}>PREVIEW</div>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <input 
                                    type="text" 
                                    className="chat-input-pill" 
                                    style={{ background: '#222' }}
                                    placeholder="Stream Title..." 
                                    value={streamTitle}
                                    onChange={(e) => setStreamTitle(e.target.value)}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn btn-outline" onClick={() => setIsPreviewing(false)} style={{ flex: 1 }}>Cancel</button>
                                <button className="btn btn-primary" onClick={goLive} style={{ flex: 1, background: '#ff0050' }}>Start Live</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="active-streams-section">
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>🔥 Active Streams</h2>
                    <div className="streams-grid">
                        {activeStreams.length > 0 ? (
                            activeStreams.map((stream) => (
                                <motion.div
                                    key={stream.id}
                                    className="stream-card"
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() => joinStream(stream)}
                                >
                                    <img src={stream.thumbnail_url || `https://picsum.photos/seed/${stream.id}/400/700`} alt="" />
                                    <div className="live-badge" style={{ position: 'absolute', top: 10, left: 10 }}>LIVE</div>
                                    <div className="card-overlay">
                                        <div style={{ fontWeight: 800 }}>{stream.title}</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>@{stream.username}</div>
                                    </div>
                                    <div className="viewer-count" style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>
                                        <Eye size={10} /> {stream.viewer_count || 0}
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                                <Video size={48} style={{ marginBottom: '1rem' }} />
                                <p>No one is live right now. Be the first!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveStreamPage;
