import { useState } from 'react';
import axios from 'axios';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';
import safeLocalStorage from '../utils/storage.js';
import imageCompression from 'browser-image-compression';

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

    const pollJobStatus = async (jobId, maxAttempts = 60) => {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const { data } = await api.get(`/media/status/${jobId}`);
                if (data.status === 'completed') return data;
                if (data.status === 'failed') throw new Error(data.error || 'Optimization failed');
            } catch (err) {
                if (err.message.includes('failed')) throw err;
                // Job might not be in DB yet, ignore and continue
            }
            await new Promise((r) => setTimeout(r, 2000)); // Poll every 2s
        }
        throw new Error('Optimization timed out');
    };

    // ── Upload a (possibly transformed) file to R2 via presigned URL ─────────
    const uploadToR2 = async (file, onProgress = null, cancelToken = null) => {
        const {
            data: { url, public_url, final_public_url },
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

        return { public_url, final_public_url };
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
            const { final_public_url } = await uploadToR2(
                finalFile,
                onProgress ? (p, l) => onProgress(50 + Math.round(p / 2), l) : null,
                cancelToken,
            );

            return final_public_url;
        } catch (err) {
            if (axios.isCancel(err)) throw err;
            console.error('Image upload error:', err);
            showToast('Image upload failed', 'error');
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    // ── Videos: Upload raw -> Trigger async process -> Return raw URL immediately ──
    const uploadVideo = async (file, onProgress = null, cancelToken = null) => {
        const currentUser = JSON.parse(safeLocalStorage.getItem('user') || 'null');
        const isPremium = currentUser?.is_premium || currentUser?.role === 'premium';
        const maxSizeMB = isPremium ? 1000 : 200;

        if (file.size > maxSizeMB * 1024 * 1024) {
            showToast(`Video too large (Max ${maxSizeMB}MB)`, 'error');
            throw new Error('File too large');
        }

        setIsUploading(true);
        try {
            // 1. Upload Raw to R2
            const { public_url, final_public_url } = await uploadToR2(
                file,
                onProgress,
                cancelToken,
            );

            // 2. Trigger Server Processing (Fire-and-forget)
            // We don't await this so the user can continue immediately
            api.post('/media/process', {
                temp_url: public_url,
                media_type: 'video',
                original_name: file.name,
            }).catch(err => console.error('Background optimization trigger failed:', err));

            // Return the raw URL immediately for the post creation
            return final_public_url;
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
        const maxSizeMB = isPremium ? 200 : 50;

        if (file.size > maxSizeMB * 1024 * 1024) {
            showToast(`Audio too large (Max ${maxSizeMB}MB)`, 'error');
            throw new Error('File too large');
        }

        setIsUploading(true);
        try {
            const { public_url, final_public_url } = await uploadToR2(
                file,
                onProgress,
                cancelToken,
            );

            const { data } = await api.post('/media/process', {
                temp_url: public_url,
                media_type: file.name.includes('voice_note') ? 'voice_note' : 'audio',
                original_name: file.name,
            });

            if (file.name.includes('voice_note')) {
                await pollJobStatus(data.job_id);
            }

            return final_public_url;
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
        setIsUploading(true);
        try {
            const { final_public_url } = await uploadToR2(file, onProgress, cancelToken);
            return final_public_url;
        } catch (err) {
            if (axios.isCancel(err)) throw err;
            console.error('File upload error:', err);
            showToast('File upload failed', 'error');
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
