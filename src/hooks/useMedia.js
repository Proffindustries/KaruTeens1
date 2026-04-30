import { useState } from 'react';
import axios from 'axios';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';
import safeLocalStorage from '../utils/storage.js';

import imageCompression from 'browser-image-compression';

export const useMediaUpload = () => {
    const [isUploading, setIsUploading] = useState(false);
    const { showToast } = useToast();

    // Helper for retrying failed requests
    const withRetry = async (fn, retries = 3, delay = 1000) => {
        try {
            return await fn();
        } catch (err) {
            if (retries <= 0 || axios.isCancel(err)) throw err;
            await new Promise((resolve) => setTimeout(resolve, delay));
            return withRetry(fn, retries - 1, delay * 2);
        }
    };

    const uploadImage = async (file, onProgress = null, cancelToken = null) => {
        setIsUploading(true);
        try {
            // Compress and convert to WebP
            const options = {
                maxSizeMB: 0.5, // Reduced from 0.8 to 0.5
                maxWidthOrHeight: 1600, // Reduced from 1920 to 1600 for mobile-first
                useWebWorker: true,
                fileType: 'image/webp', // Force WebP conversion
                onProgress: (progress) => {
                    if (onProgress) {
                        onProgress(Math.round(progress * 0.15), 0);
                    }
                },
            };

            const compressedFile = await imageCompression(file, options);
            
            // Rename to .webp if it was converted
            const fileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            const finalFile = new File([compressedFile], fileName, { type: 'image/webp' });

            // 1. Get signature from backend
            const timestamp = Math.round(new Date().getTime() / 1000).toString();
            const params = {
                timestamp,
                folder: 'karuteens_posts',
            };

            const {
                data: { signature },
            } = await withRetry(() => api.post('/media/signature/cloudinary', { params }, { cancelToken }));

            // 2. Upload to Cloudinary
            const formData = new FormData();
            formData.append('file', finalFile);
            formData.append('api_key', import.meta.env.VITE_CLOUDINARY_API_KEY);
            formData.append('timestamp', timestamp);
            formData.append('signature', signature);
            formData.append('folder', 'karuteens_posts');

            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
            const uploadRes = await withRetry(() =>
                axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, formData, {
                    onUploadProgress: (progressEvent) => {
                        if (onProgress && progressEvent.total) {
                            const percentCompleted = Math.round(
                                (progressEvent.loaded * 100) / progressEvent.total,
                            );
                            const scaledProgress = 15 + Math.round(percentCompleted * 0.85);
                            onProgress(scaledProgress, progressEvent.loaded);
                        }
                    },
                    cancelToken,
                }),
            );

            return uploadRes.data.secure_url;
        } catch (err) {
            if (axios.isCancel(err)) {
                console.log('Upload cancelled');
                throw err;
            }
            console.error('Image upload error:', err);
            showToast('Image upload failed', 'error');
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    const uploadFile = async (file, onProgress = null, cancelToken = null) => {
        const currentUser = JSON.parse(safeLocalStorage.getItem('user') || 'null');
        const isPremium = currentUser?.is_premium || currentUser?.role === 'premium';
        const maxFileSizeMB = isPremium ? 100 : 50;
        const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

        // Enforce limit for generic files
        if (file.size > maxFileSizeBytes) {
            showToast(`File too large (Max ${maxFileSizeMB}MB)`, 'error');
            throw new Error('File too large');
        }

        setIsUploading(true);
        try {
            // 1. Get presigned URL from backend
            const {
                data: { url, public_url },
            } = await withRetry(() =>
                api.post('/media/signature/r2', {
                    file_name: file.name,
                    content_type: file.type,
                }, { cancelToken }),
            );

            // 2. Upload directly to R2 using the presigned URL
            await withRetry(() =>
                axios.put(url, file, {
                    headers: { 'Content-Type': file.type },
                    onUploadProgress: (progressEvent) => {
                        if (onProgress && progressEvent.total) {
                            const percentCompleted = Math.round(
                                (progressEvent.loaded * 100) / progressEvent.total,
                            );
                            onProgress(percentCompleted, progressEvent.loaded);
                        }
                    },
                    cancelToken,
                }),
            );

            return public_url;
        } catch (err) {
            if (axios.isCancel(err)) {
                console.log('Upload cancelled');
                throw err;
            }
            console.error('File upload error:', err);
            showToast('File upload failed after multiple attempts', 'error');
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    const batchUpload = async (files, uploadFn, concurrency = 2) => {
        const results = [];
        const queue = [...files];
        const executing = new Set();

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
            executing.add(promise);
            const r = await promise;
            executing.delete(promise);

            if (queue.length > 0) {
                await processQueue();
            }
        };

        const workers = Array.from({ length: Math.min(concurrency, files.length) }, () =>
            processQueue(),
        );
        await Promise.all(workers);
        return Promise.all(results);
    };

    return { uploadImage, uploadFile, isUploading, batchUpload };
};

