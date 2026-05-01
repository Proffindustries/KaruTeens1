/**
 * mediaUtils.js
 *
 * URL optimization helpers for media served from R2 (raw) and Cloudinary (CDN).
 *
 * R2 URLs are served as-is — no server-side transforms available.
 * Cloudinary URLs (if any remain from legacy posts) get format/quality transforms injected.
 */

// ── Cloudinary URL optimizer (legacy images) ──────────────────────────────────

/**
 * Injects Cloudinary transformation params into a Cloudinary URL.
 * If the URL is not a Cloudinary URL, it is returned unchanged.
 *
 * @param {string} url
 * @param {string} [transformations]
 * @returns {string}
 */
const injectCloudinaryTransforms = (url, transformations) => {
    if (!url || typeof url !== 'string') return url;
    if (!url.includes('res.cloudinary.com')) return url;
    if (url.includes('f_auto') || url.includes('q_auto') || url.includes('vc_auto')) return url;

    const uploadPath = '/upload/';
    const uploadIndex = url.indexOf(uploadPath);
    if (uploadIndex === -1) return url;

    const before = url.substring(0, uploadIndex + uploadPath.length);
    const after = url.substring(uploadIndex + uploadPath.length);
    return `${before}${transformations}/${after}`;
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Optimizes an image URL.
 * - Cloudinary: injects f_auto,q_auto
 * - R2 / other CDNs: returned unchanged (already served raw)
 *
 * @param {string} url
 * @param {string} [transformations]
 * @returns {string}
 */
export const getOptimizedUrl = (url, transformations = 'f_auto,q_auto') =>
    injectCloudinaryTransforms(url, transformations);

/**
 * Optimizes a video URL.
 * - Cloudinary: injects vc_auto,q_auto,f_auto
 * - R2: returned unchanged (already H.264/MP4 after ffmpeg transform)
 *
 * @param {string} url
 * @returns {string}
 */
export const getOptimizedVideoUrl = (url) =>
    injectCloudinaryTransforms(url, 'vc_auto,q_auto,f_auto');

/**
 * Optimizes an audio URL.
 * - Cloudinary: injects f_mp3,q_auto
 * - R2: returned unchanged (already MP3 after ffmpeg transform)
 *
 * @param {string} url
 * @returns {string}
 */
export const getOptimizedAudioUrl = (url) => injectCloudinaryTransforms(url, 'f_mp3,q_auto');

/**
 * Smart dispatcher — picks the right optimizer based on media type.
 *
 * @param {string} url
 * @param {'image'|'video'|'audio'|'sticker'|string} type
 * @returns {string}
 */
export const getOptimizedMediaUrl = (url, type) => {
    if (!url) return url;
    switch (type) {
        case 'video':
            return getOptimizedVideoUrl(url);
        case 'audio':
            return getOptimizedAudioUrl(url);
        case 'image':
        case 'sticker':
        default:
            return getOptimizedUrl(url);
    }
};

/**
 * Derives a media type string from a URL or MIME type.
 * Useful when the type isn't explicitly stored.
 *
 * @param {string} url
 * @returns {'image'|'video'|'audio'|'file'}
 */
export const inferMediaType = (url) => {
    if (!url) return 'file';
    const lower = url.toLowerCase().split('?')[0]; // strip query params
    if (/\.(mp4|webm|mov|avi|mkv|ogv)$/.test(lower)) return 'video';
    if (/\.(mp3|ogg|wav|flac|aac|m4a)$/.test(lower)) return 'audio';
    if (/\.(jpg|jpeg|png|gif|webp|avif|svg)$/.test(lower)) return 'image';
    return 'file';
};
