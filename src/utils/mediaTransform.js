/**
 * mediaTransform.js
 *
 * Browser-side media transformation pipeline using ffmpeg.wasm.
 * Transforms video and audio files before uploading to R2.
 *
 * Pipeline:
 *   Video  → transcode to H.264/AAC MP4, cap at 720p, CRF 28 (good quality, ~40% smaller)
 *   Audio  → transcode to MP3 128kbps (universal playback)
 *   Images → handled separately by browser-image-compression
 *   Docs   → passed through unchanged
 */

let ffmpegInstance = null;
let ffmpegLoading = null;

/**
 * Lazily load and cache a single ffmpeg.wasm instance.
 * Uses a singleton promise to prevent double-loading.
 */
const getFFmpeg = async (onProgress) => {
    if (ffmpegInstance) return ffmpegInstance;

    if (ffmpegLoading) return ffmpegLoading;

    ffmpegLoading = (async () => {
        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        const { toBlobURL } = await import('@ffmpeg/util');

        const ffmpeg = new FFmpeg();

        // Load the multi-threaded core (requires COOP/COEP headers)
        const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
        });

        ffmpegInstance = ffmpeg;
        ffmpegLoading = null;
        return ffmpeg;
    })();

    return ffmpegLoading;
};

/**
 * Transforms a video file:
 *  - Re-encodes to H.264 + AAC inside an MP4 container
 *  - Caps resolution at 720p (keeps aspect ratio)
 *  - CRF 28 → good quality with ~30–50% size reduction
 *  - Strips unnecessary metadata
 *
 * @param {File} file
 * @param {(pct: number) => void} [onProgress]
 * @returns {Promise<File>} transformed .mp4 File
 */
export const transformVideo = async (file, onProgress) => {
    const { fetchFile } = await import('@ffmpeg/util');
    let ffmpeg;
    try {
        ffmpeg = await getFFmpeg(onProgress);
    } catch (err) {
        console.warn('FFmpeg failed to load, falling back to original video file:', err);
        return file;
    }

    const inputName = 'input_' + Date.now() + '.' + (file.name.split('.').pop() || 'mp4');
    const outputName = 'output_' + Date.now() + '.mp4';

    // Wire up progress reporting
    if (onProgress) {
        ffmpeg.on('progress', ({ progress }) => {
            onProgress(Math.round(progress * 100));
        });
    }

    await ffmpeg.writeFile(inputName, await fetchFile(file));
    console.log(`[FFmpeg] Input file size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

    await ffmpeg.exec([
        '-i',
        inputName,
        // Video: H.264, cap at 720p, CRF 28, fast preset for browser speed
        '-c:v',
        'libx264',
        '-crf',
        '28',
        '-preset',
        'fast',
        '-vf',
        'scale=w=1280:h=720:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2',
        // Audio: AAC 128kbps stereo
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-ac',
        '2',
        // Strip metadata, fast-start for web streaming
        '-map_metadata',
        '-1',
        '-movflags',
        '+faststart',
        outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const outputSize = data.buffer.byteLength;
    console.log(`[FFmpeg] Output file size: ${(outputSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[FFmpeg] Reduction: ${Math.round((1 - outputSize / file.size) * 100)}%`);

    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    return new File([data.buffer], `${baseName}.mp4`, { type: 'video/mp4' });
};

/**
 * Transforms an audio file:
 *  - Re-encodes to MP3 128kbps (universally supported)
 *  - Strips metadata
 *
 * @param {File} file
 * @param {(pct: number) => void} [onProgress]
 * @returns {Promise<File>} transformed .mp3 File
 */
export const transformAudio = async (file, onProgress) => {
    const { fetchFile } = await import('@ffmpeg/util');
    let ffmpeg;
    try {
        ffmpeg = await getFFmpeg(onProgress);
    } catch (err) {
        console.warn('FFmpeg failed to load, falling back to original audio file:', err);
        return file;
    }

    const inputName = 'audio_in_' + Date.now() + '.' + (file.name.split('.').pop() || 'mp3');
    const outputName = 'audio_out_' + Date.now() + '.mp3';

    if (onProgress) {
        ffmpeg.on('progress', ({ progress }) => {
            onProgress(Math.round(progress * 100));
        });
    }

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    await ffmpeg.exec([
        '-i',
        inputName,
        '-c:a',
        'libmp3lame',
        '-b:a',
        '128k',
        '-ac',
        '2',
        '-map_metadata',
        '-1',
        outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    return new File([data.buffer], `${baseName}.mp3`, { type: 'audio/mpeg' });
};

/**
 * Returns true if the file needs ffmpeg transformation.
 */
export const needsTransform = (file) =>
    file.type.startsWith('video/') || file.type.startsWith('audio/');
