import React, { useMemo, useEffect } from 'react';
import { X, File as FileIcon, Music, FileText } from 'lucide-react';

const FilePreviewModal = ({
    selectedUploadFile,
    setSelectedUploadFile,
    isViewOnceUpload,
    setIsViewOnceUpload,
    confirmUpload,
}) => {
    const previewUrl = useMemo(() => {
        if (!selectedUploadFile) return null;
        return URL.createObjectURL(selectedUploadFile);
    }, [selectedUploadFile]);

    // Cleanup URL on unmount or when file changes
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    if (!selectedUploadFile) return null;

    let type = 'file';
    if (selectedUploadFile.type.startsWith('image/')) type = 'image';
    else if (selectedUploadFile.type.startsWith('video/')) type = 'video';
    else if (selectedUploadFile.type.startsWith('audio/')) type = 'audio';
    else if (selectedUploadFile.type === 'application/pdf') type = 'pdf';
    else if (
        selectedUploadFile.type === 'application/vnd.ms-excel' ||
        selectedUploadFile.type ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        selectedUploadFile.name.match(/\.(xls|xlsx)$/i)
    )
        type = 'excel';
    else if (
        selectedUploadFile.type === 'application/msword' ||
        selectedUploadFile.type ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        selectedUploadFile.name.match(/\.(doc|docx)$/i)
    )
        type = 'word';
    else if (
        selectedUploadFile.type === 'application/vnd.ms-powerpoint' ||
        selectedUploadFile.type ===
            'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        selectedUploadFile.name.match(/\.(ppt|pptx)$/i)
    )
        type = 'powerpoint';

    return (
        <div className="modal-overlay">
            <div className="media-preview-modal">
                <div className="modal-header">
                    <h3>Send Media</h3>
                    <button className="icon-btn" onClick={() => setSelectedUploadFile(null)}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body p-0">
                    <div className="file-preview-content">
                        {type === 'image' && (
                            <img src={previewUrl} alt="Preview" className="media-preview-img" />
                        )}
                        {type === 'video' && (
                            <video src={previewUrl} controls className="media-preview-video" />
                        )}
                        {type === 'audio' && (
                            <div className="generic-file-view">
                                <Music size={48} color="#f7b928" />
                                <p className="file-preview-name">{selectedUploadFile.name}</p>
                            </div>
                        )}
                        {type === 'pdf' && (
                            <iframe
                                src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                className="media-preview-pdf"
                                title="PDF Preview"
                            />
                        )}
                        {type === 'excel' && (
                            <div className="generic-file-view excel-view">
                                <div className="excel-icon-wrapper-large">
                                    <FileText size={48} color="#fff" />
                                </div>
                                <p className="file-preview-name">{selectedUploadFile.name}</p>
                            </div>
                        )}
                        {type === 'word' && (
                            <div className="generic-file-view word-view">
                                <div className="word-icon-wrapper-large">
                                    <FileText size={48} color="#fff" />
                                </div>
                                <p className="file-preview-name">{selectedUploadFile.name}</p>
                            </div>
                        )}
                        {type === 'powerpoint' && (
                            <div className="generic-file-view ppt-view">
                                <div className="ppt-icon-wrapper-large">
                                    <FileText size={48} color="#fff" />
                                </div>
                                <p className="file-preview-name">{selectedUploadFile.name}</p>
                            </div>
                        )}
                        {type === 'file' && (
                            <div className="generic-file-view">
                                <FileIcon size={48} color="#606770" />
                                <p className="file-preview-name">{selectedUploadFile.name}</p>
                            </div>
                        )}
                    </div>
                    <div className="file-meta-info">
                        <span className="file-size-badge">
                            {(selectedUploadFile.size / 1024).toFixed(1)} KB
                        </span>
                        {(type === 'video' || type === 'image') && (
                            <span className="optimization-hint">
                                ✨ Will be optimized for web
                            </span>
                        )}
                    </div>
                    <div className="p-4">
                        <div className="form-group-checkbox view-once-toggle">
                            <input
                                type="checkbox"
                                id="viewOnceUpload"
                                checked={isViewOnceUpload}
                                onChange={(e) => setIsViewOnceUpload(e.target.checked)}
                            />
                            <label htmlFor="viewOnceUpload">View Once</label>
                        </div>
                        <button
                            className="create-btn"
                            style={{ width: '100%', marginTop: '1rem' }}
                            onClick={confirmUpload}
                        >
                            Send File
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilePreviewModal;
