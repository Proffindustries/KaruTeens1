import React, { useState, useRef, useEffect } from 'react';
import {
    X,
    MapPin,
    Users,
    Hash,
    Image as ImageIcon,
    Video,
    FileText,
    Smile,
    Music,
    Loader2,
    Shield,
    Check,
    Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import '../styles/CreatePostModal.css';
import { useCreatePost } from '../hooks/useContent.js';
import { useMediaUpload } from '../hooks/useMedia.js';
import { useUpload } from '../context/UploadContext.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from './Avatar.jsx';
import { useCreateGroupPost } from '../hooks/useGroups.js';

const CreatePostModal = React.memo(({ isOpen, onClose, groupId = null, pageId = null, pageName = null }) => {
    const [text, setText] = useState('');
    const [location, setLocation] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [showLocationOptions, setShowLocationOptions] = useState(false);

    // New fields
    const [audience, setAudience] = useState(['all']);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isNsfw, setIsNsfw] = useState(false);
    const [scheduledDatetime, setScheduledDatetime] = useState('');
    const [showScheduling, setShowScheduling] = useState(false);
    const [isPosting, setIsPosting] = useState(false);

    const fileInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const audioInputRef = useRef(null);
    const documentInputRef = useRef(null);

    // Cleanup object URLs on unmount
    useEffect(() => {
        const currentPreviews = previews;
        return () => {
            currentPreviews.forEach((preview) => {
                if (preview.url && preview.url.startsWith('blob:')) {
                    URL.revokeObjectURL(preview.url);
                }
            });
        };
    }, [previews]);

    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { mutate: createFeedPost } = useCreatePost();
    const { mutate: createGroupPost } = useCreateGroupPost();
    const { addUpload, updateUploadProgress, completeUpload, failUpload } = useUpload();
    const { uploadImage, uploadFile } = useMediaUpload();

    const createPost = groupId ? (data, options) => createGroupPost({ groupId, postData: data }, options) : createFeedPost;

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles((prev) => [...prev, ...files]);

        const newPreviews = files.map((file) => {
            let type = 'file';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';
            else if (file.type.startsWith('audio/')) type = 'audio';

            return {
                url: URL.createObjectURL(file),
                type,
                name: file.name,
            };
        });
        setPreviews((prev) => [...prev, ...newPreviews]);
    };

    const removeFile = (index) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
        setPreviews((prev) => {
            const newPreviews = [...prev];
            const removed = newPreviews.splice(index, 1)[0];
            if (removed && removed.url && removed.url.startsWith('blob:')) {
                URL.revokeObjectURL(removed.url);
            }
            return newPreviews;
        });
    };

    const handlePost = async () => {
        if (!text.trim() && selectedFiles.length === 0) return;
        setIsPosting(true);

        const postIsNsfw = isNsfw;

        const postType =
            selectedFiles.length > 0
                ? selectedFiles[0].type.startsWith('image/')
                    ? 'image'
                    : selectedFiles[0].type.startsWith('video/')
                      ? 'video'
                      : selectedFiles[0].type.startsWith('audio/')
                        ? 'audio'
                        : 'file'
                : 'text';

        const resetForm = () => {
            setText('');
            setLocation(null);
            setSelectedFiles([]);
            setPreviews([]);
            setAudience(['all']);
            setIsAnonymous(false);
            setIsNsfw(false);
            setScheduledDatetime('');
            onClose();
        };

        // Upload files in background
        if (selectedFiles.length > 0) {
            const uploadPromises = selectedFiles.map(async (file) => {
                const uploadId = addUpload({
                    fileName: file.name,
                    fileSize: file.size,
                    type: file.type.startsWith('image/') ? 'image' : 'file',
                });

                try {
                    let url;
                    if (file.type.startsWith('image/')) {
                        url = await uploadImage(file, (p, l) =>
                            updateUploadProgress(uploadId, p, l),
                        );
                    } else {
                        url = await uploadFile(file, (p, l) =>
                            updateUploadProgress(uploadId, p, l),
                        );
                    }
                    completeUpload(uploadId, { url });
                    return url;
                } catch (err) {
                    failUpload(uploadId, err);
                    throw err;
                }
            });

            try {
                const mediaUrls = await Promise.all(uploadPromises);
                const finalScheduledDate = scheduledDatetime ? new Date(scheduledDatetime).toISOString() : null;

                createPost({
                    content: text,
                    media_urls: mediaUrls.filter(Boolean),
                    post_type: postType,
                    location: location,
                    audience: audience,
                    scheduled_publish_date: finalScheduledDate,
                    is_anonymous: isAnonymous,
                    is_nsfw: postIsNsfw,
                    status: scheduledDatetime ? 'scheduled' : 'published',
                    page_id: pageId, // Missing page_id added
                }, {
                    onSuccess: resetForm,
                    onError: (err) => showToast(err.message || 'Failed to create post', 'error'),
                    onSettled: () => setIsPosting(false)
                });
            } catch {
                showToast('Failed to upload media. Please try again.', 'error');
                setIsPosting(false);
            }
        } else {
            const finalScheduledDate = scheduledDatetime ? new Date(scheduledDatetime).toISOString() : null;

            createPost({
                content: text,
                media_urls: [],
                post_type: 'text',
                location: location,
                audience: audience,
                scheduled_publish_date: finalScheduledDate,
                is_anonymous: isAnonymous,
                is_nsfw: postIsNsfw,
                status: scheduledDatetime ? 'scheduled' : 'published',
                page_id: pageId, // Missing page_id added
            }, {
                onSuccess: resetForm,
                onError: (err) => showToast(err.message || 'Failed to create post', 'error'),
                onSettled: () => setIsPosting(false)
            });
        }
    };

    const handleGetLocation = (isLive = false) => {
        if (!navigator.geolocation) {
            showToast('Geolocation is not supported by your browser', 'error');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({
                    latitude,
                    longitude,
                    label: isLive ? 'Live Location' : 'Current Location',
                    is_live: isLive,
                    duration_minutes: isLive ? 60 : null,
                });
                setShowLocationOptions(false);
            },
            () => {
                showToast('Could not get location. Ensure permissions are granted.', 'error');
            },
        );
    };

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
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="modal-header">
                        <h3>Create Post</h3>
                        <button className="close-btn" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>

                    <div className="modal-body">
                        {!isAuthenticated ? (
                            <div className="verification-gate-overlay">
                                <div className="gate-content">
                                    <Shield size={64} className="gate-shield" />
                                    <h3>Login Required</h3>
                                    <p>
                                        You need to be logged in to share updates with the KaruTeens
                                        community.
                                    </p>
                                    <button
                                        className="btn btn-primary btn-full"
                                        onClick={() => {
                                            onClose();
                                            navigate('/login');
                                        }}
                                    >
                                        Log In / Sign Up
                                    </button>
                                </div>
                            </div>
                        ) : !user?.is_verified ? (
                            <div className="verification-gate-overlay">
                                <div className="gate-content">
                                    <Shield size={64} className="gate-shield" />
                                    <h3>Verification Required</h3>
                                    <p>
                                        To keep KaruTeens safe and bot-free, you need to verify your
                                        student status with a one-time fee of{' '}
                                        <strong>Ksh 20</strong>.
                                    </p>
                                    <div className="gate-benefits">
                                        <div className="benefit">
                                            <Check size={16} /> Post on the Feed
                                        </div>
                                        <div className="benefit">
                                            <Check size={16} /> Comment & Reply
                                        </div>
                                        <div className="benefit">
                                            <Check size={16} /> Use Marketplace
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-primary btn-full"
                                        onClick={() => {
                                            onClose();
                                            navigate('/verification');
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
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                            }}
                                        >
                                            <strong>
                                                {isAnonymous
                                                    ? 'Anonymous'
                                                    : user.username || 'User'}
                                            </strong>
                                            <span
                                                className={`toggle-anonymous ${isAnonymous ? 'active' : ''} ${isPosting ? 'disabled' : ''}`}
                                                onClick={() => !isPosting && setIsAnonymous(!isAnonymous)}
                                                title="Post Anonymously"
                                            >
                                                {isAnonymous ? '👻' : '👤'}
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: '0.5rem',
                                                marginTop: '4px',
                                            }}
                                        >
                                            <select
                                                className="audience-select"
                                                value={audience[0]}
                                                onChange={(e) => setAudience([e.target.value])}
                                                disabled={isPosting}
                                            >
                                                <option value="all">Public (All)</option>
                                                <option value="freshers">Freshers (Y1)</option>
                                                <option value="2nd year">2nd Year</option>
                                                <option value="3rd year">3rd Year</option>
                                                <option value="4th year">4th Year</option>
                                                <option value="alumni">Alumni</option>
                                                <option value="staff">Staff Only</option>
                                            </select>

                                            <button
                                                className={`schedule-btn ${scheduledDatetime ? 'active' : ''}`}
                                                onClick={() => !isPosting && setShowScheduling(!showScheduling)}
                                                disabled={isPosting}
                                                title="Schedule Post"
                                            >
                                                <Calendar size={14} />{' '}
                                                {scheduledDatetime ? 'Scheduled' : 'Now'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {showScheduling && (
                                    <div className="scheduling-panel">
                                        <div className="scheduling-row">
                                            <div className="form-group" style={{width: "100%"}}>
                                                <label>Date & Time:</label>
                                                <input
                                                    type="datetime-local"
                                                    style={{ width: "100%", padding: "0.5rem" }}
                                                    value={scheduledDatetime}
                                                    onChange={(e) => setScheduledDatetime(e.target.value)}
                                                    min={new Date().toISOString().slice(0, 16)}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            className="clear-schedule"
                                            onClick={() => {
                                                setScheduledDate('');
                                                setShowScheduling(false);
                                            }}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                )}

                                <textarea
                                    className="post-textarea"
                                    placeholder="What's on your mind? Use #hashtags or @mentions..."
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    disabled={isPosting}
                                    autoFocus
                                ></textarea>

                                {previews.length > 0 && (
                                    <div className="media-preview-grid">
                                        {previews.map((preview, idx) => (
                                            <div key={idx} className="preview-item">
                                                {preview.type === 'image' && (
                                                    <img
                                                        src={preview.url}
                                                        alt="Preview"
                                                        loading="lazy"
                                                    />
                                                )}
                                                {preview.type === 'video' && (
                                                    <video src={preview.url} muted />
                                                )}
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
                                                <button
                                                    className="remove-preview"
                                                    onClick={() => !isPosting && removeFile(idx)}
                                                    disabled={isPosting}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {location && (
                                    <div className="active-tag-badge">
                                        <MapPin size={14} />{' '}
                                        {location.is_live ? '📡 Live' : '📍 At'}{' '}
                                        {location.label || 'Location'}
                                        <button onClick={() => setLocation(null)}>
                                            <X size={12} />
                                        </button>
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
                                        <button className="icon-btn" title="Tag People">
                                            <Users size={24} color="#1877f2" />
                                        </button>
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
                                                onClick={() =>
                                                    setShowLocationOptions(!showLocationOptions)
                                                }
                                            >
                                                <MapPin size={24} color="#f5533d" />
                                            </button>
                                            {showLocationOptions && (
                                                <div className="location-context-menu">
                                                    <button
                                                        onClick={() => handleGetLocation(false)}
                                                    >
                                                        📍 Share Current Location
                                                    </button>
                                                    <button onClick={() => handleGetLocation(true)}>
                                                        📡 Start Live Sharing (1h)
                                                    </button>
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

                                        <button
                                            className={`icon-btn ${isNsfw ? 'active' : ''}`}
                                            title="NSFW Content"
                                            onClick={() => !isPosting && setIsNsfw(!isNsfw)}
                                            disabled={isPosting}
                                        >
                                            <Shield
                                                size={24}
                                                color={isNsfw ? '#f5533d' : '#606770'}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="modal-footer">
                        {isPosting && (
                            <div className="upload-progress-inline">
                                <div className="progress-text">
                                    <span>Uploading & Processing...</span>
                                    <Loader2 size={16} className="spinner" />
                                </div>
                                <div className="progress-bar-container">
                                    <div className="progress-bar-fill" />
                                </div>
                            </div>
                        )}
                        {user?.is_verified && (
                            <button
                                className="btn btn-primary btn-full"
                                disabled={(!text && selectedFiles.length === 0) || isPosting}
                                onClick={handlePost}
                            >
                                {isPosting ? 'Posting...' : 'Post'}
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
});

export default CreatePostModal;
