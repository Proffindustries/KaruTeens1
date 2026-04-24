import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Send,
    Bot,
    Sparkles,
    BookOpen,
    Brain,
    Zap,
    Loader,
    Copy,
    Check,
    Menu,
    X,
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import FormattedText from '../components/FormattedText';
import '../styles/AiPage.css';

const AiPage = () => {
    const [messages, setMessages] = useState([
        {
            sender: 'ai',
            text: "Hello! I'm your KaruTeens Academic Assistant. I've been optimized with the latest free models to help you study. How can I assist you today?",
        },
    ]);
    const [input, setInput] = useState('');
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const { showToast } = useToast();
    const chatEndRef = useRef(null);

    const fetchModels = useCallback(async () => {
        try {
            const { data } = await api.get('/ai/models');
            setModels(data);
            setSelectedModel(data[0]);
        } catch (err) {
            showToast('Failed to load AI models', 'error');
        }
    }, [showToast]);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedId(index);
        showToast('Copied to clipboard', 'success');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = { sender: 'user', text: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const history = messages.slice(-10).map((m) => ({
                role: m.sender === 'ai' ? 'assistant' : 'user',
                content: m.text,
            }));

            const { data } = await api.post('/ai/chat', {
                message: input,
                model: selectedModel?.id,
                history,
            });

            setMessages((prev) => [
                ...prev,
                {
                    sender: 'ai',
                    text: data.reply,
                    modelUsed: data.model_used,
                },
            ]);

            if (data.model_used && selectedModel && data.model_used !== selectedModel.id) {
                showToast(
                    `Venice was busy, used ${data.model_used.split('/').pop()} instead`,
                    'info',
                );
            }
        } catch (err) {
            showToast(err.response?.data?.error || 'AI Failed to respond', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleTriggerPing = async () => {
        try {
            await api.post('/ai/models/ping');
            showToast('Diagnostic ping started. Status will update shortly.', 'info');
            // Wait a bit then refresh list
            setTimeout(fetchModels, 5000);
        } catch (err) {
            showToast('Failed to trigger diagnostic', 'error');
        }
    };

    return (
        <div className="ai-page-container">
            {/* Sidebar toggle for mobile */}
            <div className={`ai-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="ai-brand">
                    <Sparkles size={24} color="var(--primary)" />
                    <h2>Karu AI</h2>
                    <button
                        className="mobile-menu-toggle"
                        onClick={() => setIsSidebarOpen(false)}
                        style={{ marginLeft: 'auto' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div
                    className="ai-academic-tips card"
                    style={{ margin: '1rem', background: '#333' }}
                >
                    <h3
                        style={{
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}
                    >
                        <BookOpen size={16} /> Study Tips
                    </h3>
                    <ul style={{ fontSize: '0.8rem', paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
                        <li>Get point-by-point summaries</li>
                        <li>Ask for step-by-step math help</li>
                        <li>Explain exam concepts</li>
                    </ul>
                </div>

                <div className="history-list">
                    <div
                        className="history-label"
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <span>Select Model</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleTriggerPing();
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                            }}
                        >
                            <Zap size={10} style={{ marginRight: '2px' }} />
                            Refresh Status
                        </button>
                    </div>
                    {models.map((m) => (
                        <div
                            key={m.id}
                            className={`history-item ${selectedModel?.id === m.id ? 'active' : ''}`}
                            onClick={() => {
                                setSelectedModel(m);
                                setIsSidebarOpen(false);
                            }}
                        >
                            <div
                                style={{ display: 'flex', flexDirection: 'column', width: '100%' }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                        {m.name || m.id.split('/').pop()}
                                    </span>
                                    <div
                                        className={`status-dot ${m.health?.status || 'unknown'}`}
                                    ></div>
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '0.7rem',
                                        opacity: 0.6,
                                    }}
                                >
                                    <span>Free Tier</span>
                                    {m.health?.latency && (
                                        <span>{m.health.latency.toFixed(1)}s</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="ai-chat-area">
                <header className="ai-chat-header">
                    <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(true)}>
                        <Menu size={24} />
                    </button>

                    <div className="current-model-info">
                        <span>Current Active Model</span>
                        <span>{selectedModel?.name || 'Loading...'}</span>
                    </div>

                    <div className="header-status">
                        <div className="status-dot"></div>
                        <span style={{ fontSize: '0.75rem', color: '#666' }}>Online</span>
                    </div>
                </header>

                <div className="ai-chat-feed">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`ai-message ${msg.sender}`}>
                            <div className="ai-avatar">
                                {msg.sender === 'ai' ? (
                                    <Bot size={22} />
                                ) : (
                                    <div className="user-initial">U</div>
                                )}
                            </div>
                            <div className="ai-bubble shadow-sm">
                                <FormattedText text={msg.text} />
                                {msg.sender === 'ai' && (
                                    <button
                                        className="copy-btn"
                                        onClick={() => handleCopy(msg.text, idx)}
                                    >
                                        {copiedId === idx ? (
                                            <Check size={14} />
                                        ) : (
                                            <Copy size={14} />
                                        )}
                                        {copiedId === idx ? 'Copied' : 'Copy'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="ai-message ai">
                            <div className="ai-avatar">
                                <Loader className="animate-spin" size={20} />
                            </div>
                            <div className="ai-bubble thinking">
                                <span className="dot-pulse"></span>
                                Generating academic response...
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="ai-input-wrapper">
                    <div className="ai-input-box">
                        <input
                            type="text"
                            placeholder={`Ask ${selectedModel?.name || 'Academic AI'} a question...`}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            disabled={loading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                            className="send-btn"
                        >
                            {loading ? (
                                <Loader className="animate-spin" size={18} />
                            ) : (
                                <Send size={18} />
                            )}
                        </button>
                    </div>
                    <p className="ai-disclaimer">
                        Privacy First: Your chats are encrypted. AI can make mistakes.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AiPage;
