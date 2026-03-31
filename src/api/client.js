import axios from 'axios';

let baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api';
if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
if (!baseUrl.endsWith('/api')) baseUrl += '/api';

const api = axios.create({
    baseURL: baseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        // Strip redundant /api if it's already there (it might be '/api/...')
        if (config.url) {
            config.url = config.url.replace(/^\/api\//, '/').replace(/^\/api$/, '/');
            // Ensure no double slashes at the start after replacement
            if (config.url.startsWith('//')) config.url = config.url.substring(1);
        }

        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Fire an event so AuthContext can clear state + React Router navigates cleanly
            // instead of doing a hard page reload that nukes all React state.
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
        return Promise.reject(error);
    },
);

export default api;
