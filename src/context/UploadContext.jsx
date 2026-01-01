import React, { createContext, useContext, useState, useCallback } from 'react';

const UploadContext = createContext();

export const useUpload = () => {
    const context = useContext(UploadContext);
    if (!context) {
        throw new Error('useUpload must be used within UploadProvider');
    }
    return context;
};

export const UploadProvider = ({ children }) => {
    const [uploads, setUploads] = useState([]);

    const addUpload = useCallback((upload) => {
        const uploadId = `${Date.now()}-${Math.random()}`;
        const newUpload = {
            id: uploadId,
            fileName: upload.fileName,
            fileSize: upload.fileSize,
            type: upload.type, // 'image', 'video', 'audio', 'file'
            progress: 0,
            status: 'uploading', // 'uploading', 'completed', 'failed', 'cancelled'
            uploadedBytes: 0,
            startTime: Date.now(),
            cancelToken: null,
            error: null,
        };

        setUploads(prev => [...prev, newUpload]);
        return uploadId;
    }, []);

    const updateUploadProgress = useCallback((uploadId, progress, uploadedBytes) => {
        setUploads(prev => prev.map(upload =>
            upload.id === uploadId
                ? { ...upload, progress, uploadedBytes }
                : upload
        ));
    }, []);

    const completeUpload = useCallback((uploadId, result) => {
        setUploads(prev => prev.map(upload =>
            upload.id === uploadId
                ? { ...upload, status: 'completed', progress: 100, result }
                : upload
        ));

        // Auto-remove completed uploads after 5 seconds
        setTimeout(() => {
            removeUpload(uploadId);
        }, 5000);
    }, []);

    const failUpload = useCallback((uploadId, error) => {
        setUploads(prev => prev.map(upload =>
            upload.id === uploadId
                ? { ...upload, status: 'failed', error: error.message }
                : upload
        ));
    }, []);

    const cancelUpload = useCallback((uploadId) => {
        const upload = uploads.find(u => u.id === uploadId);
        if (upload?.cancelToken) {
            upload.cancelToken.cancel('Upload cancelled by user');
        }

        setUploads(prev => prev.map(u =>
            u.id === uploadId
                ? { ...u, status: 'cancelled' }
                : u
        ));

        setTimeout(() => removeUpload(uploadId), 2000);
    }, [uploads]);

    const removeUpload = useCallback((uploadId) => {
        setUploads(prev => prev.filter(upload => upload.id !== uploadId));
    }, []);

    const setCancelToken = useCallback((uploadId, cancelToken) => {
        setUploads(prev => prev.map(upload =>
            upload.id === uploadId
                ? { ...upload, cancelToken }
                : upload
        ));
    }, []);

    const activeUploadsCount = uploads.filter(u => u.status === 'uploading').length;
    const hasActiveUploads = activeUploadsCount > 0;

    return (
        <UploadContext.Provider value={{
            uploads,
            addUpload,
            updateUploadProgress,
            completeUpload,
            failUpload,
            cancelUpload,
            removeUpload,
            setCancelToken,
            activeUploadsCount,
            hasActiveUploads,
        }}>
            {children}
        </UploadContext.Provider>
    );
};
