import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PenTool, Mic, Video, Monitor, MessageSquare, Users, Trash2, PlusCircle, LogOut, Loader, Send, Eraser, X, Upload, Download, File, PhoneOff, Phone, VideoOff } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/StudyRoomsPage.css';
import { useStudyRooms, useCreateRoom, useJoinRoom, useLeaveRoom, useStudyRoom, useGenerateInviteLink, useRemoveUser } from '../hooks/useStudyRooms';
import { useAbly } from '../context/AblyContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { useMediaUpload } from '../hooks/useMedia';
import PremiumGate from '../components/PremiumGate';
import Avatar from '../components/Avatar';

const StudyRoomsPage = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();

    // Check premium status
    if (!user?.is_premium && user?.role !== 'premium') {
        return <PremiumGate feature="Study Rooms" />;
    }

    if (roomId) {
        return <ActiveRoom roomId={roomId} />;
    }

    return <RoomLobby />;
};

const RoomLobby = () => {
    const { data: rooms, isLoading } = useStudyRooms();
    const { mutate: createRoom } = useCreateRoom();
    const { mutate: joinRoom } = useJoinRoom();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [roomName, setRoomName] = useState('');
    const [roomSubject, setRoomSubject] = useState('');
    const navigate = useNavigate();
    const { showToast } = useToast();

    const handleCreateRoom = () => {
        if (!roomName.trim()) {
            showToast('Please enter a room name', 'error');
            return;
        }

        createRoom({ name: roomName, subject: roomSubject }, {
            onSuccess: (data) => {
                showToast('Room created!', 'success');
                setShowCreateModal(false);
                setRoomName('');
                setRoomSubject('');
                navigate(`/study-rooms/${data.id}`);
            },
            onError: (err) => {
                showToast(err.response?.data?.error || 'Failed to create room', 'error');
            }
        });
    };

    const handleJoinRoom = (id) => {
        joinRoom(id, {
            onSuccess: () => {
                navigate(`/study-rooms/${id}`);
            },
            onError: (err) => {
                showToast(err.response?.data?.error || 'Failed to join room', 'error');
            }
        });
    };

    return (
        <div className="container study-rooms-page">
            <div className="lobby-header">
                <div>
                    <h1>📚 Study Rooms</h1>
                    <p>Collaborate with fellow students in real-time</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    <PlusCircle size={20} /> Create Room
                </button>
            </div>

            {isLoading ? (
                <div className="loading-state">
                    <Loader size={48} className="spin-anim" />
                    <p>Loading rooms...</p>
                </div>
            ) : (
                <div className="rooms-grid">
                    {rooms && rooms.length > 0 ? (
                        rooms.map(room => (
                            <div key={room.id} className="room-card card">
                                <div className="room-card-header">
                                    <h3>{room.name}</h3>
                                    <span className="live-badge">LIVE</span>
                                </div>
                                {room.subject && (
                                    <div className="room-subject">
                                        <span className="subject-tag">{room.subject}</span>
                                    </div>
                                )}
                                <div className="room-info">
                                    <span className="participants-count">
                                        <Users size={16} /> {room.participant_count}/{room.max_participants}
                                    </span>
                                    <span className="room-time">
                                        {new Date(room.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <button
                                    className="btn btn-outline btn-full"
                                    onClick={() => handleJoinRoom(room.id)}
                                    disabled={room.participant_count >= room.max_participants}
                                >
                                    {room.participant_count >= room.max_participants ? 'Full' : 'Join Room'}
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <Monitor size={64} color="#ccc" />
                            <p>No active study rooms</p>
                            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                                Create the First Room
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Create Room Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h3>Create Study Room</h3>
                            <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Room Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Calculus 101 Revision"
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
                                />
                            </div>
                            <div className="form-group">
                                <label>Subject/Topic (Optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Mathematics, Physics, etc."
                                    value={roomSubject}
                                    onChange={(e) => setRoomSubject(e.target.value)}
                                />
                            </div>
                            <button className="btn btn-primary btn-full" onClick={handleCreateRoom}>
                                Create Room
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ActiveRoom = ({ roomId }) => {
    const canvasRef = useRef(null);
    const chatEndRef = useRef(null);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const fileInputRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideosRef = useRef({});
    const peerConnectionsRef = useRef({});

    const [isDrawing, setIsDrawing] = useState(false);
    const [currentColor, setCurrentColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(3);
    const [tool, setTool] = useState('pen');
    const [chatMessage, setChatMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [showChat, setShowChat] = useState(true);
    const [showParticipants, setShowParticipants] = useState(true);
    const [sharedFiles, setSharedFiles] = useState([]);
    const [uploadingFile, setUploadingFile] = useState(false);

    // Chat enhancements
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState(new Set());

    // Whiteboard improvements
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const [isDrawingShape, setIsDrawingShape] = useState(false);
    const [shapeStart, setShapeStart] = useState({ x: 0, y: 0 });

    // WebRTC states
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [screenStream, setScreenStream] = useState(null);

    // New feature states
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [userToRemove, setUserToRemove] = useState(null);

    // Whiteboard enhancement states
    const [whiteboardHistory, setWhiteboardHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(-1);
    const [toolSize, setToolSize] = useState(3);
    const [toolOpacity, setToolOpacity] = useState(1.0);
    const [isFilling, setIsFilling] = useState(false);
    const [shapes, setShapes] = useState([]);
    const [currentShape, setCurrentShape] = useState(null);

    const { data: room } = useStudyRoom(roomId);
    const { mutate: leaveRoom } = useLeaveRoom();
    const { mutate: generateInviteLink } = useGenerateInviteLink();
    const { mutate: removeUser } = useRemoveUser();
    const navigate = useNavigate();
    const { ably } = useAbly();
    const [whiteboardChannel, setWhiteboardChannel] = useState(null);
    const [chatChannel, setChatChannel] = useState(null);
    const [filesChannel, setFilesChannel] = useState(null);
    const [webrtcChannel, setWebrtcChannel] = useState(null);
    const { showToast } = useToast();
    const { user } = useAuth();
    const { uploadFile } = useMediaUpload();

    // Define drawLine with useCallback to prevent recreation
    const drawLine = useCallback((x1, y1, x2, y2, color = '#000', width = 3) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }, []);

    // Define clearCanvas with useCallback
    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, []);

    // Enhanced whiteboard functions
    const saveCanvasState = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Update history
        const newHistory = whiteboardHistory.slice(0, currentStep + 1);
        newHistory.push(imageData);

        setWhiteboardHistory(newHistory);
        setCurrentStep(newHistory.length - 1);
    }, [whiteboardHistory, currentStep]);

    const undo = useCallback(() => {
        if (currentStep > 0) {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const previousState = whiteboardHistory[currentStep - 1];

            ctx.putImageData(previousState, 0, 0);
            setCurrentStep(currentStep - 1);
        }
    }, [currentStep, whiteboardHistory]);

    const redo = useCallback(() => {
        if (currentStep < whiteboardHistory.length - 1) {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const nextState = whiteboardHistory[currentStep + 1];

            ctx.putImageData(nextState, 0, 0);
            setCurrentStep(currentStep + 1);
        }
    }, [currentStep, whiteboardHistory]);

    const handleToolSizeChange = (size) => {
        setToolSize(size);
        setLineWidth(size);
    };

    const handleToolOpacityChange = (opacity) => {
        setToolOpacity(opacity);
    };

    const handleFillToggle = () => {
        setIsFilling(!isFilling);
    };

    // Initialize Ably channels
    useEffect(() => {
        if (!ably || !roomId) return;

        const wbChannelName = `study-room:${roomId}:whiteboard`;
        const wbChannel = ably.channels.get(wbChannelName);

        wbChannel.subscribe('draw', (message) => {
            const { x, y, prevX, prevY, color, width } = message.data;
            drawLine(prevX, prevY, x, y, color, width);
        });

        wbChannel.subscribe('clear', () => {
            clearCanvas();
        });

        setWhiteboardChannel(wbChannel);

        const chatChannelName = `study-room:${roomId}:chat`;
        const cChannel = ably.channels.get(chatChannelName);

        cChannel.subscribe('message', (message) => {
            setMessages(prev => [...prev, message.data]);
        });

        cChannel.subscribe('typing', (message) => {
            setTypingUsers(prev => new Set([...prev, message.data.username]));
        });

        cChannel.subscribe('stop-typing', (message) => {
            setTypingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(message.data.username);
                return newSet;
            });
        });

        setChatChannel(cChannel);

        // Files channel
        const filesChannelName = `study-room:${roomId}:files`;
        const fChannel = ably.channels.get(filesChannelName);

        fChannel.subscribe('file-shared', (message) => {
            setSharedFiles(prev => [...prev, message.data]);
            showToast(`${message.data.username} shared a file`, 'info');
        });

        setFilesChannel(fChannel);

        // WebRTC signaling channel
        const webrtcChannelName = `study-room:${roomId}:webrtc`;
        const rtcChannel = ably.channels.get(webrtcChannelName);

        rtcChannel.subscribe('offer', handleWebRTCOffer);
        rtcChannel.subscribe('answer', handleWebRTCAnswer);
        rtcChannel.subscribe('ice-candidate', handleICECandidate);

        setWebrtcChannel(rtcChannel);

        return () => {
            wbChannel.unsubscribe();
            cChannel.unsubscribe();
            fChannel.unsubscribe();
            rtcChannel.unsubscribe();
        };
    }, [ably, roomId, drawLine, clearCanvas, showToast]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Canvas setup
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = currentColor;
    }, [lineWidth, currentColor]);

    // Cleanup WebRTC on unmount
    useEffect(() => {
        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
        };
    }, [localStream]);

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        lastPosRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        // Save canvas state before starting to draw
        saveCanvasState();
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const drawColor = tool === 'eraser' ? '#FFFFFF' : currentColor;
        const drawWidth = tool === 'eraser' ? 20 : lineWidth;

        drawLine(lastPosRef.current.x, lastPosRef.current.y, x, y, drawColor, drawWidth);

        if (whiteboardChannel) {
            whiteboardChannel.publish('draw', {
                x, y,
                prevX: lastPosRef.current.x,
                prevY: lastPosRef.current.y,
                color: drawColor,
                width: drawWidth
            });
        }

        lastPosRef.current = { x, y };
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    // Whiteboard logic consolidated to use the useCallback version above


    const handleUndo = () => {
        const canvas = canvasRef.current;
        if (!canvas || undoStack.length === 0) return;

        const ctx = canvas.getContext('2d');
        const lastState = undoStack[undoStack.length - 1];
        const img = new Image();

        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            setRedoStack(prev => [...prev, undoStack[undoStack.length - 1]]);
            setUndoStack(prev => prev.slice(0, -1));
        };
        img.src = lastState;
    };

    const handleRedo = () => {
        const canvas = canvasRef.current;
        if (!canvas || redoStack.length === 0) return;

        const ctx = canvas.getContext('2d');
        const nextState = redoStack[redoStack.length - 1];
        const img = new Image();

        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            setUndoStack(prev => [...prev, redoStack[redoStack.length - 1]]);
            setRedoStack(prev => prev.slice(0, -1));
        };
        img.src = nextState;
    };

    const handleClearCanvas = () => {
        saveCanvasState();
        clearCanvas();
        if (whiteboardChannel) {
            whiteboardChannel.publish('clear', {});
        }
    };

    const handleSaveCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const link = document.createElement('a');
        link.download = `whiteboard-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        showToast('Canvas saved', 'success');
    };

    const handleSendMessage = () => {
        if (!chatMessage.trim() || !chatChannel) return;

        const message = {
            username: user?.username || 'Anonymous',
            content: chatMessage,
            timestamp: new Date().toISOString(),
            avatar: user?.avatar_url
        };

        chatChannel.publish('message', message);
        setMessages(prev => [...prev, message]);
        setChatMessage('');

        // Stop typing indicator
        setIsTyping(false);
        chatChannel.publish('stop-typing', { username: user?.username });
    };

    const handleTyping = (e) => {
        const value = e.target.value;
        setChatMessage(value);

        if (value.trim() && !isTyping) {
            setIsTyping(true);
            chatChannel.publish('typing', { username: user?.username });
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFile(true);
        try {
            const url = await uploadFile(file);

            const fileData = {
                filename: file.name,
                url,
                size: file.size,
                type: file.type,
                username: user?.username || 'Anonymous',
                timestamp: new Date().toISOString()
            };

            if (filesChannel) {
                filesChannel.publish('file-shared', fileData);
            }
            setSharedFiles(prev => [...prev, fileData]);
            showToast('File uploaded successfully', 'success');
        } catch (error) {
            showToast('Failed to upload file', 'error');
        } finally {
            setUploadingFile(false);
        }
    };

    // WebRTC Functions
    const toggleAudio = async () => {
        if (!isAudioEnabled) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                setLocalStream(stream);
                setIsAudioEnabled(true);
                showToast('Microphone enabled', 'success');
            } catch (error) {
                showToast('Failed to access microphone', 'error');
            }
        } else {
            if (localStream) {
                localStream.getAudioTracks().forEach(track => track.stop());
                setLocalStream(null);
            }
            setIsAudioEnabled(false);
            showToast('Microphone disabled', 'info');
        }
    };

    const toggleVideo = async () => {
        if (!isVideoEnabled) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: isAudioEnabled, video: true });
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                setIsVideoEnabled(true);
                showToast('Camera enabled', 'success');
            } catch (error) {
                showToast('Failed to access camera', 'error');
            }
        } else {
            if (localStream) {
                localStream.getVideoTracks().forEach(track => track.stop());
                if (!isAudioEnabled) {
                    setLocalStream(null);
                }
            }
            setIsVideoEnabled(false);
            showToast('Camera disabled', 'info');
        }
    };

    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false
                });

                setScreenStream(screenStream);
                setIsScreenSharing(true);
                showToast('Screen sharing started', 'success');

                // Handle screen share end
                screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                    setIsScreenSharing(false);
                    showToast('Screen sharing stopped', 'info');
                });
            } catch (error) {
                showToast('Failed to start screen sharing', 'error');
            }
        } else {
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
                setScreenStream(null);
            }
            setIsScreenSharing(false);
            showToast('Screen sharing stopped', 'info');
        }
    };

    const handleWebRTCOffer = async (message) => {
        // Handle incoming WebRTC offer
        console.log('Received WebRTC offer', message.data);
    };

    const handleWebRTCAnswer = async (message) => {
        // Handle incoming WebRTC answer
        console.log('Received WebRTC answer', message.data);
    };

    const handleICECandidate = async (message) => {
        // Handle incoming ICE candidate
        console.log('Received ICE candidate', message.data);
    };

    const handleLeaveRoom = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

        leaveRoom(roomId, {
            onSuccess: () => {
                showToast('Left room', 'info');
                navigate('/study-rooms');
            }
        });
    };

    const handleGenerateInviteLink = () => {
        setIsGeneratingInvite(true);
        generateInviteLink(roomId, {
            onSuccess: (data) => {
                setInviteLink(data.invite_link);
                setShowInviteModal(true);
                showToast('Invite link generated', 'success');
            },
            onError: (err) => {
                showToast(err.response?.data?.error || 'Failed to generate invite link', 'error');
            },
            onSettled: () => {
                setIsGeneratingInvite(false);
            }
        });
    };

    const handleCopyInviteLink = () => {
        navigator.clipboard.writeText(inviteLink);
        showToast('Invite link copied to clipboard', 'success');
    };

    const handleRemoveUser = (userId, username) => {
        setUserToRemove({ userId, username });
        setShowRemoveModal(true);
    };

    const confirmRemoveUser = () => {
        if (!userToRemove) return;

        removeUser(
            { roomId, userId: userToRemove.userId },
            {
                onSuccess: () => {
                    showToast(`${userToRemove.username} has been removed from the room`, 'info');
                    setShowRemoveModal(false);
                    setUserToRemove(null);
                },
                onError: (err) => {
                    showToast(err.response?.data?.error || 'Failed to remove user', 'error');
                }
            }
        );
    };

    const participants = room?.participants || [];

    return (
        <div className="study-rooms-page">
            <div className="study-header">
                <div className="room-info-header">
                    <h1>{room?.name || 'Loading...'}</h1>
                    <span className="live-badge">LIVE</span>
                    <span className="participants">
                        <Users size={16} /> {participants.length} Participants
                    </span>
                </div>
                <div className="room-controls">
                    <button
                        className={`control-btn ${isAudioEnabled ? 'active' : ''}`}
                        onClick={toggleAudio}
                        title={isAudioEnabled ? "Mute" : "Unmute"}
                    >
                        {isAudioEnabled ? <Mic size={20} /> : <PhoneOff size={20} />}
                    </button>
                    <button
                        className={`control-btn ${isVideoEnabled ? 'active' : ''}`}
                        onClick={toggleVideo}
                        title={isVideoEnabled ? "Stop Video" : "Start Video"}
                    >
                        {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                    </button>
                    <button
                        className={`control-btn ${isScreenSharing ? 'active' : ''}`}
                        onClick={toggleScreenShare}
                        title={isScreenSharing ? "Stop Screen Share" : "Start Screen Share"}
                    >
                        <Monitor size={20} />
                    </button>
                    <button
                        className="control-btn"
                        onClick={handleGenerateInviteLink}
                        disabled={isGeneratingInvite}
                        title="Generate Invite Link"
                    >
                        {isGeneratingInvite ? <Loader size={20} className="spin-anim" /> : <PlusCircle size={20} />}
                    </button>
                    <button
                        className={`control-btn ${showChat ? 'active' : ''}`}
                        onClick={() => setShowChat(!showChat)}
                        title="Toggle Chat"
                    >
                        <MessageSquare size={20} />
                    </button>
                    <button
                        className={`control-btn ${showParticipants ? 'active' : ''}`}
                        onClick={() => setShowParticipants(!showParticipants)}
                        title="Toggle Participants"
                    >
                        <Users size={20} />
                    </button>
                    <button className="btn btn-danger" onClick={handleLeaveRoom}>
                        <LogOut size={18} /> Leave
                    </button>
                </div>
            </div>

            <div className="study-layout">
                {/* Participants Sidebar */}
                {showParticipants && (
                    <div className="participants-sidebar card">
                        <div className="sidebar-header">
                            <h3>👥 Participants ({participants.length})</h3>
                        </div>
                        <div className="participants-list">
                            {participants.map((participant) => (
                                <div key={participant.user_id} className="participant-item">
                                    <Avatar
                                        src={participant.avatar_url}
                                        name={participant.username}
                                        size="sm"
                                    />
                                    <span className="participant-name">{participant.username}</span>
                                    {participant.user_id === room?.creator_id && (
                                        <span className="creator-badge">Host</span>
                                    )}
                                    {user?.user_id === room?.creator_id && participant.user_id !== room?.creator_id && (
                                        <button
                                            className="remove-user-btn"
                                            onClick={() => handleRemoveUser(participant.user_id, participant.username)}
                                            title="Remove User"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Shared Files Section */}
                        <div className="shared-files-section">
                            <div className="files-header">
                                <h4>📎 Shared Files</h4>
                                <button
                                    className="btn-icon-small"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingFile}
                                    title="Upload File"
                                >
                                    {uploadingFile ? <Loader size={16} className="spin-anim" /> : <Upload size={16} />}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    hidden
                                    onChange={handleFileUpload}
                                />
                            </div>
                            <div className="files-list">
                                {sharedFiles.length === 0 ? (
                                    <p className="empty-files">No files shared yet</p>
                                ) : (
                                    sharedFiles.map((file, idx) => (
                                        <div key={idx} className="file-item">
                                            <File size={16} />
                                            <div className="file-info">
                                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-name">
                                                    {file.filename}
                                                </a>
                                                <span className="file-meta">
                                                    {file.username} • {(file.size / 1024).toFixed(1)} KB
                                                </span>
                                            </div>
                                            <a href={file.url} download className="btn-icon-small">
                                                <Download size={14} />
                                            </a>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="main-content-area">
                    {/* Video Grid (if enabled) */}
                    {(isVideoEnabled || isAudioEnabled || isScreenSharing) && (
                        <div className="video-grid">
                            {isVideoEnabled && (
                                <div className="video-tile">
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="local-video"
                                    />
                                    <span className="video-label">You</span>
                                </div>
                            )}
                            {isScreenSharing && screenStream && (
                                <div className="video-tile screen-share-tile">
                                    <video
                                        autoPlay
                                        playsInline
                                        className="screen-share-video"
                                        srcObject={screenStream}
                                    />
                                    <span className="video-label">Screen Share</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Whiteboard */}
                    <div className="whiteboard-container card">
                        <div className="wb-toolbar">
                            <strong>📝 Shared Whiteboard</strong>
                            <div className="tools">
                                <button
                                    className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
                                    onClick={() => setTool('pen')}
                                    title="Pen"
                                >
                                    <PenTool size={16} />
                                </button>
                                <button
                                    className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                                    onClick={() => setTool('eraser')}
                                    title="Eraser"
                                >
                                    <Eraser size={16} />
                                </button>
                                <input
                                    type="color"
                                    value={currentColor}
                                    onChange={(e) => setCurrentColor(e.target.value)}
                                    className="color-picker"
                                    title="Color"
                                />
                                <select
                                    value={lineWidth}
                                    onChange={(e) => setLineWidth(Number(e.target.value))}
                                    className="width-select"
                                    title="Line Width"
                                >
                                    <option value="1">Thin</option>
                                    <option value="3">Normal</option>
                                    <option value="5">Thick</option>
                                    <option value="8">Very Thick</option>
                                </select>
                                <button className="tool-btn" onClick={handleUndo} title="Undo" disabled={undoStack.length === 0}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 7v6h6"></path>
                                        <path d="M3 10l4-4 4 4"></path>
                                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
                                    </svg>
                                </button>
                                <button className="tool-btn" onClick={handleRedo} title="Redo" disabled={redoStack.length === 0}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 7v6h-6"></path>
                                        <path d="M21 10l-4-4-4 4"></path>
                                        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path>
                                    </svg>
                                </button>
                                <button className="tool-btn" onClick={handleSaveCanvas} title="Save Canvas">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                </button>
                                <button className="tool-btn" onClick={handleClearCanvas} title="Clear All">
                                    <Trash2 size={16} />
                                </button>
                                <button className="tool-btn" onClick={handleSaveCanvas} title="Save Canvas">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <canvas
                            ref={canvasRef}
                            width={1000}
                            height={600}
                            className="drawing-canvas"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                        />
                        <div className="canvas-tip">
                            <p><strong>💡 Pro Tip:</strong> All participants can see your drawings in real-time!</p>
                        </div>
                    </div>
                </div>

                {/* Chat Sidebar */}
                {showChat && (
                    <div className="chat-sidebar card">
                        <div className="chat-header">
                            <h3>💬 Chat</h3>
                            <button className="close-chat-btn" onClick={() => setShowChat(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="chat-messages">
                            {messages.length === 0 ? (
                                <div className="empty-chat">
                                    <MessageSquare size={48} color="#ccc" />
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div key={idx} className="chat-message">
                                        <Avatar src={msg.avatar} name={msg.username} size="sm" />
                                        <div className="message-content">
                                            <div className="message-header">
                                                <strong>{msg.username}</strong>
                                                <span className="message-time">
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p>{msg.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}

                            {/* Typing indicators */}
                            {typingUsers.size > 0 && (
                                <div className="typing-indicator">
                                    <div className="typing-dots">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                    <span className="typing-text">
                                        {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                                    </span>
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </div>
                        <div className="chat-input-container">
                            <input
                                type="text"
                                className="chat-input"
                                placeholder="Type a message..."
                                value={chatMessage}
                                onChange={handleTyping}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button
                                className="send-btn"
                                onClick={handleSendMessage}
                                disabled={!chatMessage.trim()}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Invite Link Modal */}
                {showInviteModal && (
                    <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                            <div className="modal-header">
                                <h3>Share Room Invite</h3>
                                <button className="close-btn" onClick={() => setShowInviteModal(false)}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="invite-link-container">
                                    <label>Invite Link</label>
                                    <div className="invite-link-input-group">
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={inviteLink}
                                            readOnly
                                            style={{ flex: 1 }}
                                        />
                                        <button className="btn btn-primary" onClick={handleCopyInviteLink}>
                                            Copy Link
                                        </button>
                                    </div>
                                    <p className="invite-tip">
                                        <strong>💡 Tip:</strong> Share this link with friends to invite them to your study room.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Remove User Confirmation Modal */}
                {showRemoveModal && userToRemove && (
                    <div className="modal-overlay" onClick={() => setShowRemoveModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                            <div className="modal-header">
                                <h3>Remove User</h3>
                                <button className="close-btn" onClick={() => setShowRemoveModal(false)}>×</button>
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to remove <strong>{userToRemove.username}</strong> from this room?</p>
                                <div className="modal-actions">
                                    <button className="btn btn-outline" onClick={() => setShowRemoveModal(false)}>
                                        Cancel
                                    </button>
                                    <button className="btn btn-danger" onClick={confirmRemoveUser}>
                                        Remove User
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudyRoomsPage;
