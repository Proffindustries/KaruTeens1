import React, { useState, useRef } from 'react';
import { X, MapPin, Users, Hash, Image as ImageIcon, Video, FileText, Smile, Music, Loader2, Shield, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import '../styles/CreatePostModal.css';
import { useCreatePost } from '../hooks/useContent.js';
import { useMediaUpload } from '../hooks/useMedia.js';
import { useUpload } from '../context/UploadContext.jsx';
import Avatar from './Avatar.jsx';

const CreatePostModal = ({ isOpen, onClose }) => {
    const [text, setText] = useState('');
    const [location, setLocation] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const fileInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const audioInputRef = useRef(null);
    const documentInputRef = useRef(null);

    const { mutate: createPost } = useCreatePost();
    const { uploadImage, uploadFile } = useMediaUpload();
    const { addUpload, updateUploadProgress, completeUpload, failUpload, setCancelToken } = useUpload();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Disable body scroll when modal is open
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setSelectedFiles(prev => [...prev, ...files]);

        // Create previews
        const newPreviews = files.map(file => {
            const type = file.type.startsWith('image/') ? 'image'
                : file.type.startsWith('video/') ? 'video'
                    : file.type.startsWith('audio/') ? 'audio'
                        : 'file';

            return {
                url: URL.createObjectURL(file),
                type,
                name: file.name
            };
        });
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => {
            const newPreviews = prev.filter((_, i) => i !== index);
            URL.revokeObjectURL(prev[index].url);
            return newPreviews;
        });
    };

    const handlePost = async () => {
        if (!text.trim() && selectedFiles.length === 0) return;

        const postContent = text;
        const postLocation = location;
        const files = [...selectedFiles];
        const postType = files.length > 0 ? (
            files[0].type.startsWith('image/') ? 'image' :
                files[0].type.startsWith('video/') ? 'video' :
                    files[0].type.startsWith('audio/') ? 'audio' : 'file'
        ) : 'text';

        // Reset form immediately
        setText('');
        setLocation(null);
        setSelectedFiles([]);
        setPreviews([]);
        onClose();

        // Upload files in background
        if (files.length > 0) {
            const uploadPromises = files.map(async (file) => {
                const uploadId = addUpload({
                    fileName: file.name,
                    fileSize: file.size,
                    type: file.type.startsWith('image/') ? 'image' :
                        file.type.startsWith('video/') ? 'video' :
                            file.type.startsWith('audio/') ? 'audio' : 'file',
                });

                try {
                    const cancelTokenSource = axios.CancelToken.source();
                    setCancelToken(uploadId, cancelTokenSource);

                    let url;
                    if (file.type.startsWith('image/')) {
                        url = await uploadImage(
                            file,
                            (progress, loaded) => updateUploadProgress(uploadId, progress, loaded)
                        );
                    } else {
                        url = await uploadFile(
                            file,
                            (progress, loaded) => updateUploadProgress(uploadId, progress, loaded),
                            cancelTokenSource.token
                        );
                    }

                    completeUpload(uploadId, { url });
                    return url;
                } catch (error) {
                    if (!axios.isCancel(error)) {
                        failUpload(uploadId, error);
                    }
                    throw error;
                }
            });

            try {
                const mediaUrls = await Promise.all(uploadPromises);

                // Create post after all uploads complete
                createPost({
                    content: postContent,
                    media_urls: mediaUrls.filter(Boolean),
                    post_type: postType,
                    location: postLocation
                });
            } catch (error) {
                console.error('Upload failed:', error);
            }
        } else {
            // No files, create post immediately
            createPost({
                content: postContent,
                media_urls: [],
                post_type: 'text',
                location: postLocation
            });
        }
    };

    const handleGetLocation = (isLive = false) => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported");
            return;
        }

        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            setLocation({
                latitude,
                longitude,
                label: isLive ? "Live Location" : "Current Location",
                is_live: isLive,
                duration_minutes: isLive ? 60 : null
            });
            setShowLocationOptions(false);
        }, (err) => {
            console.error(err);
            alert("Could not get location. Ensure permissions are granted.");
        });
    };

    const [showLocationOptions, setShowLocationOptions] = useState(false);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="modal-overlay"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="modal-content"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="modal-header">
                        <h3>Create Post</h3>
                        <button className="close-btn" onClick={onClose}><X size={24} /></button>
                    </div>

                    <div className="modal-body">
                        {!user.is_verified ? (
                            <div className="verification-gate-overlay">
                                <div className="gate-content">
                                    <Shield size={64} className="gate-shield" />
                                    <h3>Verification Required</h3>
                                    <p>To keep KaruTeens safe and bot-free, you need to verify your student status with a one-time fee of <strong>Ksh 20</strong>.</p>
                                    <div className="gate-benefits">
                                        <div className="benefit"><Check size={16} /> Post on the Feed</div>
                                        <div className="benefit"><Check size={16} /> Comment & Reply</div>
                                        <div className="benefit"><Check size={16} /> Use Marketplace</div>
                                    </div>
                                    <button
                                        className="btn btn-primary btn-full"
                                        onClick={() => {
                                            onClose();
                                            window.location.href = '/verification';
                                        }}
                                    >
                                        Verify My Account Now
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="user-preview-row">
                                    <Avatar
                                        src={user.avatar_url}
                                        name={user.username || 'User'}
                                        className="modal-avatar"
                                    />
                                    <div className="user-details">
                                        <strong>{user.username || 'Anonymous'}</strong>
                                        <select className="audience-select">
                                            <option>Public</option>
                                            <option>Friends</option>
                                            <option>Only Me</option>
                                        </select>
                                    </div>
                                </div>

                                <textarea
                                    className="post-textarea"
                                    placeholder="What's on your mind? Use #hashtags or @mentions..."
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    autoFocus
                                ></textarea>

                                {previews.length > 0 && (
                                    <div className="media-preview-grid">
                                        {previews.map((preview, idx) => (
                                            <div key={idx} className="preview-item">
                                                {preview.type === 'image' && <img src={preview.url} alt="Preview" />}
                                                {preview.type === 'video' && <video src={preview.url} muted />}
                                                {preview.type === 'audio' && (
                                                    <div className="file-preview-placeholder">
                                                        <Music size={32} color="#f7b928" />
                                                        <span>{preview.name}</span>
                                                    </div>
                                                )}
                                                {preview.type === 'file' && (
                                                    <div className="file-preview-placeholder">
                                                        <FileText size={32} color="#606770" />
                                                        <span>{preview.name}</span>
                                                    </div>
                                                )}
                                                <button className="remove-preview" onClick={() => removeFile(idx)}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {location && (
                                    <div className="active-tag-badge">
                                        <MapPin size={14} /> {location.is_live ? '📡 Live' : '📍 At'} {location.label || 'Location'}
                                        <button onClick={() => setLocation(null)}><X size={12} /></button>
                                    </div>
                                )}

                                <div className="add-to-post">
                                    <span>Add to your post</span>
                                    <div className="add-icons">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            hidden
                                            multiple
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                        <input
                                            type="file"
                                            ref={videoInputRef}
                                            hidden
                                            accept="video/*"
                                            onChange={handleFileChange}
                                        />
                                        <input
                                            type="file"
                                            ref={audioInputRef}
                                            hidden
                                            accept="audio/*"
                                            onChange={handleFileChange}
                                        />
                                        <input
                                            type="file"
                                            ref={documentInputRef}
                                            hidden
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                                            onChange={handleFileChange}
                                        />
                                        <button
                                            className="icon-btn"
                                            title="Photo"
                                            onClick={() => fileInputRef.current.click()}
                                        >
                                            <ImageIcon size={24} color="#45bd62" />
                                        </button>
                                        <button
                                            className="icon-btn"
                                            title="Video"
                                            onClick={() => videoInputRef.current.click()}
                                        >
                                            <Video size={24} color="#fb7185" />
                                        </button>
                                        <button className="icon-btn" title="Tag People"><Users size={24} color="#1877f2" /></button>
                                        <button
                                            className="icon-btn"
                                            title="Audio"
                                            onClick={() => audioInputRef.current.click()}
                                        >
                                            <Music size={24} color="#f7b928" />
                                        </button>
                                        <div style={{ position: 'relative' }}>
                                            <button
                                                className="icon-btn"
                                                title="Check In"
                                                onClick={() => setShowLocationOptions(!showLocationOptions)}
                                            >
                                                <MapPin size={24} color="#f5533d" />
                                            </button>
                                            {showLocationOptions && (
                                                <div className="location-context-menu">
                                                    <button onClick={() => handleGetLocation(false)}>📍 Share Current Location</button>
                                                    <button onClick={() => handleGetLocation(true)}>📡 Start Live Sharing (1h)</button>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            className="icon-btn"
                                            title="File"
                                            onClick={() => documentInputRef.current.click()}
                                        >
                                            <FileText size={24} color="#606770" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="modal-footer">
                        {user.is_verified && (
                            <button
                                className="btn btn-primary btn-full"
                                disabled={!text && selectedFiles.length === 0}
                                onClick={handlePost}
                            >
                                Post
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CreatePostModal;
