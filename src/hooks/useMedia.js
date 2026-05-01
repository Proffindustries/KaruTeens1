import { useState } from 'react';
import axios from 'axios';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';
import safeLocalStorage from '../utils/storage.js';
import imageCompression from 'browser-image-compression';
import { transformVideo, transformAudio } from '../utils/mediaTransform.js';

export const useMediaUpload = () => {
    const [isUploading, setIsUploading] = useState(false);
    const { showToast } = useToast();

    // ── Retry helper ─────────────────────────────────────────────────────────
    const withRetry = async (fn, retries = 3, delay = 1000) => {
        try {
            return await fn();
        } catch (err) {
            if (retries <= 0 || axios.isCancel(err)) throw err;
            await new Promise((resolve) => setTimeout(resolve, delay));
            return withRetry(fn, retries - 1, delay * 2);
        }
    };

    // ── Upload a (possibly transformed) file to R2 via presigned URL ─────────
    const uploadToR2 = async (file, onProgress = null, cancelToken = null) => {
        const {
            data: { url, public_url },
        } = await withRetry(() =>
            api.post(
                '/media/signature/r2',
                { file_name: file.name, content_type: file.type },
                { cancelToken },
            ),
        );

        await withRetry(() =>
            axios.put(url, file, {
                headers: { 'Content-Type': file.type },
                onUploadProgress: (progressEvent) => {
                    if (onProgress && progressEvent.total) {
                        onProgress(
                            Math.round((progressEvent.loaded * 100) / progressEvent.total),
                            progressEvent.loaded,
                        );
                    }
                },
                cancelToken,
            }),
        );

        return public_url;
    };

    // ── Images: compress → WebP → R2 ─────────────────────────────────────────
    const uploadImage = async (file, onProgress = null, cancelToken = null) => {
        setIsUploading(true);
        try {
            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1600,
                useWebWorker: true,
                fileType: 'image/webp',
                onProgress: (p) => onProgress && onProgress(Math.round(p * 0.5), 0),
            };

            const compressed = await imageCompression(file, options);
            const fileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
            const finalFile = new File([compressed], fileName, { type: 'image/webp' });

            // Progress 50–100%: upload
            const url = await uploadToR2(
                finalFile,
                onProgress ? (p, l) => onProgress(50 + Math.round(p / 2), l) : null,
                cancelToken,
            );

            return url;
        } catch (err) {
            if (axios.isCancel(err)) throw err;
            console.error('Image upload error:', err);
            showToast('Image upload failed', 'error');
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    // ── Videos: transcode (H.264 720p) → MP4 → R2 ───────────────────────────
    const uploadVideo = async (file, onProgress = null, cancelToken = null) => {
        const currentUser = JSON.parse(safeLocalStorage.getItem('user') || 'null');
        const isPremium = currentUser?.is_premium || currentUser?.role === 'premium';
        const maxSizeMB = isPremium ? 500 : 200;

        if (file.size > maxSizeMB * 1024 * 1024) {
            showToast(`Video too large (Max ${maxSizeMB}MB)`, 'error');
            throw new Error('File too large');
        }

        setIsUploading(true);
        try {
            showToast('Processing video… this may take a moment', 'info');

            // Progress 0–70%: ffmpeg transcode
            let transformed;
            try {
                transformed = await transformVideo(
                    file,
                    onProgress ? (p) => onProgress(Math.round(p * 0.7), 0) : null,
                );
            } catch (transcodeErr) {
                console.warn('Video transcode failed, using original:', transcodeErr);
                transformed = file;
            }

            // Progress 70–100%: R2 upload
            const url = await uploadToR2(
                transformed,
                onProgress ? (p, l) => onProgress(70 + Math.round(p * 0.3), l) : null,
                cancelToken,
            );

            return url;
        } catch (err) {
            if (axios.isCancel(err)) throw err;
            console.error('Video upload error:', err);
            showToast('Video upload failed', 'error');
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    // ── Audio: transcode (MP3 128kbps) → R2 ─────────────────────────────────
    const uploadAudio = async (file, onProgress = null, cancelToken = null) => {
        const currentUser = JSON.parse(safeLocalStorage.getItem('user') || 'null');
        const isPremium = currentUser?.is_premium || currentUser?.role === 'premium';
        const maxSizeMB = isPremium ? 100 : 25;

        if (file.size > maxSizeMB * 1024 * 1024) {
            showToast(`Audio too large (Max ${maxSizeMB}MB)`, 'error');
            throw new Error('File too large');
        }

        setIsUploading(true);
        try {
            showToast('Processing audio…', 'info');

            let transformed;
            try {
                transformed = await transformAudio(
                    file,
                    onProgress ? (p) => onProgress(Math.round(p * 0.7), 0) : null,
                );
            } catch (transcodeErr) {
                console.warn('Audio transcode failed, using original:', transcodeErr);
                transformed = file;
            }

            const url = await uploadToR2(
                transformed,
                onProgress ? (p, l) => onProgress(70 + Math.round(p * 0.3), l) : null,
                cancelToken,
            );

            return url;
        } catch (err) {
            if (axios.isCancel(err)) throw err;
            console.error('Audio upload error:', err);
            showToast('Audio upload failed', 'error');
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    // ── Documents / other files: straight to R2 (no transform) ──────────────
    const uploadFile = async (file, onProgress = null, cancelToken = null) => {
        const currentUser = JSON.parse(safeLocalStorage.getItem('user') || 'null');
        const isPremium = currentUser?.is_premium || currentUser?.role === 'premium';
        const maxFileSizeMB = isPremium ? 100 : 50;

        if (file.size > maxFileSizeMB * 1024 * 1024) {
            showToast(`File too large (Max ${maxFileSizeMB}MB)`, 'error');
            throw new Error('File too large');
        }

        setIsUploading(true);
        try {
            return await uploadToR2(file, onProgress, cancelToken);
        } catch (err) {
            if (axios.isCancel(err)) throw err;
            console.error('File upload error:', err);
            showToast('File upload failed after multiple attempts', 'error');
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    // ── Smart router: pick the right upload function by MIME type ───────────
    const uploadMedia = async (file, onProgress = null, cancelToken = null) => {
        if (file.type.startsWith('image/')) return uploadImage(file, onProgress, cancelToken);
        if (file.type.startsWith('video/')) return uploadVideo(file, onProgress, cancelToken);
        if (file.type.startsWith('audio/')) return uploadAudio(file, onProgress, cancelToken);
        return uploadFile(file, onProgress, cancelToken);
    };

    // ── Batch upload with concurrency control ────────────────────────────────
    const batchUpload = async (files, uploadFn, concurrency = 2) => {
        const results = [];
        const queue = [...files];

        const processQueue = async () => {
            if (queue.length === 0) return;
            const item = queue.shift();
            const promise = (async () => {
                try {
                    const result = await uploadFn(item);
                    return { status: 'fulfilled', value: result, item };
                } catch (reason) {
                    return { status: 'rejected', reason, item };
                }
            })();
            results.push(promise);
            await promise;
            if (queue.length > 0) await processQueue();
        };

        const workers = Array.from({ length: Math.min(concurrency, files.length) }, () =>
            processQueue(),
        );
        await Promise.all(workers);
        return Promise.all(results);
    };

    return {
        uploadImage,
        uploadVideo,
        uploadAudio,
        uploadFile,
        uploadMedia, // ← smart router, use this for new code
        isUploading,
        batchUpload,
    };
};
