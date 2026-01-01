import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Video, Loader2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateStory } from '../hooks/useStories';
import { useMediaUpload } from '../hooks/useMedia';
import { useToast } from '../context/ToastContext';
import '../styles/CreatePostModal.css'; // Reusing modal styles for consistency

const CreateStoryModal = ({ isOpen, onClose }) => {
    const [caption, setCaption] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef(null);
    const { mutate: createStory } = useCreateStory();
    const { uploadImage, uploadFile } = useMediaUpload();
    const { showToast } = useToast();

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSelectedFile(file);
        setPreview({
            url: URL.createObjectURL(file),
            type: file.type.startsWith('video/') ? 'video' : 'image'
        });
    };

    const handlePost = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        try {
            let mediaUrl;
            const mediaType = selectedFile.type.startsWith('video/') ? 'video' : 'image';

            if (mediaType === 'image') {
                mediaUrl = await uploadImage(selectedFile);
            } else {
                mediaUrl = await uploadFile(selectedFile);
            }

            createStory({
                media_url: mediaUrl,
                media_type: mediaType,
                caption: caption
            }, {
                onSuccess: () => {
                    showToast('Story added successfully!', 'success');
                    handleClose();
                },
                onError: (err) => {
                    showToast(err.message || 'Failed to add story', 'error');
                }
            });
        } catch (error) {
            console.error(error);
            // Toast handled in hook usually, but doubled check here
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        setCaption('');
        setSelectedFile(null);
        setPreview(null);
        setIsUploading(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="modal-overlay"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="modal-content"
                    style={{ maxWidth: '400px' }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="modal-header">
                        <h3>Add to Story</h3>
                        <button className="close-btn" onClick={handleClose}><X size={24} /></button>
                    </div>

                    <div className="modal-body">
                        {!preview ? (
                            <div
                                className="upload-placeholder"
                                style={{
                                    height: '300px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px dashed rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    cursor: 'pointer'
                                }}
                                onClick={() => fileInputRef.current.click()}
                            >
                                <div className="flex gap-4 mb-4">
                                    <ImageIcon size={48} className="text-gray-400" />
                                    <Video size={48} className="text-gray-400" />
                                </div>
                                <span className="text-gray-400">Click to select photo or video</span>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    hidden
                                    accept="image/*,video/*"
                                    onChange={handleFileChange}
                                />
                            </div>
                        ) : (
                            <div className="preview-container" style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
                                {preview.type === 'video' ? (
                                    <video src={preview.url} controls className="w-full h-auto max-h-[400px]" />
                                ) : (
                                    <img src={preview.url} alt="Preview" className="w-full h-auto max-h-[400px] object-contain" />
                                )}
                                <button
                                    onClick={() => {
                                        setSelectedFile(null);
                                        setPreview(null);
                                    }}
                                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        <div className="mt-4">
                            <input
                                type="text"
                                placeholder="Add a caption..."
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            className="btn btn-primary btn-full flex items-center justify-center gap-2"
                            disabled={!selectedFile || isUploading}
                            onClick={handlePost}
                        >
                            {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                            {isUploading ? 'Posting...' : 'Share to Story'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CreateStoryModal;
