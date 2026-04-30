/**
 * Applies Cloudinary transformations to an image URL to ensure optimal delivery.
 * Automatically adds f_auto (auto format like WebP/AVIF) and q_auto (auto quality).
 *
 * @param {string} url - The original Cloudinary URL.
 * @param {string} [transformations='f_auto,q_auto'] - Additional transformations.
 * @returns {string} - The optimized URL.
 */
export const getOptimizedUrl = (url, transformations = 'f_auto,q_auto') => {
    if (!url || typeof url !== 'string') return url;

    // Only optimize Cloudinary URLs
    if (!url.includes('res.cloudinary.com')) return url;

    // If it already has f_auto or q_auto, assume it's optimized
    if (url.includes('f_auto') || url.includes('q_auto')) return url;

    // Cloudinary URLs typically look like:
    // https://res.cloudinary.com/<cloud_name>/image/upload/v1234567890/folder/image.jpg
    // We want to insert transformations after /upload/
    const uploadPath = '/upload/';
    const uploadIndex = url.indexOf(uploadPath);

    if (uploadIndex === -1) return url;

    const beforeUpload = url.substring(0, uploadIndex + uploadPath.length);
    const afterUpload = url.substring(uploadIndex + uploadPath.length);

    // Insert auto format and auto quality
    return `${beforeUpload}${transformations}/${afterUpload}`;
};
