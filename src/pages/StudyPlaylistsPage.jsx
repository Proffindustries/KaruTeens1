import React, { useState, useEffect, useCallback } from 'react';
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
    Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useUpload } from '../context/UploadContext';
import Avatar from '../components/Avatar';
import { useMediaUpload } from '../hooks/useMedia';
import { getVariantUrl } from '../utils/mediaUtils';
import '../styles/StudyPlaylistsPage.css';

const StudyPlaylistsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { showToast } = useToast();
    const [playlists, setPlaylists] = useState([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [viewingItem, setViewingItem] = useState(null);

    const { addUpload, updateUploadProgress, completeUpload, failUpload } = useUpload();

    // Add Item states
    const { uploadMedia, isUploading } = useMediaUpload();
    const fileInputRef = React.useRef(null);
    const [uploadMode, setUploadMode] = useState('url');
    const [itemUrl, setItemUrl] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);

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
    const [subjectFilter, setSubjectFilter] = useState('');

    const fetchPlaylists = useCallback(async () => {
        try {
            setLoading(true);
            const params = subjectFilter ? { subject: subjectFilter } : {};
            const { data } = await api.get('/playlists', { params });
            setPlaylists(data);
        } catch (err) {
            showToast('Failed to load playlists', 'error');
        } finally {
            setLoading(false);
        }
    }, [subjectFilter, showToast]);

    const fetchPlaylistDetails = useCallback(
        async (playlistId) => {
            try {
                const { data } = await api.get(`/playlists/${playlistId}`);
                setSelectedPlaylist(data);
            } catch (err) {
                showToast('Failed to load playlist details', 'error');
            }
        },
        [showToast],
    );

    useEffect(() => {
        fetchPlaylists();
    }, [fetchPlaylists]);

    const handleCreatePlaylist = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await api.post('/playlists', {
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

    const getFileType = (file) => {
        if (!file) return 'link';
        if (file.type.startsWith('image/')) return 'image';
        if (file.type.startsWith('video/')) return 'video';
        return 'document';
    };

    const getUrlType = (url) => {
        if (!url) return 'link';
        if (url.match(/\.(jpeg|jpg|gif|png)$/i)) return 'image';
        if (url.match(/\.(mp4|webm|ogg)$/i)) return 'video';
        if (url.match(/\.(pdf|doc|docx)$/i)) return 'document';
        return 'link';
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        let finalUrl = itemUrl;
        const title = formData.get('title');
        const duration = formData.get('duration_minutes')
            ? parseInt(formData.get('duration_minutes'))
            : null;
        const playlistId = selectedPlaylist.id;

        // Close modal immediately for background processing
        setShowAddItemModal(false);
        setItemUrl('');
        setSelectedFiles([]);
        setUploadMode('url');

        if (uploadMode === 'file' && selectedFiles.length > 0) {
            selectedFiles.forEach(async (file) => {
                const itemType = getFileType(file);
                const uploadId = addUpload({
                    fileName: file.name,
                    fileSize: file.size,
                    type: itemType,
                });

                try {
                    const uploadedUrl = await uploadMedia(file, (p, l) =>
                        updateUploadProgress(uploadId, p, l),
                    );
                    completeUpload(uploadId, { url: uploadedUrl });

                    const effectiveTitle = selectedFiles.length === 1 && title ? title : file.name;

                    await api.post(`/playlists/${playlistId}/items`, {
                        item_type: itemType,
                        title: effectiveTitle,
                        url: uploadedUrl,
                        duration_minutes: duration,
                    });
                    if (selectedPlaylist?.id === playlistId) fetchPlaylistDetails(playlistId);
                } catch (err) {
                    failUpload(uploadId, err);
                }
            });
            showToast('Items uploading...', 'success');
        } else if (uploadMode === 'url') {
            const currentUrl = formData.get('url') || finalUrl;
            const itemType = getUrlType(currentUrl);
            try {
                await api.post(`/playlists/${playlistId}/items`, {
                    item_type: itemType,
                    title: title,
                    url: currentUrl,
                    duration_minutes: duration,
                });
                showToast('Item added!', 'success');
                if (selectedPlaylist?.id === playlistId) fetchPlaylistDetails(playlistId);
            } catch (err) {
                showToast(err.response?.data?.error || 'Failed to add item', 'error');
            }
        }
    };

    const handleAddCollaborator = async (username) => {
        try {
            await api.post(`/playlists/${selectedPlaylist.id}/collaborators/${username}`);
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
                                ) : selectedPlaylist.items?.length > 4 ? (
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns:
                                                'repeat(auto-fill, minmax(150px, 1fr))',
                                            gap: '1rem',
                                        }}
                                    >
                                        {selectedPlaylist.items.map((item, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => setViewingItem(item)}
                                                style={{
                                                    cursor: 'pointer',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '8px',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: '100%',
                                                        height: '100px',
                                                        background: '#f0f2f5',
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    {item.item_type === 'image' ? (
                                                        <img
                                                            src={item.url}
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover',
                                                            }}
                                                            alt="Preview"
                                                            loading="lazy"
                                                        />
                                                    ) : item.item_type === 'video' ? (
                                                        <video
                                                            src={item.url}
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover',
                                                            }}
                                                            muted
                                                        />
                                                    ) : (
                                                        <div
                                                            style={{
                                                                color: '#65676b',
                                                                transform: 'scale(1.5)',
                                                            }}
                                                        >
                                                            {getItemIcon(item.item_type)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ padding: '0.5rem' }}>
                                                    <p
                                                        style={{
                                                            margin: 0,
                                                            fontSize: '0.85rem',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            fontWeight: '500',
                                                        }}
                                                    >
                                                        {item.title}
                                                    </p>
                                                    {item.duration_minutes && (
                                                        <p
                                                            style={{
                                                                margin: 0,
                                                                fontSize: '0.75rem',
                                                                color: '#65676b',
                                                            }}
                                                        >
                                                            {item.duration_minutes} min
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <ul className="items-list">
                                        {selectedPlaylist.items.map((item, idx) => (
                                            <li key={idx} className="playlist-item">
                                                <div className="item-icon">
                                                    {getItemIcon(item.item_type)}
                                                </div>
                                                <div className="item-info">
                                                    <a
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setViewingItem(item);
                                                        }}
                                                    >
                                                        {item.title}
                                                    </a>
                                                    {item.duration_minutes && (
                                                        <span className="duration">
                                                            {item.duration_minutes} min
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setViewingItem(item);
                                                    }}
                                                    className="play-btn"
                                                    style={{ border: 'none', cursor: 'pointer' }}
                                                >
                                                    <Play size={16} />
                                                </button>
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
                        onClick={() => {
                            setShowAddItemModal(false);
                            setItemUrl('');
                            setSelectedFiles([]);
                            setUploadMode('url');
                        }}
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
                                <button
                                    onClick={() => {
                                        setShowAddItemModal(false);
                                        setItemUrl('');
                                        setSelectedFiles([]);
                                        setUploadMode('url');
                                    }}
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleAddItem}>
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
                                    <label>Source</label>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: '1rem',
                                            marginBottom: '0.8rem',
                                        }}
                                    >
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${uploadMode === 'url' ? 'btn-primary' : 'btn-outline'}`}
                                            onClick={() => setUploadMode('url')}
                                        >
                                            <LinkIcon size={14} style={{ marginRight: '4px' }} />{' '}
                                            URL Link
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${uploadMode === 'file' ? 'btn-primary' : 'btn-outline'}`}
                                            onClick={() => setUploadMode('file')}
                                        >
                                            <Upload size={14} style={{ marginRight: '4px' }} />{' '}
                                            Upload File
                                        </button>
                                    </div>

                                    {uploadMode === 'url' ? (
                                        <input
                                            type="url"
                                            name="url"
                                            required={uploadMode === 'url'}
                                            placeholder="https://..."
                                            value={itemUrl}
                                            onChange={(e) => setItemUrl(e.target.value)}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: '0.5rem',
                                                alignItems: 'center',
                                                background: 'rgba(0,0,0,0.05)',
                                                padding: '0.5rem',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(0,0,0,0.1)',
                                            }}
                                        >
                                            <button
                                                type="button"
                                                className="btn btn-outline btn-sm"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                Choose File
                                            </button>
                                            <span
                                                style={{
                                                    fontSize: '0.9rem',
                                                    color: 'var(--text-muted)',
                                                }}
                                            >
                                                {selectedFiles.length > 0
                                                    ? `${selectedFiles.length} file(s) selected`
                                                    : 'No files chosen'}
                                            </span>
                                            <input
                                                type="file"
                                                name="file"
                                                multiple
                                                ref={fileInputRef}
                                                hidden
                                                required={
                                                    uploadMode === 'file' &&
                                                    selectedFiles.length === 0
                                                }
                                                onChange={(e) => {
                                                    const files = Array.from(e.target.files);
                                                    if (files.length > 0) setSelectedFiles(files);
                                                }}
                                            />
                                        </div>
                                    )}
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
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-full"
                                    disabled={uploadMode === 'file' && selectedFiles.length === 0}
                                >
                                    Add Item
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {viewingItem && (
                    <motion.div
                        className="modal-overlay viewer-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setViewingItem(null)}
                        style={{ zIndex: 1100 }}
                    >
                        <div
                            className="viewer-content"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: '#000',
                                padding: '1rem',
                                borderRadius: '12px',
                                width: '90%',
                                maxWidth: '1000px',
                                height: '85vh',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <div
                                className="viewer-header"
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '1rem',
                                    color: '#fff',
                                }}
                            >
                                <h3
                                    style={{
                                        margin: 0,
                                        color: '#fff',
                                        fontSize: '1.2rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        paddingRight: '1rem',
                                    }}
                                >
                                    {viewingItem.title}
                                </h3>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <a
                                        href={viewingItem.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            color: '#fff',
                                            textDecoration: 'underline',
                                            fontSize: '0.9rem',
                                        }}
                                    >
                                        Open Original
                                    </a>
                                    <button
                                        onClick={() => setViewingItem(null)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            padding: '4px',
                                        }}
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>
                            <div
                                className="viewer-body"
                                style={{
                                    flex: 1,
                                    minHeight: 0,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    background: '#111',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                }}
                            >
                                {viewingItem.item_type === 'image' ? (
                                    <img
                                        src={viewingItem.url}
                                        alt={viewingItem.title}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            objectFit: 'contain',
                                        }}
                                    />
                                ) : viewingItem.item_type === 'video' ? (
                                    <video
                                        src={getVariantUrl(viewingItem.url)}
                                        controls
                                        autoPlay
                                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                                    />
                                ) : viewingItem.item_type === 'audio' ? (
                                    <audio
                                        src={viewingItem.url}
                                        controls
                                        autoPlay
                                        style={{ width: '100%', maxWidth: '600px' }}
                                    />
                                ) : (
                                    <iframe
                                        src={viewingItem.url}
                                        title={viewingItem.title}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            border: 'none',
                                            background: '#fff',
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudyPlaylistsPage;
