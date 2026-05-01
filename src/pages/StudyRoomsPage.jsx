import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    PenTool,
    Mic,
    Video,
    Monitor,
    MessageSquare,
    Users,
    Trash2,
    PlusCircle,
    LogOut,
    Loader,
    Send,
    Eraser,
    Plus,
    Square,
    Circle,
    Type,
    VideoOff,
    Music,
    Volume2,
    Copy,
    Link,
    Timer,
    Coffee,
    Search,
    UserPlus,
    X,
    Upload,
    Download,
    File,
    MicOff,
    ChevronLeft,
    ChevronRight,
    Brain,
    Info,
    Check,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/StudyRoomsPage.css';
import {
    useStudyRooms,
    useCreateRoom,
    useJoinRoom,
    useLeaveRoom,
    useStudyRoom,
    useGenerateInviteLink,
    useRemoveUser,
    useRoomHistory,
    useSaveRoomMessage,
    useSaveRoomFile,
    useDeleteRoom,
} from '../hooks/useStudyRooms';
import { useAbly } from '../context/AblyContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { useMediaUpload } from '../hooks/useMedia';
import PremiumGate from '../components/PremiumGate';
import Avatar from '../components/Avatar';

import api from '../api/client';
import FormattedText from '../components/FormattedText';

const StudyRoomsPage = () => {
    const { roomId } = useParams();
    const { user } = useAuth();

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
    const { mutate: deleteRoom } = useDeleteRoom();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [roomName, setRoomName] = useState('');
    const [roomSubject, setRoomSubject] = useState('');
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user } = useAuth();

    const handleCreateRoom = () => {
        if (!roomName.trim()) {
            showToast('Please enter a room name', 'error');
            return;
        }
        createRoom(
            { name: roomName, subject: roomSubject },
            {
                onSuccess: (data) => {
                    showToast('Room created!', 'success');
                    navigate(`/study-rooms/${data.id}`);
                },
                onError: (err) =>
                    showToast(err.response?.data?.error || 'Failed to create room', 'error'),
            },
        );
    };

    const handleDeleteRoom = (roomId) => {
        if (window.confirm('Are you sure you want to delete this room?')) {
            deleteRoom(roomId, {
                onSuccess: () => {
                    showToast('Room deleted', 'success');
                },
                onError: (err) => {
                    showToast('Failed to delete room', 'error');
                },
            });
        }
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
                </div>
            ) : (
                <div className="rooms-grid">
                    {rooms?.length === 0 ? (
                        <div
                            className="empty-state"
                            style={{
                                gridColumn: '1/-1',
                                textAlign: 'center',
                                padding: '4rem',
                                background: 'var(--study-surface)',
                                borderRadius: '24px',
                            }}
                        >
                            <Info size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                            <h3>No active rooms</h3>
                            <p>Create one to start studying with others!</p>
                        </div>
                    ) : (
                        rooms?.map((room) => (
                            <div key={room.id} className="room-card card">
                                <div className="room-card-header">
                                    <h3>{room.name}</h3>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: '8px',
                                            alignItems: 'center',
                                        }}
                                    >
                                        {room.creator_id === user?.id && (
                                            <button
                                                className="icon-btn danger"
                                                style={{ padding: '4px' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteRoom(room.id);
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        <span className="live-badge">LIVE</span>
                                    </div>
                                </div>
                                {room.subject && (
                                    <div
                                        className="room-subject"
                                        style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--study-accent)',
                                            marginBottom: '0.5rem',
                                        }}
                                    >
                                        #{room.subject}
                                    </div>
                                )}
                                <div className="room-info">
                                    <span className="participants-count">
                                        <Users size={16} /> {room.participant_count}/
                                        {room.max_participants}
                                    </span>
                                </div>
                                <button
                                    className="btn btn-outline btn-full"
                                    onClick={() => navigate(`/study-rooms/${room.id}`)}
                                >
                                    Join Room
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '450px' }}
                    >
                        <div className="modal-header">
                            <h3>Create Study Room</h3>
                        </div>
                        <div className="modal-body">
                            <label className="form-label">Room Name</label>
                            <input
                                className="form-input mb-4"
                                placeholder="e.g., Calculus II Group"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                            />

                            <label className="form-label">Subject (Optional)</label>
                            <input
                                className="form-input mb-4"
                                placeholder="e.g., Mathematics"
                                value={roomSubject}
                                onChange={(e) => setRoomSubject(e.target.value)}
                            />

                            <button className="btn btn-primary btn-full" onClick={handleCreateRoom}>
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ActiveRoom = ({ roomId }) => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { ably } = useAbly();
    const { uploadMedia } = useMediaUpload();

    const { data: room } = useStudyRoom(roomId);
    const { data: history } = useRoomHistory(roomId);
    const { mutate: saveMessage } = useSaveRoomMessage();
    const { mutate: saveFile } = useSaveRoomFile();
    const { mutate: leaveRoom } = useLeaveRoom();
    const { mutate: generateInviteLink } = useGenerateInviteLink();

    const canvasRef = useRef(null);
    const chatEndRef = useRef(null);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const localVideoRef = useRef(null);
    const screenVideoRef = useRef(null);
    const lofiAudioRef = useRef(
        new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
    );

    const [isDrawing, setIsDrawing] = useState(false);
    const [currentColor, setCurrentColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(3);
    const [tool, setTool] = useState('pen');
    const [chatMessage, setChatMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [sharedFiles, setSharedFiles] = useState([]);

    // Ably Channels
    const [whiteboardChannel, setWhiteboardChannel] = useState(null);
    const [chatChannel, setChatChannel] = useState(null);
    const [filesChannel, setFilesChannel] = useState(null);
    const [presenceChannel, setPresenceChannel] = useState(null);

    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState(new Set());

    // Load history
    useEffect(() => {
        if (history) {
            setMessages(history.messages || []);
            setSharedFiles(history.files || []);
        }
    }, [history]);

    const [uploadingFile, setUploadingFile] = useState(false);
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const [shapeStart, setShapeStart] = useState({ x: 0, y: 0 });
    const [chalkPos, setChalkPos] = useState({ x: 0, y: 0 });
    const [isMouseOverCanvas, setIsMouseOverCanvas] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [screenStream, setScreenStream] = useState(null);

    const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
    const [isPomodoroActive, setIsPomodoroActive] = useState(false);
    const [pomodoroMode, setPomodoroMode] = useState('work');
    const [isLofiPlaying, setIsLofiPlaying] = useState(false);
    const [lofiVolume, setLofiVolume] = useState(0.5);

    // AI Study Buddy State
    const [aiQuestion, setAiQuestion] = useState('');
    const [aiAnswer, setAiAnswer] = useState(null);
    const [isAiThinking, setIsAiThinking] = useState(false);

    useEffect(() => {
        if (!ably || !roomId) return;

        // Whiteboard Channel
        const wb = ably.channels.get(`study-room:${roomId}:whiteboard`);
        wb.subscribe('draw', (msg) => {
            const { x, y, prevX, prevY, color, width, type } = msg.data;
            drawLineRaw(prevX, prevY, x, y, color, width, type);
        });
        wb.subscribe('clear', () => {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, 1200, 800);
        });
        setWhiteboardChannel(wb);

        // Chat Channel
        const chat = ably.channels.get(`study-room:${roomId}:chat`);
        chat.subscribe('message', (msg) => {
            setMessages((p) => [...p, msg.data]);
            scrollToBottom();
        });
        chat.subscribe('typing', (msg) => {
            if (msg.data.username !== user?.username) {
                setTypingUsers((p) => new Set([...p, msg.data.username]));
            }
        });
        chat.subscribe('stop-typing', (msg) => {
            setTypingUsers((p) => {
                const n = new Set(p);
                n.delete(msg.data.username);
                return n;
            });
        });
        setChatChannel(chat);

        // Files Channel
        const files = ably.channels.get(`study-room:${roomId}:files`);
        files.subscribe('file-shared', (msg) => {
            setSharedFiles((p) => (p.some((f) => f.url === msg.data.url) ? p : [...p, msg.data]));
        });
        setFilesChannel(files);

        // Presence Channel
        const presence = ably.channels.get(`study-room:${roomId}:presence`);
        presence.presence.subscribe('enter', (member) => {
            updatePresence(presence);
        });
        presence.presence.subscribe('leave', (member) => {
            updatePresence(presence);
        });
        presence.presence.subscribe('update', (member) => {
            updatePresence(presence);
        });
        presence.presence.enter({ username: user?.username, avatar: user?.avatar_url });
        setPresenceChannel(presence);
        updatePresence(presence);

        return () => {
            wb.unsubscribe();
            chat.unsubscribe();
            files.unsubscribe();
            presence.presence.leave();
            presence.presence.unsubscribe();
        };
    }, [ably, roomId, user]);

    const updatePresence = async (channel) => {
        try {
            const members = await channel.presence.get();
            setOnlineUsers(
                members.map((m) => ({
                    clientId: m.clientId,
                    username: m.data.username,
                    avatar: m.data.avatar,
                })),
            );
        } catch (e) {
            console.error('Presence error', e);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const drawLineRaw = (x1, y1, x2, y2, color, width, type = 'pen') => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        if (type === 'rect') ctx.rect(x1, y1, x2 - x1, y2 - y1);
        else if (type === 'circle')
            ctx.arc(x1, y1, Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2), 0, 2 * Math.PI);
        else {
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
        ctx.stroke();
    };

    const clearCanvasRaw = () => {
        canvasRef.current?.getContext('2d').clearRect(0, 0, 1200, 800);
        whiteboardChannel?.publish('clear', {});
    };

    const saveToUndo = () => setUndoStack((p) => [...p, canvasRef.current.toDataURL()]);

    const undo = () => {
        if (!undoStack.length) return;
        const current = canvasRef.current.toDataURL();
        const last = undoStack[undoStack.length - 1];
        setUndoStack((p) => p.slice(0, -1));
        setRedoStack((p) => [...p, current]);
        const img = new Image();
        img.src = last;
        img.onload = () => {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, 1200, 800);
            ctx.drawImage(img, 0, 0);
        };
    };

    const redo = () => {
        if (!redoStack.length) return;
        const current = canvasRef.current.toDataURL();
        const next = redoStack[redoStack.length - 1];
        setRedoStack((p) => p.slice(0, -1));
        setUndoStack((p) => [...p, current]);
        const img = new Image();
        img.src = next;
        img.onload = () => {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, 1200, 800);
            ctx.drawImage(img, 0, 0);
        };
    };

    const startDrawing = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (1200 / rect.width);
        const y = (e.clientY - rect.top) * (800 / rect.height);
        lastPosRef.current = { x, y };
        setShapeStart({ x, y });
        saveToUndo();
        setIsDrawing(true);
    };

    const draw = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (1200 / rect.width);
        const y = (e.clientY - rect.top) * (800 / rect.height);
        setChalkPos({ x: e.clientX, y: e.clientY });

        if (!isDrawing) return;

        if (tool === 'pen' || tool === 'eraser') {
            const c = tool === 'eraser' ? '#ffffff' : currentColor;
            const w = tool === 'eraser' ? 30 : lineWidth;
            drawLineRaw(lastPosRef.current.x, lastPosRef.current.y, x, y, c, w, 'pen');
            whiteboardChannel?.publish('draw', {
                x,
                y,
                prevX: lastPosRef.current.x,
                prevY: lastPosRef.current.y,
                color: c,
                width: w,
                type: 'pen',
            });
            lastPosRef.current = { x, y };
        }
    };

    const stopDrawing = (e) => {
        if (!isDrawing) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (1200 / rect.width);
        const y = (e.clientY - rect.top) * (800 / rect.height);

        if (tool === 'rect' || tool === 'circle') {
            drawLineRaw(shapeStart.x, shapeStart.y, x, y, currentColor, lineWidth, tool);
            whiteboardChannel?.publish('draw', {
                x,
                y,
                prevX: shapeStart.x,
                prevY: shapeStart.y,
                color: currentColor,
                width: lineWidth,
                type: tool,
            });
        }
        setIsDrawing(false);
    };

    const handleSendMessage = () => {
        if (!chatMessage.trim()) return;
        const m = {
            username: user?.username,
            content: chatMessage,
            timestamp: new Date().toISOString(),
        };
        chatChannel?.publish('message', m);
        saveMessage({ roomId, message: { content: chatMessage, username: user?.username } });
        setChatMessage('');
        chatChannel?.publish('stop-typing', { username: user?.username });
    };

    const handleTyping = (e) => {
        setChatMessage(e.target.value);
        if (e.target.value.length > 0) {
            chatChannel?.publish('typing', { username: user?.username });
        } else {
            chatChannel?.publish('stop-typing', { username: user?.username });
        }
    };

    const askStudyBuddy = async () => {
        if (!aiQuestion.trim() || isAiThinking) return;
        setIsAiThinking(true);
        setAiAnswer(null);
        try {
            const { data } = await api.post('/ai/chat', {
                message: `As an academic assistant in a study room named "${room?.name}", please answer this student question: ${aiQuestion}`,
                history: [],
            });
            setAiAnswer(data.reply);
        } catch (e) {
            showToast('AI Study Buddy is busy. Try again later.', 'error');
        } finally {
            setIsAiThinking(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingFile(true);
        try {
            const url = await uploadMedia(file);
            const fileData = {
                filename: file.name,
                url,
                username: user?.username,
                type: file.type,
            };
            filesChannel?.publish('file-shared', fileData);
            saveFile({ roomId, fileData: { ...fileData, file_type: file.type } });
            showToast('File shared!', 'success');
        } catch (e) {
            showToast('Failed to upload file', 'error');
        } finally {
            setUploadingFile(false);
        }
    };

    const handleGenerateInviteLink = () => {
        setIsGeneratingInvite(true);
        generateInviteLink(roomId, {
            onSuccess: (data) => {
                setInviteLink(data.invite_link);
                setIsGeneratingInvite(false);
            },
            onError: () => {
                showToast('Failed to generate invite link', 'error');
                setIsGeneratingInvite(false);
            },
        });
    };

    const toggleAudio = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach((t) => (t.enabled = !isAudioEnabled));
            setIsAudioEnabled(!isAudioEnabled);
        } else {
            showToast('Start video to use microphone', 'info');
        }
    };

    const toggleVideo = async () => {
        if (!isVideoEnabled) {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(s);
                setIsVideoEnabled(true);
                setIsAudioEnabled(true);
                if (localVideoRef.current) localVideoRef.current.srcObject = s;
            } catch (e) {
                showToast('Camera access denied', 'error');
            }
        } else {
            localStream?.getTracks().forEach((t) => t.stop());
            setLocalStream(null);
            setIsVideoEnabled(false);
            setIsAudioEnabled(false);
        }
    };

    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
                setScreenStream(s);
                setIsScreenSharing(true);
                if (screenVideoRef.current) screenVideoRef.current.srcObject = s;
                s.getTracks()[0].onended = () => {
                    setIsScreenSharing(false);
                    setScreenStream(null);
                };
            } catch (e) {
                showToast('Screen share failed', 'error');
            }
        } else {
            screenStream?.getTracks().forEach((t) => t.stop());
            setScreenStream(null);
            setIsScreenSharing(false);
        }
    };

    useEffect(() => {
        let int;
        if (isPomodoroActive && pomodoroTime > 0) {
            int = setInterval(() => setPomodoroTime((t) => t - 1), 1000);
        } else if (pomodoroTime === 0) {
            showToast(`${pomodoroMode === 'work' ? 'Break' : 'Work'} time!`, 'info');
            setPomodoroMode((m) => (m === 'work' ? 'break' : 'work'));
            setPomodoroTime(pomodoroMode === 'work' ? 5 * 60 : 25 * 60);
            setIsPomodoroActive(false);
        }
        return () => clearInterval(int);
    }, [isPomodoroActive, pomodoroTime, pomodoroMode, showToast]);

    const formatTime = (s) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;

    return (
        <div className="study-layout">
            <div className="column-card">
                <div className="column-header">
                    <h3>👥 Online Now ({onlineUsers.length})</h3>
                    <button
                        className="btn-icon-small"
                        onClick={() => setShowInviteModal(true)}
                        title="Invite Friends"
                    >
                        <UserPlus size={16} />
                    </button>
                </div>
                <div
                    className="participants-list"
                    style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}
                >
                    {onlineUsers.map((u, i) => (
                        <div
                            key={i}
                            className="participant-item"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                marginBottom: '1rem',
                            }}
                        >
                            <Avatar src={u.avatar} name={u.username} size="sm" />
                            <div className="item-info">
                                <span className="item-title" style={{ fontSize: '0.9rem' }}>
                                    {u.username} {u.username === user?.username && '(You)'}
                                </span>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontSize: '0.7rem',
                                        color: 'var(--study-success)',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: 'currentColor',
                                        }}
                                    />{' '}
                                    Online
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div
                    className="column-header"
                    style={{ borderTop: '1px solid var(--study-glass-border)' }}
                >
                    <h3>📂 Shared Files</h3>
                    <label
                        className="btn-icon-small"
                        style={{ cursor: 'pointer' }}
                        title="Upload File"
                    >
                        {uploadingFile ? (
                            <Loader size={16} className="spin-anim" />
                        ) : (
                            <PlusCircle size={16} />
                        )}
                        <input
                            type="file"
                            hidden
                            onChange={handleFileUpload}
                            disabled={uploadingFile}
                        />
                    </label>
                </div>
                <div className="files-list" style={{ height: '300px', overflowY: 'auto' }}>
                    {sharedFiles.length === 0 ? (
                        <div
                            style={{
                                padding: '2rem',
                                textAlign: 'center',
                                opacity: 0.5,
                                fontSize: '0.8rem',
                            }}
                        >
                            No files shared yet
                        </div>
                    ) : (
                        sharedFiles.map((f, i) => (
                            <div key={i} className="file-card">
                                {f.type?.startsWith('image') && (
                                    <img src={f.url} className="file-preview" alt="" />
                                )}
                                <div className="flex items-center gap-2">
                                    <File size={16} />
                                    <a
                                        href={f.url}
                                        className="item-title truncate flex-1"
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ fontSize: '0.8rem' }}
                                    >
                                        {f.filename}
                                    </a>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="main-content-area">
                <div className="study-header">
                    <div className="room-info-header">
                        <h1>{room?.name}</h1>
                        {room?.subject && (
                            <span className="participants" style={{ marginLeft: '1rem' }}>
                                #{room.subject}
                            </span>
                        )}
                    </div>
                    <div className="room-controls">
                        <button
                            className={`control-btn ${isAudioEnabled ? 'active' : ''}`}
                            onClick={toggleAudio}
                            title={isAudioEnabled ? 'Mute' : 'Unmute'}
                        >
                            {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                        </button>
                        <button
                            className={`control-btn ${isVideoEnabled ? 'active' : ''}`}
                            onClick={toggleVideo}
                            title="Toggle Video"
                        >
                            {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                        </button>
                        <button
                            className={`control-btn ${isScreenSharing ? 'active' : ''}`}
                            onClick={toggleScreenShare}
                            title="Share Screen"
                        >
                            <Monitor size={20} />
                        </button>
                        <button
                            className="control-btn danger"
                            onClick={() => navigate('/study-rooms')}
                            title="Leave Room"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>

                <div
                    className="video-grid"
                    style={{
                        display: isVideoEnabled || isScreenSharing ? 'grid' : 'none',
                        marginBottom: '1.5rem',
                    }}
                >
                    {isVideoEnabled && (
                        <div className="video-tile">
                            <video ref={localVideoRef} autoPlay muted playsInline />
                            <div className="video-label">You</div>
                        </div>
                    )}
                    {isScreenSharing && (
                        <div className="video-tile">
                            <video ref={screenVideoRef} autoPlay playsInline />
                            <div className="video-label">Your Screen</div>
                        </div>
                    )}
                </div>

                <div
                    className="whiteboard-wrapper"
                    onMouseEnter={() => setIsMouseOverCanvas(true)}
                    onMouseLeave={() => setIsMouseOverCanvas(false)}
                >
                    {isMouseOverCanvas && (
                        <div
                            className={`chalk-cursor ${isDrawing ? 'drawing' : ''}`}
                            style={{ left: chalkPos.x, top: chalkPos.y }}
                        >
                            <PenTool
                                size={24}
                                color={tool === 'eraser' ? '#ffffff' : currentColor}
                            />
                        </div>
                    )}
                    <div className="whiteboard-container">
                        <div className="wb-toolbar">
                            <div className="tools-group">
                                <button
                                    className={`wb-tool-btn ${tool === 'pen' ? 'active' : ''}`}
                                    onClick={() => setTool('pen')}
                                    title="Pen"
                                >
                                    <PenTool size={18} />
                                </button>
                                <button
                                    className={`wb-tool-btn ${tool === 'rect' ? 'active' : ''}`}
                                    onClick={() => setTool('rect')}
                                    title="Rectangle"
                                >
                                    <Square size={18} />
                                </button>
                                <button
                                    className={`wb-tool-btn ${tool === 'circle' ? 'active' : ''}`}
                                    onClick={() => setTool('circle')}
                                    title="Circle"
                                >
                                    <Circle size={18} />
                                </button>
                                <button
                                    className={`wb-tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                                    onClick={() => setTool('eraser')}
                                    title="Eraser"
                                >
                                    <Eraser size={18} />
                                </button>
                                <input
                                    type="color"
                                    value={currentColor}
                                    onChange={(e) => setCurrentColor(e.target.value)}
                                    title="Change Color"
                                />
                                <select
                                    value={lineWidth}
                                    onChange={(e) => setLineWidth(Number(e.target.value))}
                                    title="Line Width"
                                >
                                    {[1, 3, 5, 10, 20].map((w) => (
                                        <option key={w} value={w}>
                                            {w}px
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    className="wb-tool-btn"
                                    onClick={undo}
                                    disabled={undoStack.length === 0}
                                    title="Undo"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    className="wb-tool-btn"
                                    onClick={redo}
                                    disabled={redoStack.length === 0}
                                    title="Redo"
                                >
                                    <ChevronRight size={18} />
                                </button>
                                <button
                                    className="wb-tool-btn danger-hover"
                                    onClick={clearCanvasRaw}
                                    title="Clear All"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                        <canvas
                            ref={canvasRef}
                            className="drawing-canvas"
                            width={1200}
                            height={800}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseOut={stopDrawing}
                            style={{
                                width: '100%',
                                height: 'auto',
                                background: '#fff',
                                cursor: 'none',
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="column-card">
                <div
                    className="focus-panel"
                    style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid var(--study-glass-border)',
                    }}
                >
                    <div className="timer-display">
                        <div className="timer-mode">
                            {pomodoroMode === 'work' ? '🔥 Focus Session' : '☕ Break Time'}
                        </div>
                        <div className="timer-time">{formatTime(pomodoroTime)}</div>
                    </div>
                    <div className="timer-controls">
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setIsPomodoroActive(!isPomodoroActive)}
                        >
                            {isPomodoroActive ? 'Pause' : 'Start'}
                        </button>
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                                setPomodoroTime(25 * 60);
                                setIsPomodoroActive(false);
                            }}
                        >
                            Reset
                        </button>
                    </div>

                    <div
                        className="lofi-controls"
                        style={{
                            marginTop: '1rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid var(--study-glass-border)',
                        }}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <Music size={16} />
                                <span style={{ fontSize: '0.8rem' }}>Lofi Radio</span>
                            </div>
                            <button
                                className="btn-icon-small"
                                onClick={() => setIsLofiPlaying(!isLofiPlaying)}
                            >
                                {isLofiPlaying ? (
                                    <Volume2 size={16} />
                                ) : (
                                    <Music size={16} style={{ opacity: 0.5 }} />
                                )}
                            </button>
                        </div>
                        <input
                            type="range"
                            className="volume-slider"
                            min="0"
                            max="1"
                            step="0.1"
                            value={lofiVolume}
                            onChange={(e) => setLofiVolume(parseFloat(e.target.value))}
                        />
                    </div>
                </div>

                <div
                    className="ai-buddy-panel"
                    style={{
                        padding: '1rem',
                        borderBottom: '1px solid var(--study-glass-border)',
                        background: 'rgba(var(--primary), 0.05)',
                    }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Brain size={18} color="var(--primary)" />
                        <h3 style={{ margin: 0, fontSize: '0.9rem' }}>AI Study Buddy</h3>
                    </div>
                    <div
                        className="ai-buddy-content"
                        style={{
                            maxHeight: '150px',
                            overflowY: 'auto',
                            fontSize: '0.8rem',
                            marginBottom: '0.5rem',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '0.75rem',
                            borderRadius: '12px',
                        }}
                    >
                        {isAiThinking ? (
                            <div className="flex items-center gap-2 py-2">
                                <Loader size={14} className="spin-anim" />
                                <span>Thinking...</span>
                            </div>
                        ) : aiAnswer ? (
                            <FormattedText text={aiAnswer} />
                        ) : (
                            <p style={{ opacity: 0.6 }}>Ask me anything about your studies!</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <input
                            className="chat-input"
                            style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                            placeholder="Ask a question..."
                            value={aiQuestion}
                            onChange={(e) => setAiQuestion(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && askStudyBuddy()}
                        />
                        <button
                            className="btn-icon-small"
                            onClick={askStudyBuddy}
                            disabled={isAiThinking}
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </div>

                <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
                    {messages.length === 0 && (
                        <div
                            style={{
                                padding: '2rem',
                                textAlign: 'center',
                                opacity: 0.3,
                                fontSize: '0.8rem',
                            }}
                        >
                            No messages yet
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`chat-bubble ${m.username === user?.username ? 'own' : ''}`}
                        >
                            <div className="chat-name">{m.username}</div>
                            <div className="chat-text">
                                <FormattedText text={m.content} />
                            </div>
                        </div>
                    ))}
                    {typingUsers.size > 0 && (
                        <div
                            className="typing-indicator"
                            style={{ fontSize: '0.7rem', opacity: 0.6, padding: '0.5rem' }}
                        >
                            {Array.from(typingUsers).join(', ')}{' '}
                            {typingUsers.size === 1 ? 'is' : 'are'} typing...
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="chat-input-container">
                    <input
                        className="chat-input"
                        placeholder="Type a message..."
                        value={chatMessage}
                        onChange={handleTyping}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button className="send-btn" onClick={handleSendMessage}>
                        <Send size={18} />
                    </button>
                </div>
            </div>

            {showInviteModal && (
                <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
                    <div
                        className="modal-content premium-modal"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '500px' }}
                    >
                        <div
                            className="modal-header"
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <h2 style={{ color: 'white', margin: 0 }}>Invite Collaborators</h2>
                            <button
                                className="btn-icon-small"
                                onClick={() => setShowInviteModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ color: '#94a3b8', margin: '1rem 0' }}>
                            Share this link with your fellow students to invite them to this study
                            room.
                        </p>

                        {inviteLink ? (
                            <div className="invite-link-container">
                                <div
                                    className="invite-link-box"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        background: '#0f172a',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                    }}
                                >
                                    <span
                                        style={{
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            color: 'var(--study-accent)',
                                        }}
                                    >
                                        {inviteLink}
                                    </span>
                                    <button
                                        className="btn-icon-small"
                                        onClick={() => {
                                            navigator.clipboard.writeText(inviteLink);
                                            showToast('Link copied to clipboard!', 'success');
                                        }}
                                        title="Copy Link"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                                <div
                                    className="invite-tip"
                                    style={{
                                        marginTop: '1rem',
                                        color: 'var(--study-success)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                    }}
                                >
                                    <Check size={16} /> Link generated successfully! Expires in 24
                                    hours.
                                </div>
                            </div>
                        ) : (
                            <button
                                className="btn btn-primary btn-full"
                                onClick={handleGenerateInviteLink}
                                disabled={isGeneratingInvite}
                            >
                                {isGeneratingInvite ? (
                                    <Loader size={20} className="spin-anim" />
                                ) : (
                                    'Generate Invite Link'
                                )}
                            </button>
                        )}

                        <div
                            style={{
                                marginTop: '2rem',
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '12px',
                                fontSize: '0.85rem',
                            }}
                        >
                            <div style={{ display: 'flex', gap: '0.5rem', color: '#94a3b8' }}>
                                <Info size={16} />
                                <span>Note: Only premium members can join study rooms.</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudyRoomsPage;
