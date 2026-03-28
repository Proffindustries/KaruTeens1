import { useState } from 'react';
import axios from 'axios';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';

import imageCompression from 'browser-image-compression';

export const useMediaUpload = () => {
    const [isUploading, setIsUploading] = useState(false);
    const { showToast } = useToast();

    const uploadImage = async (file, onProgress = null) => {
        setIsUploading(true);
        try {
            // Compress the image before uploading
            const options = {
                maxSizeMB: 1, // Compress to max 1MB
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                onProgress: (progress) => {
                    // Report compression progress as the first 20% of the total upload progress
                    if (onProgress) {
                        onProgress(Math.round(progress * 0.2), 0);
                    }
                },
            };

            const compressedFile = await imageCompression(file, options);

            // 1. Get signature from backend
            const timestamp = Math.round(new Date().getTime() / 1000).toString();
            const params = {
                timestamp,
                folder: 'karuteens_posts',
            };

            const {
                data: { signature },
            } = await api.post('/media/signature/cloudinary', { params });

            // 2. Upload to Cloudinary
            const formData = new FormData();
            formData.append('file', compressedFile);
            formData.append('api_key', import.meta.env.VITE_CLOUDINARY_API_KEY);
            formData.append('timestamp', timestamp);
            formData.append('signature', signature);
            formData.append('folder', 'karuteens_posts');

            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
            const uploadRes = await axios.post(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                formData,
                {
                    onUploadProgress: (progressEvent) => {
                        if (onProgress && progressEvent.total) {
                            const percentCompleted = Math.round(
                                (progressEvent.loaded * 100) / progressEvent.total,
                            );
                            const scaledProgress = 20 + Math.round(percentCompleted * 0.8);
                            onProgress(scaledProgress, progressEvent.loaded);
                        }
                    },
                },
            );

            return uploadRes.data.secure_url;
        } catch (err) {
            showToast('Image upload failed', 'error');
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    const uploadFile = async (file, onProgress = null, cancelToken = null) => {
        setIsUploading(true);
        try {
            // 1. Get presigned URL from backend
            const {
                data: { url, public_url },
            } = await api.post('/media/signature/r2', {
                file_name: file.name,
                content_type: file.type,
            });

            // 2. Upload to R2 directly using the presigned URL
            await axios.put(url, file, {
                headers: {
                    'Content-Type': file.type,
                },
                onUploadProgress: (progressEvent) => {
                    if (onProgress && progressEvent.total) {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total,
                        );
                        onProgress(percentCompleted, progressEvent.loaded);
                    }
                },
                cancelToken: cancelToken,
            });

            return public_url;
        } catch (err) {
            if (axios.isCancel(err)) {
                showToast('Upload cancelled', 'info');
            } else {
                showToast('File upload failed', 'error');
            }
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    return { uploadImage, uploadFile, isUploading };
};
