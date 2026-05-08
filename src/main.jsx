import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';
import './styles/index.css';
import { ToastProvider } from './context/ToastContext.jsx';
import { UploadProvider } from './context/UploadContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { STALE_TIMES } from './utils/queryConfig';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: STALE_TIMES.FEED_POSTS,
            gcTime: 15 * 60 * 1000, // 15 min garbage collection (React Query v5)
            refetchOnWindowFocus: false,
            retry: 1,
            refetchOnReconnect: true,
        },
        mutations: {
            retry: 1,
        },
    },
});

const isProd = import.meta.env.MODE === 'production';

const logVitalsToAnalytics = (metric) => {
    if (isProd && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(
            '/api/vitals',
            JSON.stringify({
                name: metric.name,
                value: metric.value,
                rating: metric.rating,
                delta: metric.delta,
                id: metric.id,
            }),
        );
    }
};

const PerformanceMonitor = ({ children }) => {
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('web-vitals')
                .then((webVitals) => {
                    if (webVitals.onCLS) webVitals.onCLS(logVitalsToAnalytics);
                    if (webVitals.onFID) webVitals.onFID(logVitalsToAnalytics);
                    if (webVitals.onFCP) webVitals.onFCP(logVitalsToAnalytics);
                    if (webVitals.onLCP) webVitals.onLCP(logVitalsToAnalytics);
                    if (webVitals.onTTFB) webVitals.onTTFB(logVitalsToAnalytics);
                })
                .catch(() => {});
        }
    }, []);
    return children;
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <HelmetProvider>
            <AuthProvider>
                <QueryClientProvider client={queryClient}>
                    <ThemeProvider>
                        <BrowserRouter>
                            <ToastProvider>
                                <UploadProvider>
                                    <PerformanceMonitor>
                                        <App />
                                    </PerformanceMonitor>
                                </UploadProvider>
                            </ToastProvider>
                        </BrowserRouter>
                    </ThemeProvider>
                </QueryClientProvider>
            </AuthProvider>
        </HelmetProvider>
    </React.StrictMode>,
);
