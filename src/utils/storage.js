/**
 * Safe wrapper for localStorage to prevent crashes when storage is blocked (e.g., incognito mode, third-party cookies disabled)
 */
const safeLocalStorage = {
    getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn(`Error reading from localStorage for key "${key}":`, e);
            return null;
        }
    },
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn(`Error writing to localStorage for key "${key}":`, e);
            return false;
        }
    },
    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn(`Error removing from localStorage for key "${key}":`, e);
            return false;
        }
    },
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.warn('Error clearing localStorage:', e);
            return false;
        }
    },
};

export default safeLocalStorage;
