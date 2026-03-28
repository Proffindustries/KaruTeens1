import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Plus,
    Play,
    Users,
    BookOpen,
    Video,
    FileText,
    Link as LinkIcon,
    X,
    Lock,
    Globe,
    Trash2,
    UserPlus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import Avatar from '../components/Avatar';
import '../styles/StudyPlaylistsPage.css';

const StudyPlaylistsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { showToast } = useToast();
    const [playlists, setPlaylists] = useState([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [subjectFilter, setSubjectFilter] = useState('');

    const subjects = [
        'Mathematics',
        'Physics',
        'Chemistry',
        'Biology',
        'Computer Science',
        'Literature',
        'History',
        'Economics',
        'Other',
    ];

    useEffect(() => {
        fetchPlaylists();
    }, [subjectFilter]);

    const fetchPlaylists = async () => {
        try {
            setLoading(true);
            const params = subjectFilter ? { subject: subjectFilter } : {};
            const { data } = await api.get('/api/playlists', { params });
            setPlaylists(data);
        } catch (err) {
            showToast('Failed to load playlists', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchPlaylistDetails = async (playlistId) => {
        try {
            const { data } = await api.get(`/api/playlists/${playlistId}`);
            setSelectedPlaylist(data);
        } catch (err) {
            showToast('Failed to load playlist details', 'error');
        }
    };

    const handleCreatePlaylist = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await api.post('/api/playlists', {
                name: formData.get('name'),
                description: formData.get('description'),
                is_public: formData.get('is_public') === 'on',
                subject: formData.get('subject'),
            });
            showToast('Playlist created!', 'success');
            setShowCreateModal(false);
            fetchPlaylists();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to create playlist', 'error');
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await api.post(`/api/playlists/${selectedPlaylist.id}/items`, {
                item_type: formData.get('item_type'),
                title: formData.get('title'),
                url: formData.get('url'),
                duration_minutes: formData.get('duration_minutes')
                    ? parseInt(formData.get('duration_minutes'))
                    : null,
            });
            showToast('Item added!', 'success');
            setShowAddItemModal(false);
            fetchPlaylistDetails(selectedPlaylist.id);
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to add item', 'error');
        }
    };

    const handleAddCollaborator = async (username) => {
        try {
            await api.post(`/api/playlists/${selectedPlaylist.id}/collaborators/${username}`);
            showToast('Collaborator added!', 'success');
            fetchPlaylistDetails(selectedPlaylist.id);
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to add collaborator', 'error');
        }
    };

    const getItemIcon = (type) => {
        switch (type) {
            case 'video':
                return <Video size={16} />;
            case 'document':
                return <FileText size={16} />;
            case 'link':
                return <LinkIcon size={16} />;
            default:
                return <BookOpen size={16} />;
        }
    };

    return (
        <div className="playlists-page">
            <div className="playlists-header">
                <h1>📚 Study Playlists</h1>
                <p>Create and share collaborative study playlists with other students</p>
            </div>

            <div className="playlists-toolbar">
                <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="subject-filter"
                >
                    <option value="">All Subjects</option>
                    {subjects.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={18} /> Create Playlist
                </button>
            </div>

            {loading ? (
                <div className="loading">Loading playlists...</div>
            ) : playlists.length === 0 ? (
                <div className="empty-state">
                    <BookOpen size={48} />
                    <h3>No playlists yet</h3>
                    <p>Create your first study playlist to get started!</p>
                </div>
            ) : (
                <div className="playlists-grid">
                    {playlists.map((playlist) => (
                        <motion.div
                            key={playlist.id}
                            className="playlist-card"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => fetchPlaylistDetails(playlist.id)}
                        >
                            <div className="playlist-card-header">
                                <h3>{playlist.name}</h3>
                                {playlist.is_public ? <Globe size={16} /> : <Lock size={16} />}
                            </div>
                            <p className="playlist-subject">{playlist.subject}</p>
                            {playlist.description && (
                                <p className="playlist-desc">{playlist.description}</p>
                            )}
                            <div className="playlist-stats">
                                <span>
                                    <BookOpen size={14} /> {playlist.items_count} items
                                </span>
                                <span>
                                    <Users size={14} /> {playlist.collaborators_count} collaborators
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            className="modal-content"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h3>Create Study Playlist</h3>
                                <button onClick={() => setShowCreateModal(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleCreatePlaylist}>
                                <div className="form-group">
                                    <label>Playlist Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        placeholder="e.g., CS101 Finals Prep"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Subject</label>
                                    <select name="subject" required>
                                        {subjects.map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Description (optional)</label>
                                    <textarea
                                        name="description"
                                        placeholder="What's this playlist about?"
                                    />
                                </div>
                                <div className="form-group checkbox">
                                    <label>
                                        <input type="checkbox" name="is_public" />
                                        Make playlist public
                                    </label>
                                </div>
                                <button type="submit" className="btn btn-primary btn-full">
                                    Create Playlist
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedPlaylist && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedPlaylist(null)}
                    >
                        <motion.div
                            className="modal-content playlist-detail-modal"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h3>{selectedPlaylist.name}</h3>
                                <button onClick={() => setSelectedPlaylist(null)}>
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="playlist-detail-info">
                                <span className="subject-tag">{selectedPlaylist.subject}</span>
                                {selectedPlaylist.description && (
                                    <p>{selectedPlaylist.description}</p>
                                )}
                            </div>

                            <div className="playlist-items">
                                <div className="items-header">
                                    <h4>Study Materials ({selectedPlaylist.items?.length || 0})</h4>
                                    <button
                                        className="btn btn-sm"
                                        onClick={() => setShowAddItemModal(true)}
                                    >
                                        <Plus size={14} /> Add Item
                                    </button>
                                </div>
                                {selectedPlaylist.items?.length === 0 ? (
                                    <p className="empty-items">
                                        No items yet. Add some study materials!
                                    </p>
                                ) : (
                                    <ul className="items-list">
                                        {selectedPlaylist.items.map((item, idx) => (
                                            <li key={idx} className="playlist-item">
                                                <div className="item-icon">
                                                    {getItemIcon(item.item_type)}
                                                </div>
                                                <div className="item-info">
                                                    <a
                                                        href={item.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {item.title}
                                                    </a>
                                                    {item.duration_minutes && (
                                                        <span className="duration">
                                                            {item.duration_minutes} min
                                                        </span>
                                                    )}
                                                </div>
                                                <a
                                                    href={item.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="play-btn"
                                                >
                                                    <Play size={16} />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="collaborators-section">
                                <h4>
                                    Collaborators ({selectedPlaylist.collaborators?.length || 0})
                                </h4>
                                <div className="add-collaborator">
                                    <input
                                        type="text"
                                        placeholder="Add collaborator by username"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddCollaborator(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <UserPlus size={18} />
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showAddItemModal && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowAddItemModal(false)}
                    >
                        <motion.div
                            className="modal-content"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h3>Add Study Material</h3>
                                <button onClick={() => setShowAddItemModal(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleAddItem}>
                                <div className="form-group">
                                    <label>Type</label>
                                    <select name="item_type" required>
                                        <option value="video">Video</option>
                                        <option value="document">Document</option>
                                        <option value="link">Link</option>
                                        <option value="note">Note</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Title</label>
                                    <input
                                        type="text"
                                        name="title"
                                        required
                                        placeholder="e.g., Lecture 1: Introduction"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>URL</label>
                                    <input
                                        type="url"
                                        name="url"
                                        required
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Duration (minutes, optional)</label>
                                    <input
                                        type="number"
                                        name="duration_minutes"
                                        min="1"
                                        placeholder="e.g., 45"
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary btn-full">
                                    Add Item
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudyPlaylistsPage;
