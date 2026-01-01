import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Mic, Video, Monitor, MessageSquare, Users, Trash2, PlusCircle, LogOut, Loader } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/StudyRoomsPage.css';
import { useStudyRooms, useCreateRoom, useJoinRoom, useLeaveRoom, useStudyRoom } from '../hooks/useStudyRooms';
import { useAbly } from '../context/AblyContext';
import { useToast } from '../context/ToastContext';
import PremiumGate from '../components/PremiumGate';

const StudyRoomsPage = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const { showToast } = useToast();

    // Check premium status
    if (!user.is_premium && user.role !== 'premium') {
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
    const navigate = useNavigate();
    const { showToast } = useToast();

    const handleCreateRoom = () => {
        if (!roomName.trim()) {
            showToast('Please enter a room name', 'error');
            return;
        }

        createRoom({ name: roomName }, {
            onSuccess: (data) => {
                showToast('Room created!', 'success');
                setShowCreateModal(false);
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
                    <h1>Study Rooms</h1>
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
                                <div className="room-info">
                                    <span className="participants-count">
                                        <Users size={16} /> {room.participant_count}/{room.max_participants}
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
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>Create Study Room</h3>
                            <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Room Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Calculus 101 Revision"
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
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
    const [isDrawing, setIsDrawing] = useState(false);
    const { data: room } = useStudyRoom(roomId);
    const { mutate: leaveRoom } = useLeaveRoom();
    const navigate = useNavigate();
    const { client: ablyClient } = useAbly();
    const [whiteboardChannel, setWhiteboardChannel] = useState(null);
    const { showToast } = useToast();

    // Initialize Ably whiteboard channel
    useEffect(() => {
        if (!ablyClient || !roomId) return;

        const channelName = `study-room:${roomId}:whiteboard`;
        const channel = ablyClient.channels.get(channelName);

        channel.subscribe('draw', (message) => {
            const { x, y, prevX, prevY, color, width } = message.data;
            drawLine(prevX, prevY, x, y, color, width);
        });

        channel.subscribe('clear', () => {
            clearCanvas();
        });

        setWhiteboardChannel(channel);

        return () => {
            channel.unsubscribe();
        };
    }, [ablyClient, roomId]);

    // Canvas setup
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
    }, []);

    const drawLine = (x1, y1, x2, y2, color = '#000', width = 3) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    };

    let lastX = 0;
    let lastY = 0;

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Draw locally
        drawLine(lastX, lastY, x, y);

        // Publish to Ably
        if (whiteboardChannel) {
            whiteboardChannel.publish('draw', {
                x, y,
                prevX: lastX,
                prevY: lastY,
                color: '#000',
                width: 3
            });
        }

        lastX = x;
        lastY = y;
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleClearCanvas = () => {
        clearCanvas();
        // Broadcast clear to all participants
        if (whiteboardChannel) {
            whiteboardChannel.publish('clear', {});
        }
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
        <div className="container study-rooms-page">
            <div className="study-header">
                <div className="room-info">
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
                    <button className="btn btn-danger" onClick={handleLeaveRoom}>
                        <LogOut size={18} /> Leave
                    </button>
                </div>
            </div>

            <div className="study-grid-layout">
                {/* Whiteboard Area */}
                <div className="whiteboard-container card">
                    <div className="wb-toolbar">
                        <strong>Shared Whiteboard</strong>
                        <div className="tools">
                            <button className="tool-btn active">
                                <PenTool size={16} />
                            </button>
                            <button className="tool-btn" onClick={handleClearCanvas}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                    <canvas
                        ref={canvasRef}
                        width={800}
                        height={500}
                        className="drawing-canvas"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                    />
                    <div className="canvas-tip">
                        <p><strong>Pro Tip:</strong> All participants can see your drawings in real-time!</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudyRoomsPage;
