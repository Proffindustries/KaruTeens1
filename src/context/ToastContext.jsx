import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import '../styles/Toast.css';

const ToastContext = createContext();

const ICONS = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const timerRefs = useRef({});

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        if (timerRefs.current[id]) {
            clearTimeout(timerRefs.current[id]);
            delete timerRefs.current[id];
        }
    }, []);

    const showToast = useCallback(
        (message, type = 'info', duration = 4000, action = null) => {
            const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            setToasts((prev) => [...prev, { id, message, type, action }]);

            if (duration > 0) {
                timerRefs.current[id] = setTimeout(() => {
                    removeToast(id);
                }, duration);
            }

            return id;
        },
        [removeToast],
    );

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-container" role="region" aria-label="Notifications">
                <AnimatePresence>
                    {toasts.map((toast) => {
                        const Icon = ICONS[toast.type] || Info;
                        return (
                            <motion.div
                                key={toast.id}
                                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                                className={`toast toast-${toast.type}`}
                                role="alert"
                            >
                                <div className="toast-icon">
                                    <Icon size={20} />
                                </div>
                                <div className="toast-content">{toast.message}</div>
                                <div className="toast-actions">
                                    {toast.action && (
                                        <button
                                            className="toast-action-btn"
                                            onClick={() => {
                                                toast.action.onClick();
                                                removeToast(toast.id);
                                            }}
                                        >
                                            {toast.action.label}
                                        </button>
                                    )}
                                    <button
                                        className="toast-close"
                                        onClick={() => removeToast(toast.id)}
                                        aria-label="Dismiss notification"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
