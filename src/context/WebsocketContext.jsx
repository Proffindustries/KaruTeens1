import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ToastContext';

const WebsocketContext = createContext(null);

export const WebsocketProvider = ({ children }) => {
    const queryClient = useQueryClient();
    const { token } = useAuth();
    const { showToast } = useToast();
    const ws = useRef(null);
    const reconnectTimeout = useRef(null);
    const [subscribers] = useState(new Set());
    const connectRef = useRef(null);

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
        const host = window.location.hostname;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // In production, you likely don't want port 3000 appended if using standard SSL port
        const isProd =
            window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const wsPort = isProd ? '' : ':3000';
        const wsUrl = `${protocol}//${host}${wsPort}/ws`;

        if (ws.current) ws.current.close();

        try {
            ws.current = new WebSocket(wsUrl);
        } catch (err) {
            console.error('Failed to create WebSocket:', err);
            return;
        }

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
            reconnectTimeout.current = setTimeout(connectRef.current, 3000);
        };

        ws.current.onerror = (err) => {
            console.error('WS Error', err);
            ws.current.close();
        };
    }, [token, handleWsMessage]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
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
