import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';
import { useUpload } from '../context/UploadContext.jsx';
import safeLocalStorage from '../utils/storage.js';
import imageCompression from 'browser-image-compression';

const withRetry = async (fn, retries = 3, delay = 1000) => {
    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (err) {
            if (axios.isCancel(err)) throw err;
            if (i >= retries) throw err;
            await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
        }
    }
};

const pollJobStatus = async (jobId, maxAttempts = 60) => {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const { data } = await api.get(`/media/status/${jobId}`);
            if (data.status === 'completed') return data;
            if (data.status === 'failed') throw new Error(data.error || 'Optimization failed');
        } catch (err) {
            if (err.message.includes('failed')) throw err;
        }
        await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error('Optimization timed out');
};

const uploadToR2 = async (file, onProgress = null, cancelToken = null) => {
    const { data } = await withRetry(() =>
        api.post(
            '/media/signature/r2',
            { file_name: file.name, content_type: file.type },
            { cancelToken },
        ),
    );
    await withRetry(() =>
        axios.put(data.url, file, {
            headers: { 'Content-Type': file.type },
            onUploadProgress: onProgress
                ? (pe) =>
                      pe.total && onProgress(Math.round((pe.loaded * 100) / pe.total), pe.loaded)
                : undefined,
            cancelToken,
        }),
    );
    return { public_url: data.public_url, final_public_url: data.final_public_url };
};

export const useMediaUpload = () => {
    const [isUploading, setIsUploading] = useState(false);
    const { showToast } = useToast();
    const { addUpload, updateUploadProgress, completeUpload, failUpload, setCancelToken } =
        useUpload();

    const uploadImage = async (file, onProgress = null, cancelToken = null) => {
        if (!file.type || !file.type.startsWith('image/')) {
            showToast('Invalid file type. Only images are allowed.', 'error');
            throw new Error('Invalid file type');
        }
        if (file.size > 50 * 1024 * 1024) {
            showToast('Image too large (Max 50MB)', 'error');
            throw new Error('File too large');
        }
        setIsUploading(true);
        const uploadId = addUpload({ fileName: file.name, fileSize: file.size, type: 'image' });
        try {
            let finalFile = file;
            let finalName = file.name;

            const isGif = file.type === 'image/gif' || file.name.match(/\.gif$/i);
            const isWebp = file.type === 'image/webp' || file.name.match(/\.webp$/i);
            const isSmall = file.size <= 1 * 1024 * 1024;

            if (!isGif && !isWebp && !isSmall) {
                const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 2000,
                    useWebWorker: true,
                    fileType: file.type === 'image/png' ? 'image/webp' : file.type,
                };
                const compressed = await imageCompression(file, options);
                finalFile = compressed;
            }

            const { final_public_url } = await uploadToR2(
                finalFile,
                (p, l) => {
                    updateUploadProgress(uploadId, p, l);
                    if (onProgress) onProgress(p, l);
                },
                cancelToken,
            );
            completeUpload(uploadId, final_public_url);
            return final_public_url;
        } catch (err) {
            if (axios.isCancel(err)) throw err;
            failUpload(uploadId, err);
            showToast('Image upload failed', 'error');
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    const uploadVideo = async (file, onProgress = null, cancelToken = null) => {
        const currentUser = JSON.parse(safeLocalStorage.getItem('user') || 'null');
        const maxSizeMB = currentUser?.is_premium || currentUser?.role === 'premium' ? 1000 : 200;
        if (file.size > maxSizeMB * 1024 * 1024) {
            showToast(`Video too large (Max ${maxSizeMB}MB)`, 'error');
            throw new Error('File too large');
        }
        setIsUploading(true);
        const uploadId = addUpload({ fileName: file.name, fileSize: file.size, type: 'video' });
        try {
            const { final_public_url } = await uploadToR2(
                file,
                (p, l) => {
                    updateUploadProgress(uploadId, p, l);
                    if (onProgress) onProgress(p, l);
                },
                cancelToken,
            );
            completeUpload(uploadId, final_public_url);
            return final_public_url;
        } catch (err) {
            if (axios.isCancel(err)) throw err;
            failUpload(uploadId, err);
            showToast('Video upload failed', 'error');
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    const uploadAudio = async (file, onProgress = null, cancelToken = null) => {
        const currentUser = JSON.parse(safeLocalStorage.getItem('user') || 'null');
        const maxSizeMB = currentUser?.is_premium || currentUser?.role === 'premium' ? 200 : 50;
        if (file.size > maxSizeMB * 1024 * 1024) {
            showToast(`Audio too large (Max ${maxSizeMB}MB)`, 'error');
            throw new Error('File too large');
        }
        setIsUploading(true);
        const uploadId = addUpload({ fileName: file.name, fileSize: file.size, type: 'audio' });
        try {
            const { public_url, final_public_url } = await uploadToR2(
                file,
                (p, l) => {
                    updateUploadProgress(uploadId, p, l);
                    if (onProgress) onProgress(p, l);
                },
                cancelToken,
            );
            const { data } = await api.post('/media/process', {
                temp_url: public_url,
                media_type: file.name.includes('voice_note') ? 'voice_note' : 'audio',
                original_name: file.name,
            });
            if (file.name.includes('voice_note')) await pollJobStatus(data.job_id);
            completeUpload(uploadId, final_public_url);
            return final_public_url;
        } catch (err) {
            if (axios.isCancel(err)) throw err;
            failUpload(uploadId, err);
            showToast('Audio upload failed', 'error');
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    const uploadFile = async (file, onProgress = null, cancelToken = null) => {
        setIsUploading(true);
        const uploadId = addUpload({ fileName: file.name, fileSize: file.size, type: 'file' });
        try {
            const { final_public_url } = await uploadToR2(
                file,
                (p, l) => {
                    updateUploadProgress(uploadId, p, l);
                    if (onProgress) onProgress(p, l);
                },
                cancelToken,
            );
            completeUpload(uploadId, final_public_url);
            return final_public_url;
        } catch (err) {
            if (axios.isCancel(err)) throw err;
            failUpload(uploadId, err);
            showToast('File upload failed', 'error');
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    const uploadMedia = async (file, onProgress = null, cancelToken = null) => {
        if (file.type.startsWith('image/')) return uploadImage(file, onProgress, cancelToken);
        if (file.type.startsWith('video/')) return uploadVideo(file, onProgress, cancelToken);
        if (file.type.startsWith('audio/')) return uploadAudio(file, onProgress, cancelToken);
        return uploadFile(file, onProgress, cancelToken);
    };

    const batchUpload = async (files, uploadFn, concurrency = 2) => {
        const results = new Array(files.length).fill(null);
        const queue = files.map((f, i) => ({ file: f, index: i }));
        const next = async () => {
            if (queue.length === 0) return;
            const { file, index } = queue.shift();
            try {
                const url = await uploadFn(file);
                results[index] = { status: 'fulfilled', value: url, file };
            } catch (reason) {
                results[index] = { status: 'rejected', reason, file };
            }
            await next();
        };
        const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => next());
        await Promise.all(workers);
        return results;
    };

    return {
        uploadImage,
        uploadVideo,
        uploadAudio,
        uploadFile,
        uploadMedia,
        isUploading,
        batchUpload,
    };
};
