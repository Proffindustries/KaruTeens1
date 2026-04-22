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

console.log('Main.jsx loaded');

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: STALE_TIMES.FEED_POSTS, // Use our standardized constant
            cacheTime: 30 * 60 * 1000, // 30 minutes
            refetchOnWindowFocus: false,
            retry: 1,
        },
        mutations: {
            retry: 1,
        },
    },
});

// Performance monitoring component
const PerformanceMonitor = ({ children }) => {
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('web-vitals')
                .then((webVitals) => {
                    const sendToAnalytics = (metric) => {
                        // In a real app, you would send this to your analytics endpoint
                        console.log('Web Vitals:', metric.name, metric.value);
                    };

                    if (webVitals.onCLS) webVitals.onCLS(sendToAnalytics);
                    if (webVitals.onFID) webVitals.onFID(sendToAnalytics);
                    if (webVitals.onFCP) webVitals.onFCP(sendToAnalytics);
                    if (webVitals.onLCP) webVitals.onLCP(sendToAnalytics);
                    if (webVitals.onTTFB) webVitals.onTTFB(sendToAnalytics);
                })
                .catch((err) => {
                    console.error('Failed to load web-vitals:', err);
                });
        }
    }, []);
    return children;
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
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
    </React.StrictMode>,
);
