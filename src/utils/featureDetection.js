/**
 * Robust storage and feature availability detection
 */
export const isStorageAvailable = (type = 'localStorage') => {
    try {
        const storage = window[type];
        const x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    } catch (e) {
        return false;
    }
};

export const isIndexedDBAvailable = () => {
    try {
        return typeof window.indexedDB !== 'undefined' && window.indexedDB !== null;
    } catch (e) {
        return false;
    }
};
