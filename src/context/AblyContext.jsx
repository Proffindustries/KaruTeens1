import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import * as Ably from 'ably';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './ToastContext';

const AblyContext = createContext(null);

export const AblyProvider = ({ children }) => {
    const { user, token } = useAuth();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [ably, setAbly] = useState(null);
    const [presenceData, setPresenceData] = useState({});
    const ablyRef = useRef(null);
    const isConnectingRef = useRef(false);

    const userId = user?.id;
    const username = user?.username;

    useEffect(() => {
        if (!token || !userId) {
            if (ablyRef.current) {
                console.log('🚪 Closing existing Ably connection');
                ablyRef.current.close();
                ablyRef.current = null;
                setAbly(null);
            }
            return;
        }

        if (ablyRef.current || isConnectingRef.current) return;

        isConnectingRef.current = true;
        console.log('📡 Initializing Ably for student:', userId);

        const client = new Ably.Realtime({
            authCallback: async (tokenParams, callback) => {
                try {
                    console.log('🔑 Fetching Ably Auth Token...');
                    const { data } = await api.get('/ably/auth');
                    callback(null, data);
                } catch (err) {
                    console.error('❌ Ably Auth Request failed:', err);
                    // Add a small delay for retry to avoid flooding on server errors
                    setTimeout(() => callback(err, null), 5000);
                }
            },
            closeOnUnload: true
        });

        client.connection.on('connected', () => {
            console.log('✅ Ably Connected');
            isConnectingRef.current = false;
            ablyRef.current = client;
            setAbly(client);
        });

        client.connection.on('failed', (err) => {
            console.error('❌ Ably Connection Failed:', err);
            isConnectingRef.current = false;
        });

        // Global notification channel
        const notificationChannel = client.channels.get(`user:${userId}:notifications`);
        notificationChannel.subscribe('new_notification', (msg) => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            showToast(msg.data.content, 'info');
        });

        // Global chat update channel
        const chatUpdateChannel = client.channels.get(`user:${userId}:chats`);
        chatUpdateChannel.subscribe('update', () => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
        });

        return () => {
            if (ablyRef.current) {
                console.log('🚪 Cleaning up Ably instance');
                ablyRef.current.close();
                ablyRef.current = null;
                setAbly(null);
            }
        };
    }, [token, userId, queryClient, showToast]);

    // Track presence in a global "campus" channel
    useEffect(() => {
        if (!ably || !user) return;

        const globalChannel = ably.channels.get('campus:presence');

        globalChannel.presence.enter({
            username: user.username,
            avatar: user.avatar_url,
            userId: user.id
        });

        globalChannel.presence.subscribe(['enter', 'leave', 'update', 'present'], (member) => {
            setPresenceData(prev => {
                const newData = { ...prev };
                if (member.action === 'leave') {
                    delete newData[member.clientId || member.data?.userId];
                } else {
                    const id = member.clientId || member.data?.userId;
                    newData[id] = {
                        status: 'online',
                        ...member.data,
                        lastSeen: new Date()
                    };
                }
                return newData;
            });
        });

        globalChannel.presence.get((err, members) => {
            if (!err) {
                const initial = {};
                members.forEach(m => {
                    const id = m.clientId || m.data?.userId;
                    initial[id] = { status: 'online', ...m.data };
                });
                setPresenceData(initial);
            }
        });

        return () => {
            globalChannel.presence.leave();
        };
    }, [ably, userId, username, user?.avatar_url]);

    return (
        <AblyContext.Provider value={{ ably, presenceData }}>
            {children}
        </AblyContext.Provider>
    );
};

export const useAbly = () => {
    const context = useContext(AblyContext);
    if (!context) throw new Error('useAbly must be used within AblyProvider');
    return context;
};
