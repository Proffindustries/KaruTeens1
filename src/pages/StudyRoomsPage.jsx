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
} from '../hooks/useStudyRooms';
import { useAbly } from '../context/AblyContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { useMediaUpload } from '../hooks/useMedia';
import PremiumGate from '../components/PremiumGate';
import Avatar from '../components/Avatar';

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
                navigate(`/study-rooms/${data.id}`);
            },
            onError: (err) => showToast(err.response?.data?.error || 'Failed to create room', 'error'),
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
                <div className="loading-state"><Loader size={48} className="spin-anim" /></div>
            ) : (
                <div className="rooms-grid">
                    {rooms?.map((room) => (
                        <div key={room.id} className="room-card card">
                            <div className="room-card-header">
                                <h3>{room.name}</h3>
                                <span className="live-badge">LIVE</span>
                            </div>
                            <div className="room-info">
                                <span className="participants-count"><Users size={16} /> {room.participant_count}/{room.max_participants}</span>
                            </div>
                            <button className="btn btn-outline btn-full" onClick={() => navigate(`/study-rooms/${room.id}`)}>Join Room</button>
                        </div>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="modal-header"><h3>Create Study Room</h3></div>
                        <div className="modal-body">
                            <input className="form-input mb-4" placeholder="Room Name" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
                            <button className="btn btn-primary btn-full" onClick={handleCreateRoom}>Create</button>
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
    const { uploadFile } = useMediaUpload();
    
    const { data: room } = useStudyRoom(roomId);
    const { data: history } = useRoomHistory(roomId);
    const { mutate: saveMessage } = useSaveRoomMessage();
    const { mutate: saveFile } = useSaveRoomFile();
    const { mutate: leaveRoom } = useLeaveRoom();
    const { mutate: generateInviteLink } = useGenerateInviteLink();
    const { mutate: removeUser } = useRemoveUser();

    const canvasRef = useRef(null);
    const chatEndRef = useRef(null);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const localVideoRef = useRef(null);
    const screenVideoRef = useRef(null);
    const lofiAudioRef = useRef(new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'));

    const [isDrawing, setIsDrawing] = useState(false);
    const [currentColor, setCurrentColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(3);
    const [tool, setTool] = useState('pen');
    const [chatMessage, setChatMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [sharedFiles, setSharedFiles] = useState([]);
    
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
    const [typingUsers, setTypingUsers] = useState(new Set());
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [userToRemove, setUserToRemove] = useState(null);

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

    const [whiteboardChannel, setWhiteboardChannel] = useState(null);
    const [chatChannel, setChatChannel] = useState(null);
    const [filesChannel, setFilesChannel] = useState(null);

    useEffect(() => {
        if (!ably || !roomId) return;
        const wb = ably.channels.get(`study-room:${roomId}:whiteboard`);
        wb.subscribe('draw', (msg) => {
            const { x, y, prevX, prevY, color, width, type } = msg.data;
            drawLineRaw(prevX, prevY, x, y, color, width, type);
        });
        wb.subscribe('clear', () => clearCanvasRaw());
        setWhiteboardChannel(wb);

        const chat = ably.channels.get(`study-room:${roomId}:chat`);
        chat.subscribe('message', (msg) => setMessages(p => [...p, msg.data]));
        chat.subscribe('typing', (msg) => setTypingUsers(p => new Set([...p, msg.data.username])));
        chat.subscribe('stop-typing', (msg) => setTypingUsers(p => {const n=new Set(p); n.delete(msg.data.username); return n;}));
        setChatChannel(chat);

        const files = ably.channels.get(`study-room:${roomId}:files`);
        files.subscribe('file-shared', (msg) => {
            setSharedFiles(p => (p.some(f=>f.url===msg.data.url)?p:[...p, msg.data]));
        });
        setFilesChannel(files);

        return () => { wb.unsubscribe(); chat.unsubscribe(); files.unsubscribe(); };
    }, [ably, roomId]);

    const drawLineRaw = (x1, y1, x2, y2, color, width, type = 'pen') => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        if (type === 'rect') ctx.rect(x1, y1, x2 - x1, y2 - y1);
        else if (type === 'circle') ctx.arc(x1, y1, Math.sqrt((x2-x1)**2 + (y2-y1)**2), 0, 2*Math.PI);
        else { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
        ctx.stroke();
    };

    const clearCanvasRaw = () => canvasRef.current?.getContext('2d').clearRect(0,0,1200,800);
    const saveToUndo = () => setUndoStack(p => [...p, canvasRef.current.toDataURL()]);
    const undo = () => {
        if (!undoStack.length) return;
        const last = undoStack.pop();
        setRedoStack(p => [...p, canvasRef.current.toDataURL()]);
        const img = new Image(); img.src = last; img.onload = () => { clearCanvasRaw(); canvasRef.current.getContext('2d').drawImage(img,0,0); };
    };
    const redo = () => {
        if (!redoStack.length) return;
        const next = redoStack.pop();
        setUndoStack(p => [...p, canvasRef.current.toDataURL()]);
        const img = new Image(); img.src = next; img.onload = () => { clearCanvasRaw(); canvasRef.current.getContext('2d').drawImage(img,0,0); };
    };

    const startDrawing = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        lastPosRef.current = { x, y }; setShapeStart({ x, y }); saveToUndo(); setIsDrawing(true);
    };

    const draw = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        setChalkPos({ x: e.clientX, y: e.clientY });
        if (!isDrawing) return;
        if (tool === 'pen' || tool === 'eraser') {
            const c = tool === 'eraser' ? '#ffffff' : currentColor;
            const w = tool === 'eraser' ? 30 : lineWidth;
            drawLineRaw(lastPosRef.current.x, lastPosRef.current.y, x, y, c, w, 'pen');
            whiteboardChannel?.publish('draw', { x, y, prevX: lastPosRef.current.x, prevY: lastPosRef.current.y, color: c, width: w, type: 'pen' });
            lastPosRef.current = { x, y };
        }
    };

    const stopDrawing = (e) => {
        if (!isDrawing) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        if (tool === 'rect' || tool === 'circle') {
            drawLineRaw(shapeStart.x, shapeStart.y, x, y, currentColor, lineWidth, tool);
            whiteboardChannel?.publish('draw', { x, y, prevX: shapeStart.x, prevY: shapeStart.y, color: currentColor, width: lineWidth, type: tool });
        }
        setIsDrawing(false);
    };

    useEffect(() => {
        let int; if (isPomodoroActive && pomodoroTime > 0) int = setInterval(() => setPomodoroTime(t => t - 1), 1000);
        return () => clearInterval(int);
    }, [isPomodoroActive, pomodoroTime]);

    const formatTime = (s) => `${Math.floor(s/60)}:${s%60<10?'0':''}${s%60}`;
    
    useEffect(() => {
        const a = lofiAudioRef.current; a.loop = true; a.volume = lofiVolume;
        if (isLofiPlaying) a.play().catch(() => setIsLofiPlaying(false)); else a.pause();
    }, [isLofiPlaying, lofiVolume]);

    const handleSendMessage = () => {
        if (!chatMessage.trim()) return;
        const m = { username: user?.username, content: chatMessage, timestamp: new Date().toISOString() };
        chatChannel?.publish('message', m); 
        saveMessage({ roomId, message: { content: chatMessage, username: user?.username } });
        setChatMessage('');
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        setUploadingFile(true); try {
            const url = await uploadFile(file);
            const fileData = { filename: file.name, url, username: user?.username, type: file.type };
            filesChannel?.publish('file-shared', fileData);
            saveFile({ roomId, fileData: { ...fileData, file_type: file.type } });
            showToast('File shared!', 'success');
        } catch (e) { showToast('Failed', 'error'); } finally { setUploadingFile(false); }
    };

    const toggleAudio = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(t => t.enabled = !isAudioEnabled);
            setIsAudioEnabled(!isAudioEnabled);
        } else {
            showToast('Start video to use microphone', 'info');
        }
    };

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, isVideoEnabled]);

    useEffect(() => {
        if (screenVideoRef.current && screenStream) {
            screenVideoRef.current.srcObject = screenStream;
        }
    }, [screenStream, isScreenSharing]);

    const toggleVideo = async () => {
        if (!isVideoEnabled) {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(s); 
                setIsVideoEnabled(true);
                setIsAudioEnabled(true);
            } catch (e) { showToast('Camera access denied', 'error'); }
        } else { 
            localStream?.getTracks().forEach(t => t.stop()); 
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
            } catch (e) { showToast('Screen share failed', 'error'); }
        } else { 
            screenStream?.getTracks().forEach(t => t.stop()); 
            setScreenStream(null); 
            setIsScreenSharing(false); 
        }
    };

    return (
        <div className="study-layout">
            <div className="column-card">
                <div className="column-header">
                    <h3>👥 Participants ({room?.participant_count || 0})</h3>
                    <button className="btn-icon-small" onClick={() => setShowInviteModal(true)}><UserPlus size={16} /></button>
                </div>
                <div className="participants-list" style={{ flex: 1, overflowY: 'auto' }}>
                    <div className="participant-item">
                        <Avatar src={user?.avatar_url} name={user?.username} size="sm" />
                        <div className="item-info"><span className="item-title">{user?.username} (You)</span></div>
                    </div>
                </div>
                <div className="column-header" style={{ borderTop: '1px solid var(--study-glass-border)' }}>
                    <h3>📂 Shared Files</h3>
                    <label className="btn-icon-small" style={{ cursor: 'pointer' }}><PlusCircle size={16} /><input type="file" hidden onChange={handleFileUpload} /></label>
                </div>
                <div className="files-list" style={{ height: '300px', overflowY: 'auto' }}>
                    {sharedFiles.map((f, i) => (
                        <div key={i} className="file-card">
                            {f.type?.startsWith('image') && <img src={f.url} className="file-preview" alt="" />}
                            <div className="flex items-center gap-2">
                                <File size={16} /><a href={f.url} className="item-title truncate flex-1" target="_blank" rel="noreferrer">{f.filename}</a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="main-content-area">
                <div className="study-header">
                    <div className="room-info-header"><h1>{room?.name}</h1></div>
                    <div className="room-controls">
                        <button 
                            className={`control-btn ${isAudioEnabled ? 'active' : ''}`} 
                            onClick={toggleAudio}
                            title={isAudioEnabled ? "Mute" : "Unmute"}
                        >
                            {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                        </button>
                        <button className={`control-btn ${isVideoEnabled ? 'active' : ''}`} onClick={toggleVideo}><Video size={20} /></button>
                        <button className={`control-btn ${isScreenSharing ? 'active' : ''}`} onClick={toggleScreenShare}><Monitor size={20} /></button>
                        <button className="control-btn danger" onClick={() => navigate('/study-rooms')}><LogOut size={20} /></button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isVideoEnabled && <div className="video-tile"><video ref={localVideoRef} autoPlay muted playsInline /><div className="video-label">You</div></div>}
                    {isScreenSharing && <div className="video-tile"><video ref={screenVideoRef} autoPlay playsInline /><div className="video-label">Screen</div></div>}
                </div>

                <div className="whiteboard-wrapper" onMouseEnter={() => setIsMouseOverCanvas(true)} onMouseLeave={() => setIsMouseOverCanvas(false)}>
                    {isMouseOverCanvas && (
                        <div className={`chalk-cursor ${isDrawing?'drawing':''}`} style={{ left: chalkPos.x, top: chalkPos.y }}>
                            <PenTool size={24} color={currentColor} />
                        </div>
                    )}
                    <div className="whiteboard-container">
                        <div className="wb-toolbar">
                            <div className="tools-group">
                                <button className={`wb-tool-btn ${tool==='pen'?'active':''}`} onClick={()=>setTool('pen')}><PenTool size={18} /></button>
                                <button className={`wb-tool-btn ${tool==='rect'?'active':''}`} onClick={()=>setTool('rect')}><Square size={18} /></button>
                                <button className={`wb-tool-btn ${tool==='circle'?'active':''}`} onClick={()=>setTool('circle')}><Circle size={18} /></button>
                                <button className={`wb-tool-btn ${tool==='eraser'?'active':''}`} onClick={()=>setTool('eraser')}><Eraser size={18} /></button>
                                <input type="color" value={currentColor} onChange={e=>setCurrentColor(e.target.value)} />
                                <select value={lineWidth} onChange={e=>setLineWidth(Number(e.target.value))}>
                                    {[1,3,5,10].map(w=><option key={w} value={w}>{w}px</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button className="wb-tool-btn" onClick={undo}><ChevronLeft size={18} /></button>
                                <button className="wb-tool-btn" onClick={redo}><ChevronRight size={18} /></button>
                                <button className="wb-tool-btn" onClick={clearCanvasRaw}><Trash2 size={18} /></button>
                            </div>
                        </div>
                        <canvas ref={canvasRef} className="drawing-canvas" width={1200} height={800} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing} />
                    </div>
                </div>
            </div>

            <div className="column-card">
                <div className="focus-panel">
                    <div className="timer-display"><div className="timer-time">{formatTime(pomodoroTime)}</div></div>
                    <div className="timer-controls">
                        <button className="btn btn-primary btn-sm" onClick={()=>setIsPomodoroActive(!isPomodoroActive)}>{isPomodoroActive?'Pause':'Start'}</button>
                        <button className="btn btn-outline btn-sm" onClick={()=>setPomodoroTime(25*60)}>Reset</button>
                    </div>
                    <div className="lofi-controls">
                        <div className="lofi-header"><span>Music</span><button onClick={()=>setIsLofiPlaying(!isLofiPlaying)}>{isLofiPlaying?'Mute':'Play'}</button></div>
                        <input type="range" min="0" max="1" step="0.01" value={lofiVolume} onChange={e=>setLofiVolume(e.target.value)} />
                    </div>
                </div>
                <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
                    {messages.map((m, i) => (
                        <div key={i} className={`chat-bubble ${m.username===user?.username?'own':''}`}>
                            <div className="chat-name">{m.username}</div><div className="chat-text">{m.content}</div>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
                <div className="chat-input-container">
                    <input className="chat-input" value={chatMessage} onChange={e=>setChatMessage(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleSendMessage()} />
                    <button className="send-btn" onClick={handleSendMessage}><Send size={18} /></button>
                </div>
            </div>

            {showInviteModal && (
                <div className="modal-overlay" onClick={()=>setShowInviteModal(false)}>
                    <div className="modal-content premium-modal" onClick={e=>e.stopPropagation()}>
                        <h2>Invite</h2><div className="invite-link-box">{inviteLink}</div>
                        <button className="btn btn-primary" onClick={handleGenerateInviteLink}>Get Link</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudyRoomsPage;
