import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Flag } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import '../styles/ConfessionsPage.css';

const ConfessionsPage = () => {
    const [confessions, setConfessions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadConfessions = async () => {
            setIsLoading(true);
            try {
                const { data } = await api.get('/confessions');
                setConfessions(data);
            } catch (error) {
                console.error('Failed to load confessions:', error);
                setConfessions([]); // Empty state on error
            } finally {
                setIsLoading(false);
            }
        };

        loadConfessions();
    }, []); // Empty deps for initial load only
    const [newConfession, setNewConfession] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(true);

    const handlePost = () => {
        if (!newConfession.trim()) return;

        const confession = {
            id: Date.now(),
            content: newConfession,
            likes: 0,
            comments: 0,
            isAnonymous,
            timestamp: 'Just now',
            username: isAnonymous
                ? null
                : JSON.parse(localStorage.getItem('user') || '{}').username,
        };

        setConfessions([confession, ...confessions]);
        setNewConfession('');
    };

    const handleLike = (id) => {
        setConfessions(confessions.map((c) => (c.id === id ? { ...c, likes: c.likes + 1 } : c)));
    };

    return (
        <div className="container confessions-page">
            <div className="confessions-header">
                <h1>🔮 Campus Confessions</h1>
                <p>Share anonymously. No judgment. No holds barred.</p>
            </div>

            {/* Create Confession */}
            <div className="create-confession card">
                <div className="create-header">
                    <Avatar src={null} name={isAnonymous ? 'Anonymous' : 'You'} size="md" />
                    <div className="anonymous-toggle">
                        <input
                            type="checkbox"
                            id="anon"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                        />
                        <label htmlFor="anon">
                            <span>🔒</span> Post anonymously
                        </label>
                    </div>
                </div>
                <textarea
                    placeholder="What's your confession? (Your identity will be hidden)"
                    value={newConfession}
                    onChange={(e) => setNewConfession(e.target.value)}
                    rows={3}
                />
                <div className="create-actions">
                    <span className="char-count">{newConfession.length}/280</span>
                    <button
                        className="btn btn-primary"
                        onClick={handlePost}
                        disabled={!newConfession.trim()}
                    >
                        <span>📤</span> Post
                    </button>
                </div>
            </div>

            {/* Rules Banner */}
            <div className="rules-banner">
                <span>📜</span>
                <p>Keep it clean, kind, and anonymous. No hate speech or harassment.</p>
            </div>

            {/* Confessions Feed */}
            <div className="confessions-feed">
                {confessions.map((confession) => (
                    <div key={confession.id} className="confession-card card">
                        <div className="confession-header">
                            <div className="confession-author">
                                <Avatar
                                    src={null}
                                    name={
                                        confession.isAnonymous ? 'Anonymous' : confession.username
                                    }
                                    size="sm"
                                />
                                <div className="author-info">
                                    <span className="author-name">
                                        {confession.isAnonymous
                                            ? 'Anonymous'
                                            : `@${confession.username}`}
                                    </span>
                                    <span className="timestamp">{confession.timestamp}</span>
                                </div>
                            </div>
                            {confession.isAnonymous && <span className="anon-badge">🔮</span>}
                        </div>

                        <p className="confession-content">{confession.content}</p>

                        <div className="confession-actions">
                            <button
                                className="action-btn"
                                onClick={() => handleLike(confession.id)}
                            >
                                <Heart size={18} />
                                <span>{confession.likes}</span>
                            </button>
                            <button className="action-btn">
                                <MessageCircle size={18} />
                                <span>{confession.comments}</span>
                            </button>
                            <button className="action-btn">
                                <Share2 size={18} />
                                <span>Share</span>
                            </button>
                            <button className="action-btn report">
                                <Flag size={18} />
                                <span>Report</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ConfessionsPage;
