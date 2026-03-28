import React from 'react';
import { X, File as FileIcon } from 'lucide-react';

const FilePreviewModal = ({
    selectedUploadFile,
    setSelectedUploadFile,
    isViewOnceUpload,
    setIsViewOnceUpload,
    confirmUpload,
}) => {
    if (!selectedUploadFile) return null;

    return (
        <div className="modal-overlay">
            <div className="media-preview-modal">
                <div className="modal-header">
                    <h3>Send Media</h3>
                    <button className="icon-btn" onClick={() => setSelectedUploadFile(null)}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="file-preview-info">
                        <FileIcon size={40} />
                        <p>{selectedUploadFile.name}</p>
                        <span>{(selectedUploadFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <div className="form-group-checkbox view-once-toggle">
                        <input
                            type="checkbox"
                            id="viewOnceUpload"
                            checked={isViewOnceUpload}
                            onChange={(e) => setIsViewOnceUpload(e.target.checked)}
                        />
                        <label htmlFor="viewOnceUpload">View Once</label>
                    </div>
                    <button className="create-btn" onClick={confirmUpload}>
                        Send File
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FilePreviewModal;
