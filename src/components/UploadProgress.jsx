import React, { useState } from 'react';
import { X, Check, AlertCircle, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpload } from '../context/UploadContext';
import '../styles/UploadProgress.css';

const UploadProgress = () => {
    const { uploads, cancelUpload, activeUploadsCount } = useUpload();
    const [isMinimized, setIsMinimized] = useState(false);

    if (uploads.length === 0) return null;

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatSpeed = (bytesPerSecond) => {
        if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(0) + ' B/s';
        if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s';
        return (bytesPerSecond / (1024 * 1024)).toFixed(1) + ' MB/s';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return '#10b981';
            case 'failed': return '#ef4444';
            case 'cancelled': return '#f59e0b';
            default: return '#3b82f6';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <Check size={16} />;
            case 'failed': return <AlertCircle size={16} />;
            case 'uploading': return <Loader2 size={16} className="spinner" />;
            default: return null;
        }
    };

    return (
        <div className={`upload-progress-container ${isMinimized ? 'minimized' : ''}`}>
            <div className="upload-progress-header">
                <div className="header-info">
                    <span className="header-title">
                        {activeUploadsCount > 0 ? `Uploading ${activeUploadsCount} file${activeUploadsCount > 1 ? 's' : ''}` : 'Uploads'}
                    </span>
                </div>
                <div className="header-actions">
                    <button
                        className="minimize-btn"
                        onClick={() => setIsMinimized(!isMinimized)}
                        title={isMinimized ? 'Expand' : 'Minimize'}
                    >
                        {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {!isMinimized && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="upload-list"
                    >
                        {uploads.map((upload) => {
                            const elapsed = (Date.now() - upload.startTime) / 1000;
                            const speed = upload.uploadedBytes / elapsed;
                            const remaining = upload.fileSize - upload.uploadedBytes;
                            const eta = remaining / speed;

                            return (
                                <motion.div
                                    key={upload.id}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className={`upload-item upload-${upload.status}`}
                                >
                                    <div className="upload-item-header">
                                        <div className="upload-status-icon" style={{ color: getStatusColor(upload.status) }}>
                                            {getStatusIcon(upload.status)}
                                        </div>
                                        <div className="upload-info">
                                            <span className="upload-filename">{upload.fileName}</span>
                                            <span className="upload-details">
                                                {upload.status === 'uploading' && (
                                                    <>
                                                        {formatFileSize(upload.uploadedBytes)} / {formatFileSize(upload.fileSize)}
                                                        {' • '}
                                                        {formatSpeed(speed)}
                                                        {isFinite(eta) && eta > 0 && ` • ${Math.ceil(eta)}s left`}
                                                    </>
                                                )}
                                                {upload.status === 'completed' && 'Upload complete'}
                                                {upload.status === 'failed' && (upload.error || 'Upload failed')}
                                                {upload.status === 'cancelled' && 'Cancelled'}
                                            </span>
                                        </div>
                                        {upload.status === 'uploading' && (
                                            <button
                                                className="cancel-upload-btn"
                                                onClick={() => cancelUpload(upload.id)}
                                                title="Cancel upload"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                    {upload.status === 'uploading' && (
                                        <div className="upload-progress-bar">
                                            <div
                                                className="upload-progress-fill"
                                                style={{ width: `${upload.progress}%`, backgroundColor: getStatusColor(upload.status) }}
                                            />
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UploadProgress;
