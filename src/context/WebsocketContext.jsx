import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ToastContext';

const MAX_RECONNECT_DELAY = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;

const WebsocketContext = createContext(null);

export const WebsocketProvider = ({ children }) => {
    const queryClient = useQueryClient();
    const { token } = useAuth();
    const { showToast } = useToast();
    const ws = useRef(null);
    const reconnectTimeout = useRef(null);
    const [subscribers] = useState(new Set());
    const connectRef = useRef(null);
    const reconnectAttempts = useRef(0);

    const handleWsMessage = useCallback(
        (payload) => {
            const { type, data } = payload;
            switch (type) {
                case 'message': {
                    queryClient.setQueryData(['messages', data.chat_id], (old) => {
                        if (!old) return old;
                        if (old.find((m) => m.id === data.id)) return old;
                        return [...old, data];
                    });
                    queryClient.invalidateQueries({ queryKey: ['chats'] });

                    const currentChatId = window.location.pathname.split('/').pop();
                    if (currentChatId !== data.chat_id) {
                        showToast(`New message from ${data.sender_username}`, 'info');
                    }
                    break;
                }
                case 'notification': {
                    queryClient.setQueryData(['notifications'], (old) => {
                        if (!old) return [data];
                        return [data, ...old];
                    });
                    showToast(data.content, 'info');
                    break;
                }
                case 'auth_success': {
                    console.log('WS Authenticated as', data.user_id);
                    break;
                }
                default:
                    break;
            }
            subscribers.forEach((callback) => callback(type, data));
        },
        [queryClient, showToast, subscribers],
    );

    const connect = useCallback(() => {
        if (!token) return;
        // Stop reconnecting if we've exceeded max attempts
        if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
            console.warn('WS: Max reconnection attempts reached, stopping.');
            return;
        }
        // Don't reconnect if page is hidden (background tab)
        if (document.hidden && reconnectAttempts.current > 0) {
            reconnectTimeout.current = setTimeout(connectRef.current, 5000);
            return;
        }

        const apiUrl = api.defaults.baseURL;
        const wsUrl = apiUrl.replace(/^http/, 'ws').replace(/\/api$/, '') + '/ws';

        if (ws.current) ws.current.close();

        try {
            ws.current = new WebSocket(wsUrl);
        } catch (err) {
            console.error('Failed to create WebSocket:', err);
            return;
        }

        ws.current.onopen = () => {
            console.log('WS Connected');
            reconnectAttempts.current = 0;
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
            const delay = Math.min(1000 * 2 ** reconnectAttempts.current, MAX_RECONNECT_DELAY);
            reconnectAttempts.current += 1;
            console.log(
                `WS Disconnected, reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})...`,
            );
            reconnectTimeout.current = setTimeout(connectRef.current, delay);
        };

        ws.current.onerror = () => {
            ws.current.close();
        };
    }, [token, handleWsMessage]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        reconnectAttempts.current = 0;
        connect();
        return () => {
            if (ws.current) ws.current.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };
    }, [connect]);

    const subscribe = (callback) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
    };

    return (
        <WebsocketContext.Provider value={{ ws, subscribe }}>{children}</WebsocketContext.Provider>
    );
};

export const useWebsocketContext = () => {
    const context = useContext(WebsocketContext);
    if (!context) {
        throw new Error('useWebsocketContext must be used within a WebsocketProvider');
    }
    return context;
};
