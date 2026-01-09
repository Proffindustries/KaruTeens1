import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ToastContext';

const WebsocketContext = createContext(null);

export const WebsocketProvider = ({ children }) => {
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const ws = useRef(null);
    const reconnectTimeout = useRef(null);
    const [subscribers, setSubscribers] = useState(new Set());

    const subscribe = useCallback((callback) => {
        setSubscribers((prev) => {
            const next = new Set(prev);
            next.add(callback);
            return next;
        });
        return () => {
            setSubscribers((prev) => {
                const next = new Set(prev);
                next.delete(callback);
                return next;
            });
        };
    }, []);

    const handleWsMessage = useCallback((payload) => {
        const { type, data } = payload;

        // Global handling (Cache updates & Toasts)
        switch (type) {
            case 'message':
                queryClient.setQueryData(['messages', data.chat_id], (old) => {
                    if (!old) return old;
                    if (old.find(m => m.id === data.id)) return old;
                    return [...old, data];
                });
                queryClient.invalidateQueries({ queryKey: ['chats'] });

                const currentChatId = window.location.pathname.split('/').pop();
                if (currentChatId !== data.chat_id) {
                    showToast(`New message from ${data.sender_username}`, 'info');
                }
                break;

            case 'notification':
                queryClient.setQueryData(['notifications'], (old) => {
                    if (!old) return [data];
                    return [data, ...old];
                });
                showToast(data.content, 'info');
                break;

            case 'auth_success':
                console.log('WS Authenticated as', data.user_id);
                break;
        }

        // Notify subscribers (e.g., MessagesPage for WebRTC)
        subscribers.forEach((callback) => callback(type, data));
    }, [queryClient, showToast, subscribers]);

    const connect = useCallback(() => {
        if (!token) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

        // Development vs Production URL derivation
        let wsUrl;
        if (import.meta.env.VITE_WS_URL) {
            wsUrl = import.meta.env.VITE_WS_URL;
        } else if (import.meta.env.VITE_API_URL) {
            let base = import.meta.env.VITE_API_URL.replace(/\/$/, "");
            if (base.endsWith("/api")) {
                base = base.slice(0, -4);
            }
            wsUrl = base.replace(/^http/, "ws") + "/ws";
        } else {
            // Fallback for local development
            const host = window.location.hostname; // Just use hostname to avoid port confusion
            const wsPort = "3000"; // Backend default port
            wsUrl = `ws://${host}:${wsPort}/ws`;
        }

        if (ws.current) ws.current.close();
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log('WS Connected');
            if (ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'auth', token }));
            }
        };

        ws.current.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                handleWsMessage(payload);
            } catch (err) {
                console.error('WS Parse error', err);
            }
        };

        ws.current.onclose = () => {
            console.log('WS Disconnected, reconnecting...');
            reconnectTimeout.current = setTimeout(connect, 3000);
        };

        ws.current.onerror = (err) => {
            console.error('WS Error', err);
            ws.current.close();
        };
    }, [token, handleWsMessage]);

    useEffect(() => {
        connect();
        return () => {
            if (ws.current) ws.current.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };
    }, [connect]);

    return (
        <WebsocketContext.Provider value={{ ws: ws.current, subscribe }}>
            {children}
        </WebsocketContext.Provider>
    );
};

export const useWebsocketContext = () => {
    const context = useContext(WebsocketContext);
    if (!context) {
        throw new Error('useWebsocketContext must be used within a WebsocketProvider');
    }
    return context;
};
