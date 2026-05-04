import axios from 'axios';
import { handleApiError, parseApiError } from '../utils/errorHandling.js';
import safeLocalStorage from '../utils/storage.js';

// Recursively flattens MongoDB $oid objects into strings and renames _id to id
function flattenOid(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    // Handle $oid directly
    if (obj.$oid && typeof obj.$oid === 'string') {
        return obj.$oid;
    }

    if (Array.isArray(obj)) {
        return obj.map(flattenOid);
    }

    const flattened = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = flattenOid(obj[key]);

            if (key === '_id') {
                flattened['id'] = value;
                flattened['_id'] = value; // Keep _id for backward compatibility
            } else {
                flattened[key] = value;
            }
        }
    }
    return flattened;
}

let baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api';
if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
if (!baseUrl.endsWith('/api')) baseUrl += '/api';

const api = axios.create({
    baseURL: baseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 second timeout for regular requests
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // Strip redundant /api if it's already there (it might be '/api/...')
        if (config.url) {
            config.url = config.url.replace(/^\/api\//, '/').replace(/^\/api$/, '/');
            // Ensure no double slashes at the start after replacement
            if (config.url.startsWith('//')) config.url = config.url.substring(1);
        }

        const token = safeLocalStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = generateRequestId();

        return config;
    },
    (error) => {
        return Promise.reject(parseApiError(error));
    },
);

// Response interceptor with enhanced error handling and BSON flattening
api.interceptors.response.use(
    (response) => {
        if (response.data) {
            response.data = flattenOid(response.data);
        }
        return response;
    },
    (error) => {
        const appError = parseApiError(error);

        // Handle authentication errors
        if (appError.requiresAuth()) {
            // Don't fire the event if we're already trying to logout or if it's the Ably auth endpoint
            // (Ably auth might fail if user is not logged in, but shouldn't trigger a logout loop)
            const isLogoutCall =
                error.config?.url?.endsWith('/auth/logout') ||
                error.config?.url?.endsWith('/logout');
            const isAblyAuthCall = error.config?.url?.endsWith('/ably/auth');
            const isMediaCall = error.config?.url?.includes('/media/signature/');

            if (!isLogoutCall && !isAblyAuthCall && !isMediaCall) {
                // Fire an event so AuthContext can clear state + React Router navigates cleanly
                window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            }
        }

        // Log detailed error information for debugging
        if (appError.isServerError()) {
            console.error('Server Error:', {
                error: appError,
                requestId: appError.requestId,
                timestamp: appError.timestamp,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                },
            });
        }

        return Promise.reject(appError);
    },
);

// Generate unique request ID for tracking
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Enhanced API methods with error handling
const apiMethods = {
    get: (url, config = {}) => {
        return api.get(url, config).catch((error) => {
            throw handleApiError(error, { showToast: false }); // Let calling component handle toast
        });
    },

    post: (url, data = {}, config = {}) => {
        return api.post(url, data, config).catch((error) => {
            throw handleApiError(error, { showToast: false });
        });
    },

    put: (url, data = {}, config = {}) => {
        return api.put(url, data, config).catch((error) => {
            throw handleApiError(error, { showToast: false });
        });
    },

    patch: (url, data = {}, config = {}) => {
        return api.patch(url, data, config).catch((error) => {
            throw handleApiError(error, { showToast: false });
        });
    },

    delete: (url, config = {}) => {
        return api.delete(url, config).catch((error) => {
            throw handleApiError(error, { showToast: false });
        });
    },

    // Method for file uploads with progress tracking
    upload: (url, formData, onProgress = null, config = {}) => {
        return api
            .post(url, formData, {
                ...config,
                headers: {
                    ...config.headers,
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: onProgress
                    ? (progressEvent) => {
                          const progress = Math.round(
                              (progressEvent.loaded * 100) / progressEvent.total,
                          );
                          onProgress(progress, progressEvent);
                      }
                    : undefined,
            })
            .catch((error) => {
                throw handleApiError(error, { showToast: false });
            });
    },
};

export default apiMethods;
export { api }; // Export raw axios instance for advanced use cases
