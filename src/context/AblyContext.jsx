import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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

    useEffect(() => {
        if (!token || !userId) {
            // User logged out — tear down cleanly
            if (ablyRef.current) {
                ablyRef.current.close();
                ablyRef.current = null;
                setAbly(null);
            }
            isConnectingRef.current = false;
            return;
        }

        if (ablyRef.current || isConnectingRef.current) return;

        isConnectingRef.current = true;

        const client = new Ably.Realtime({
            authCallback: async (tokenParams, callback) => {
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        const { data } = await api.get('/ably/auth');
                        // data must be a plain object — Ably token request format
                        callback(null, data);
                        return;
                    } catch (err) {
                        console.warn(
                            `Ably auth attempt ${attempt + 1} failed:`,
                            err?.response?.status ?? err?.message,
                        );
                        if (attempt < 2) {
                            await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
                        }
                    }
                }
                // IMPORTANT: Pass a plain Error string — NOT an axios error object.
                // Passing an object Ably doesn't understand causes the "Connection closed" loop.
                console.error('Ably auth failed after 3 attempts — will retry later');
                callback('Auth request failed', null);
            },
            closeOnUnload: true,
            disconnectedRetryTimeout: 5000,
            suspendedRetryTimeout: 15000,
        });

        client.connection.on('connected', () => {
            console.log('Ably connected');
            isConnectingRef.current = false;
            ablyRef.current = client;
            setAbly(client);
        });

        client.connection.on('failed', (stateChange) => {
            console.error('Ably connection failed:', stateChange?.reason?.message);
            isConnectingRef.current = false;
            // Don't set ably to null — let it retry on its own
        });

        client.connection.on('disconnected', (stateChange) => {
            console.warn('Ably disconnected:', stateChange?.reason?.message);
        });

        client.connection.on('suspended', () => {
            console.warn('Ably suspended — will retry in 15s');
        });

        client.connection.on('closed', () => {
            // Only clear state if this is our current client
            if (ablyRef.current === client) {
                ablyRef.current = null;
                setAbly(null);
            }
        });

        // Global notification channel
        const notificationChannel = client.channels.get(`user:${userId}:notifications`);
        notificationChannel.subscribe('new_notification', (msg) => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            if (msg.data?.content) showToast(msg.data.content, 'info');
        });

        // Global chat update channel
        const chatUpdateChannel = client.channels.get(`user:${userId}:chats`);
        chatUpdateChannel.subscribe('update', () => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
        });

        // Activity feed channel
        const activityChannel = client.channels.get(`user:${userId}:activity`);
        activityChannel.subscribe(['new_activity', 'activity_updated'], (msg) => {
            queryClient.invalidateQueries({ queryKey: ['activity'] });
            if (msg.data?.content) showToast(msg.data.content, 'info');
        });

        // Media optimization channel
        const mediaChannel = client.channels.get(`user:${userId}:media-updated`);
        mediaChannel.subscribe('media-optimized', (msg) => {
            const { post_id, optimized_url, variants } = msg.data;
            
            // Surgically update the post in the cache
            queryClient.setQueriesData({ queryKey: ['post', post_id] }, (old) => {
                if (!old) return old;
                return {
                    ...old,
                    media_url: optimized_url,
                    media_variants: variants,
                    media_optimized: true
                };
            });
            
            // Also update any feed/infinite lists containing this post
            queryClient.setQueriesData({ queryKey: ['feed'] }, (old) => {
                if (!old || !old.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => 
                        Array.isArray(page) 
                            ? page.map(p => p.id === post_id ? { ...p, media_url: optimized_url, media_optimized: true } : p)
                            : (page.posts ? { ...page, posts: page.posts.map(p => p.id === post_id ? { ...p, media_url: optimized_url, media_optimized: true } : p) } : page)
                    )
                };
            });
        });

        // WebRTC signaling channel
        const signalingChannel = client.channels.get(`user:${userId}:signaling`);
        signalingChannel.subscribe(['call-offer', 'call-answer', 'ice-candidate'], (msg) => {
            window.dispatchEvent(
                new CustomEvent('ably-signaling', {
                    detail: { type: msg.name, data: msg.data },
                }),
            );
        });

        return () => {
            isConnectingRef.current = false;
            if (ablyRef.current === client) {
                ablyRef.current = null;
                setAbly(null);
            }
            client.close();
        };
    }, [token, userId]); // intentionally minimal deps — queryClient and showToast are stable refs

    // Track presence in a global "campus" channel
    useEffect(() => {
        if (!ably || !user) return;

        const globalChannel = ably.channels.get('campus:presence');

        globalChannel.presence.enter({
            username: user.username,
            avatar: user.avatar_url,
            userId: user.id,
        }).catch((e) => console.warn('Presence enter failed:', e));

        const handler = (member) => {
            setPresenceData((prev) => {
                const newData = { ...prev };
                if (member.action === 'leave') {
                    delete newData[member.clientId || member.data?.userId];
                } else {
                    const id = member.clientId || member.data?.userId;
                    if (id) {
                        newData[id] = {
                            status: 'online',
                            ...member.data,
                            lastSeen: new Date(),
                        };
                    }
                }
                return newData;
            });
        };

        globalChannel.presence.subscribe(['enter', 'leave', 'update', 'present'], handler);

        globalChannel.presence.get((err, members) => {
            if (!err && members) {
                const initial = {};
                members.forEach((m) => {
                    const id = m.clientId || m.data?.userId;
                    if (id) initial[id] = { status: 'online', ...m.data };
                });
                setPresenceData(initial);
            }
        });

        return () => {
            globalChannel.presence.leave().catch(() => {});
            globalChannel.presence.unsubscribe(handler);
        };
    }, [ably, user]);

    return <AblyContext.Provider value={{ ably, presenceData }}>{children}</AblyContext.Provider>;
};

export const useAbly = () => {
    const context = useContext(AblyContext);
    if (!context) throw new Error('useAbly must be used within AblyProvider');
    return context;
};
