import safeLocalStorage from './storage.js';

const SAVED_STICKERS_KEY = 'karuteens_saved_stickers';

// Maximum number of stickers a user can save locally
const MAX_SAVED_STICKERS = 100;

export const getSavedStickers = () => {
    try {
        const stored = safeLocalStorage.getItem(SAVED_STICKERS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error parsing saved stickers:', e);
        return [];
    }
};

export const saveSticker = (stickerUrl, stickerId = null) => {
    const saved = getSavedStickers();

    // Check if already saved (by URL to prevent duplicates from different sources)
    if (saved.some((s) => s.url === stickerUrl)) {
        return { success: false, message: 'Sticker already saved' };
    }

    const newSticker = {
        id: stickerId || `saved_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        url: stickerUrl,
        savedAt: new Date().toISOString(),
    };

    const newSaved = [newSticker, ...saved].slice(0, MAX_SAVED_STICKERS);

    safeLocalStorage.setItem(SAVED_STICKERS_KEY, JSON.stringify(newSaved));
    return { success: true, message: 'Sticker saved' };
};

export const removeSticker = (stickerUrl) => {
    const saved = getSavedStickers();
    const newSaved = saved.filter((s) => s.url !== stickerUrl);

    safeLocalStorage.setItem(SAVED_STICKERS_KEY, JSON.stringify(newSaved));
    return { success: true, message: 'Sticker removed' };
};

export const isStickerSaved = (stickerUrl) => {
    const saved = getSavedStickers();
    return saved.some((s) => s.url === stickerUrl);
};
