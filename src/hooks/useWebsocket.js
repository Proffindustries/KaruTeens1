import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useToast } from '../context/ToastContext';

export const useWebsocket = (onWebRTCMessage) => {
    const { user, token } = useAuth();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const ws = useRef(null);
    const reconnectTimeout = useRef(null);

    const connect = () => {
        if (!token) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let wsUrl;
        if (import.meta.env.VITE_WS_URL) {
            wsUrl = import.meta.env.VITE_WS_URL;
        } else if (import.meta.env.VITE_API_URL) {
            wsUrl = import.meta.env.VITE_API_URL
                .replace(/^http/, 'ws')
                .replace(/\/api$/, '/ws');
        } else {
            const host = window.location.host === 'localhost:5173' ? 'localhost:3000' : window.location.host;
            wsUrl = `${protocol}//${host}/ws`;
        }

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log('WS Connected');
            if (ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'auth', token }));
            }
        };

        ws.current.onmessage = (event) => {
            const payload = JSON.parse(event.data);
            handleWsMessage(payload);
        };

        ws.current.onclose = () => {
            console.log('WS Disconnected, reconnecting...');
            reconnectTimeout.current = setTimeout(connect, 3000);
        };

        ws.current.onerror = (err) => {
            console.error('WS Error', err);
            ws.current.close();
        };
    };

    const handleWsMessage = (payload) => {
        const { type, data } = payload;

        switch (type) {
            case 'message':
                // Update messages cache
                queryClient.setQueryData(['messages', data.chat_id], (old) => {
                    if (!old) return old;
                    // Prevent duplicate if already added by mutation
                    if (old.find(m => m.id === data.id)) return old;
                    return [...old, data];
                });

                // Update chats list (for last message, unread count etc)
                queryClient.invalidateQueries({ queryKey: ['chats'] });

                // If not current chat, show toast
                const currentChatId = window.location.pathname.split('/').pop();
                if (currentChatId !== data.chat_id) {
                    showToast(`New message from ${data.sender_username}`, 'info');
                }
                break;

            case 'notification':
                // Update notifications cache
                queryClient.setQueryData(['notifications'], (old) => {
                    if (!old) return [data];
                    return [data, ...old];
                });
                showToast(data.content, 'info');
                break;

            case 'auth_success':
                console.log('WS Authenticated as', data.user_id);
                break;

            // WebRTC Signaling
            case 'call-offer':
            case 'call-answer':
            case 'ice-candidate':
                if (onWebRTCMessage) {
                    onWebRTCMessage(type, data);
                }
                break;

            default:
                break;
        }
    };

    useEffect(() => {
        connect();
        return () => {
            if (ws.current) ws.current.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };
    }, [token]);

    return ws.current;
};
