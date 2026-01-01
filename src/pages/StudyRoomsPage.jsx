import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PenTool, Mic, Video, Monitor, MessageSquare, Users, Trash2, PlusCircle, LogOut, Loader, Send, Eraser, X } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/StudyRoomsPage.css';
import { useStudyRooms, useCreateRoom, useJoinRoom, useLeaveRoom, useStudyRoom } from '../hooks/useStudyRooms';
import { useAbly } from '../context/AblyContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
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

    const [isDrawing, setIsDrawing] = useState(false);
    const [currentColor, setCurrentColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(3);
    const [tool, setTool] = useState('pen');
    const [chatMessage, setChatMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [showChat, setShowChat] = useState(true);

    const { data: room } = useStudyRoom(roomId);
    const { mutate: leaveRoom } = useLeaveRoom();
    const navigate = useNavigate();
    const { ably } = useAbly();
    const [whiteboardChannel, setWhiteboardChannel] = useState(null);
    const [chatChannel, setChatChannel] = useState(null);
    const { showToast } = useToast();
    const { user } = useAuth();

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

        setChatChannel(cChannel);

        return () => {
            wbChannel.unsubscribe();
            cChannel.unsubscribe();
        };
    }, [ably, roomId, drawLine, clearCanvas]);

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

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        lastPosRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
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

    const handleClearCanvas = () => {
        clearCanvas();
        if (whiteboardChannel) {
            whiteboardChannel.publish('clear', {});
        }
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
    };

    const handleLeaveRoom = () => {
        leaveRoom(roomId, {
            onSuccess: () => {
                showToast('Left room', 'info');
                navigate('/study-rooms');
            }
        });
    };

    return (
        <div className="study-rooms-page">
            <div className="study-header">
                <div className="room-info-header">
                    <h1>{room?.name || 'Loading...'}</h1>
                    <span className="live-badge">LIVE</span>
                    <span className="participants">
                        <Users size={16} /> {room?.participant_count || 0} Participants
                    </span>
                </div>
                <div className="room-controls">
                    <button className="control-btn" title="Mic (Coming Soon)" disabled>
                        <Mic size={20} />
                    </button>
                    <button className="control-btn" title="Video (Coming Soon)" disabled>
                        <Video size={20} />
                    </button>
                    <button className="control-btn" title="Screen Share (Coming Soon)" disabled>
                        <Monitor size={20} />
                    </button>
                    <button
                        className={`control-btn ${showChat ? 'active' : ''}`}
                        onClick={() => setShowChat(!showChat)}
                        title="Toggle Chat"
                    >
                        <MessageSquare size={20} />
                    </button>
                    <button className="btn btn-danger" onClick={handleLeaveRoom}>
                        <LogOut size={18} /> Leave
                    </button>
                </div>
            </div>

            <div className="study-grid-layout">
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
                            <button className="tool-btn" onClick={handleClearCanvas} title="Clear All">
                                <Trash2 size={16} />
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
                            <div ref={chatEndRef} />
                        </div>
                        <div className="chat-input-container">
                            <input
                                type="text"
                                className="chat-input"
                                placeholder="Type a message..."
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
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
            </div>
        </div>
    );
};

export default StudyRoomsPage;
