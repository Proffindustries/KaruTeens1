import React, { useEffect, useRef } from 'react';
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff, X } from 'lucide-react';
import '../styles/CallUI.css';
import Avatar from './Avatar.jsx';

// Incoming Call Modal
export const IncomingCallModal = ({ caller, callType, onAccept, onReject }) => {
    return (
        <div className="call-modal-overlay">
            <div className="incoming-call-modal">
                <div className="caller-info">
                    <Avatar
                        src={caller.avatar_url}
                        name={caller.username}
                        className="caller-avatar"
                        size="xl"
                    />
                    <h2>{caller.username}</h2>
                    <p className="call-type-label">
                        {callType === 'video' ? 'Video' : 'Voice'} Call
                    </p>
                </div>
                <div className="incoming-call-actions">
                    <button className="accept-call-btn" onClick={onAccept}>
                        {callType === 'video' ? <Video size={24} /> : <Phone size={24} />}
                        <span>Accept</span>
                    </button>
                    <button className="reject-call-btn" onClick={onReject}>
                        <PhoneOff size={24} />
                        <span>Decline</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// Active Call Screen
export const ActiveCallScreen = ({
    callType,
    remoteUser,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    callDuration,
    onToggleMute,
    onToggleVideo,
    onEndCall
}) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="active-call-screen">
            <div className="call-header">
                <div className="remote-user-info">
                    <Avatar
                        src={remoteUser.avatar_url}
                        name={remoteUser.username}
                        className="remote-user-avatar-small"
                        size="sm"
                    />
                    <div>
                        <h3>{remoteUser.username}</h3>
                        <span className="call-duration">{formatDuration(callDuration)}</span>
                    </div>
                </div>
                <button className="minimize-call-btn" onClick={onEndCall}>
                    <X size={20} />
                </button>
            </div>

            <div className="call-video-container">
                {callType === 'video' ? (
                    <>
                        {/* Remote Video */}
                        <div className="remote-video-wrapper">
                            {remoteStream ? (
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    className="remote-video"
                                />
                            ) : (
                                <div className="video-placeholder">
                                    <Avatar
                                        src={remoteUser.avatar_url}
                                        name={remoteUser.username}
                                        className="placeholder-avatar"
                                        size="3xl"
                                    />
                                    <p>Connecting...</p>
                                </div>
                            )}
                        </div>

                        {/* Local Video (Picture-in-Picture) */}
                        <div className="local-video-wrapper">
                            {!isVideoOff ? (
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="local-video"
                                />
                            ) : (
                                <div className="video-off-indicator">
                                    <VideoOff size={32} />
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    // Voice Call - Show Avatar
                    <div className="voice-call-display">
                        <Avatar
                            src={remoteUser.avatar_url}
                            name={remoteUser.username}
                            className="voice-call-avatar"
                            size="3xl"
                        />
                        <h2>{remoteUser.username}</h2>
                        <p className="voice-call-status">
                            {remoteStream ? 'Connected' : 'Connecting...'}
                        </p>
                    </div>
                )}
            </div>

            <div className="call-controls">
                <button
                    className={`call-control-btn ${isMuted ? 'active' : ''}`}
                    onClick={onToggleMute}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>

                {callType === 'video' && (
                    <button
                        className={`call-control-btn ${isVideoOff ? 'active' : ''}`}
                        onClick={onToggleVideo}
                        title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                    >
                        {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                    </button>
                )}

                <button
                    className="call-control-btn end-call"
                    onClick={onEndCall}
                    title="End call"
                >
                    <PhoneOff size={24} />
                </button>
            </div>
        </div>
    );
};

// Calling Screen (Outgoing)
export const CallingScreen = ({ remoteUser, callType, onCancel }) => {
    return (
        <div className="call-modal-overlay">
            <div className="calling-modal">
                <div className="caller-info">
                    <Avatar
                        src={remoteUser.avatar_url}
                        name={remoteUser.username}
                        className="caller-avatar"
                        size="3xl"
                    />
                    <h2>{remoteUser.username}</h2>
                    <p className="calling-status">Calling...</p>
                    <div className="calling-animation">
                        <div className="pulse-ring"></div>
                        <div className="pulse-ring delay-1"></div>
                        <div className="pulse-ring delay-2"></div>
                    </div>
                </div>
                <button className="cancel-call-btn" onClick={onCancel}>
                    <PhoneOff size={24} />
                    <span>Cancel</span>
                </button>
            </div>
        </div>
    );
};
