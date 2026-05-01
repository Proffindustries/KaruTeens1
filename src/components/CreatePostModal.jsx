import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
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
    AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import '../styles/CreatePostModal.css';
import { useCreatePost, useTrendingTopics } from '../hooks/useContent.js';
import { useMediaUpload } from '../hooks/useMedia.js';
import { useUpload } from '../context/UploadContext.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from './Avatar.jsx';
import { useCreateGroupPost } from '../hooks/useGroups.js';

const CreatePostModal = React.memo(
    ({ isOpen, onClose, groupId = null, pageId = null, pageName = null, initialText = '' }) => {
        const [text, setText] = useState(initialText);
        const [location, setLocation] = useState(null);
        const [files, setFiles] = useState([]); // { id, file, previewUrl, type, name, status, progress, url, error }
        const [showLocationOptions, setShowLocationOptions] = useState(false);

        // Missing state variables
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
            const currentFiles = files;
            return () => {
                currentFiles.forEach((f) => {
                    if (f.previewUrl && f.previewUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(f.previewUrl);
                    }
                });
            };
        }, [files]);

        const { isAuthenticated, user } = useAuth();
        const navigate = useNavigate();
        const { showToast } = useToast();
        const { mutate: createFeedPost } = useCreatePost();
        const { mutate: createGroupPost } = useCreateGroupPost();
        const { data: trending } = useTrendingTopics();

        const appendHashtag = (tag) => {
            setText((prev) => {
                const trimmed = prev.trim();
                return trimmed ? `${trimmed} ${tag} ` : `${tag} `;
            });
        };

        const { addUpload, updateUploadProgress, completeUpload, failUpload, setCancelToken } = useUpload();
        const { uploadMedia, batchUpload } = useMediaUpload();

        const createPost = groupId
            ? (data, options) => createGroupPost({ groupId, postData: data }, options)
            : createFeedPost;

        const handleFileChange = (e) => {
            const selected = Array.from(e.target.files);
            const newFiles = selected.map((file) => {
                let type = 'file';
                if (file.type.startsWith('image/')) type = 'image';
                else if (file.type.startsWith('video/')) type = 'video';
                else if (file.type.startsWith('audio/')) type = 'audio';
                else if (file.type === 'application/pdf') type = 'pdf';
                else if (
                    file.type === 'application/vnd.ms-excel' ||
                    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.name.match(/\.(xls|xlsx)$/i)
                ) type = 'excel';

                return {
                    id: Math.random().toString(36).substr(2, 9),
                    file,
                    previewUrl: URL.createObjectURL(file),
                    type,
                    name: file.name,
                    status: 'idle',
                    progress: 0,
                    url: null,
                    error: null,
                    cancelTokenSource: null,
                };
            });
            setFiles((prev) => [...prev, ...newFiles]);
        };

        const removeFile = (id) => {
            setFiles((prev) => {
                const fileToRemove = prev.find((f) => f.id === id);
                if (fileToRemove) {
                    if (fileToRemove.cancelTokenSource) {
                        fileToRemove.cancelTokenSource.cancel('File removed by user');
                    }
                    if (fileToRemove.previewUrl && fileToRemove.previewUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(fileToRemove.previewUrl);
                    }
                }
                return prev.filter((f) => f.id !== id);
            });
        };

        const uploadSingleFile = async (fileObj) => {
            if (fileObj.status === 'completed') return fileObj.url;

            const cancelTokenSource = axios.CancelToken.source();
            
            const uploadId = addUpload({
                fileName: fileObj.name,
                fileSize: fileObj.file.size,
                type: fileObj.type === 'image' ? 'image' : 'file',
            });
            
            setCancelToken(uploadId, cancelTokenSource);

            setFiles((prev) =>
                prev.map((f) =>
                    f.id === fileObj.id 
                        ? { ...f, status: 'uploading', progress: 0, error: null, cancelTokenSource } 
                        : f,
                ),
            );

            try {
                let url;
                const onProgress = (p, l) => {
                    updateUploadProgress(uploadId, p, l);
                    setFiles((prev) =>
                        prev.map((f) => (f.id === fileObj.id ? { ...f, progress: p } : f)),
                    );
                };

                url = await uploadMedia(fileObj.file, onProgress, cancelTokenSource.token);

                completeUpload(uploadId, { url });
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === fileObj.id ? { ...f, status: 'completed', progress: 100, url, cancelTokenSource: null } : f,
                    ),
                );
                return url;
            } catch (err) {
                if (axios.isCancel(err)) {
                    console.log('Upload cancelled for file:', fileObj.name);
                    // Don't fail the upload in context if it was explicitly cancelled
                    return null;
                }
                failUpload(uploadId, err);
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === fileObj.id ? { ...f, status: 'failed', error: err.message, cancelTokenSource: null } : f,
                    ),
                );
                throw err;
            }
        };

        const retryUpload = (id) => {
            const fileObj = files.find((f) => f.id === id);
            if (fileObj) uploadSingleFile(fileObj);
        };

        const handlePost = async () => {
            if (!text.trim() && files.length === 0) return;
            setIsPosting(true);

            const postIsNsfw = isNsfw;
            
            // Determine post type based on files
            let postType = 'text';
            if (files.length > 0) {
                const types = files.map(f => f.type);
                if (types.includes('video')) postType = 'video';
                else if (types.includes('audio')) postType = 'audio';
                else if (types.includes('image')) postType = 'image';
                else postType = 'file';
            }

            const resetForm = () => {
                setText('');
                setLocation(null);
                setFiles([]);
                setAudience(['all']);
                setIsAnonymous(false);
                setIsNsfw(false);
                setScheduledDatetime('');
                onClose();
            };

            // Upload files with concurrency control and individual state tracking
            if (files.length > 0) {
                const uploadResults = await batchUpload(
                    files,
                    (fileObj) => uploadSingleFile(fileObj),
                    2 // Limit to 2 concurrent uploads
                );

                const mediaUrls = files
                    .map((f, i) => {
                        if (f.status === 'completed') return f.url;
                        if (uploadResults[i].status === 'fulfilled') return uploadResults[i].value;
                        return null;
                    })
                    .filter(Boolean);

                const failedCount = files.length - mediaUrls.length;

                if (failedCount > 0 && mediaUrls.length === 0) {
                    showToast(`Failed to upload ${failedCount} file(s).`, 'error');
                    setIsPosting(false);
                    return;
                }

                if (failedCount > 0) {
                    const proceed = window.confirm(
                        `${failedCount} file(s) failed to upload. Do you want to post anyway with only the successful ones?`,
                    );
                    if (!proceed) {
                        setIsPosting(false);
                        return;
                    }
                }

                const finalScheduledDate = scheduledDatetime
                    ? new Date(scheduledDatetime).toISOString()
                    : null;

                createPost(
                    {
                        content: text,
                        media_urls: mediaUrls,
                        post_type: postType,
                        location: location,
                        audience: audience,
                        scheduled_publish_date: finalScheduledDate,
                        is_anonymous: isAnonymous,
                        is_nsfw: postIsNsfw,
                        status: scheduledDatetime ? 'scheduled' : 'published',
                        page_id: pageId,
                    },
                    {
                        onSuccess: resetForm,
                        onError: (err) =>
                            showToast(err.message || 'Failed to create post', 'error'),
                        onSettled: () => setIsPosting(false),
                    },
                );
            } else {
                const finalScheduledDate = scheduledDatetime
                    ? new Date(scheduledDatetime).toISOString()
                    : null;

                createPost(
                    {
                        content: text,
                        media_urls: [],
                        post_type: 'text',
                        location: location,
                        audience: audience,
                        scheduled_publish_date: finalScheduledDate,
                        is_anonymous: isAnonymous,
                        is_nsfw: postIsNsfw,
                        status: scheduledDatetime ? 'scheduled' : 'published',
                        page_id: pageId,
                    },
                    {
                        onSuccess: resetForm,
                        onError: (err) =>
                            showToast(err.message || 'Failed to create post', 'error'),
                        onSettled: () => setIsPosting(false),
                    },
                );
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

        return (
            <AnimatePresence>
                {isOpen && (
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
                                            You need to be logged in to share updates with the
                                            KaruTeens community.
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
                                            To keep KaruTeens safe and bot-free, you need to verify
                                            your student status with a one-time fee of{' '}
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
                                                    onClick={() =>
                                                        !isPosting && setIsAnonymous(!isAnonymous)
                                                    }
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
                                                    onClick={() =>
                                                        !isPosting &&
                                                        setShowScheduling(!showScheduling)
                                                    }
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
                                                <div
                                                    className="form-group"
                                                    style={{ width: '100%' }}
                                                >
                                                    <label>Date & Time:</label>
                                                    <input
                                                        type="datetime-local"
                                                        style={{ width: '100%', padding: '0.5rem' }}
                                                        value={scheduledDatetime}
                                                        onChange={(e) =>
                                                            setScheduledDatetime(e.target.value)
                                                        }
                                                        min={new Date().toISOString().slice(0, 16)}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                className="clear-schedule"
                                                onClick={() => {
                                                    setScheduledDatetime('');
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

                                    {trending && trending.length > 0 && (
                                        <div className="trending-suggestions-mini">
                                            <span className="label">Trending:</span>
                                            <div className="tags-list">
                                                {trending.slice(0, 5).map((tag, idx) => (
                                                    <button
                                                        key={idx}
                                                        className="tag-suggest-btn"
                                                        onClick={() => appendHashtag(tag.id)}
                                                        type="button"
                                                    >
                                                        {tag.id}
                                                    </button>
                                                ))}
                                                {/* Pre-made suggestions */}
                                                {[
                                                    '#KaruTeens',
                                                    '#CampusLife',
                                                    '#KaratinaUniversity',
                                                ].map((tag, idx) => (
                                                    <button
                                                        key={`suggest-${idx}`}
                                                        className="tag-suggest-btn premade"
                                                        onClick={() => appendHashtag(tag)}
                                                        type="button"
                                                    >
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {files.length > 0 && (
                                        <div className="media-preview-grid">
                                            {files.map((fileObj) => (
                                                <div key={fileObj.id} className="preview-item">
                                                    {fileObj.type === 'image' && (
                                                        <img
                                                            src={fileObj.previewUrl}
                                                            alt="Preview"
                                                            loading="lazy"
                                                        />
                                                    )}
                                                    {fileObj.type === 'video' && (
                                                        <video src={fileObj.previewUrl} muted />
                                                    )}
                                                    {fileObj.type === 'audio' && (
                                                        <div className="file-preview-placeholder">
                                                            <Music size={32} color="#f7b928" />
                                                            <span>{fileObj.name}</span>
                                                        </div>
                                                    )}
                                                    {fileObj.type === 'pdf' && (
                                                        <iframe
                                                            src={`${fileObj.previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                                            className="pdf-preview"
                                                            title={fileObj.name}
                                                        />
                                                    )}
                                                    {fileObj.type === 'excel' && (
                                                        <div className="file-preview-placeholder">
                                                            <div className="excel-icon-wrapper">
                                                                <FileText size={24} color="#fff" />
                                                            </div>
                                                            <span title={fileObj.name}>{fileObj.name}</span>
                                                        </div>
                                                    )}
                                                    {fileObj.type === 'file' && (
                                                        <div className="file-preview-placeholder">
                                                            <FileText size={32} color="#606770" />
                                                            <span title={fileObj.name}>{fileObj.name}</span>
                                                        </div>
                                                    )}

                                                    {/* Individual Upload Progress Overlay */}
                                                    {fileObj.status === 'uploading' && (
                                                        <div className="preview-upload-overlay">
                                                            <div className="mini-progress-bar">
                                                                <div
                                                                    className="mini-progress-fill"
                                                                    style={{
                                                                        width: `${fileObj.progress}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="percent-text">
                                                                {fileObj.progress}%
                                                            </span>
                                                        </div>
                                                    )}

                                                    {fileObj.status === 'completed' && (
                                                        <div className="preview-upload-overlay success">
                                                            <Check size={24} color="#fff" />
                                                        </div>
                                                    )}

                                                    {fileObj.status === 'failed' && (
                                                        <div className="preview-upload-overlay failed">
                                                            <AlertCircle size={24} color="#fff" />
                                                            <span className="error-text">Failed</span>
                                                            <button
                                                                className="retry-upload-btn"
                                                                onClick={() =>
                                                                    retryUpload(fileObj.id)
                                                                }
                                                            >
                                                                Retry
                                                            </button>
                                                        </div>
                                                    )}

                                                    <button
                                                        className="remove-preview"
                                                        onClick={() =>
                                                            !isPosting && removeFile(fileObj.id)
                                                        }
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
                                            <button
                                                className="icon-btn"
                                                title="Document"
                                                onClick={() => documentInputRef.current.click()}
                                            >
                                                <FileText size={24} color="#606770" />
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
                                                        <button
                                                            onClick={() => handleGetLocation(true)}
                                                        >
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
                                    disabled={(!text && files.length === 0) || isPosting}
                                    onClick={handlePost}
                                >
                                    {isPosting ? 'Posting...' : 'Post'}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
},
);

export default CreatePostModal;
