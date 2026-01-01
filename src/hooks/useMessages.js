import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';
import { useEffect } from 'react';

// Fetch all chats
export const useChats = () => {
    return useQuery({
        queryKey: ['chats'],
        queryFn: async () => {
            const { data } = await api.get('/messages');
            return data;
        },
    });
};

// Fetch messages for a specific chat
export const useChatMessages = (chatId) => {
    return useQuery({
        queryKey: ['messages', chatId],
        queryFn: async () => {
            if (!chatId) return [];
            const { data } = await api.get(`/messages/${chatId}/messages`);
            return data;
        },
        enabled: !!chatId,
    });
};

// Create a new chat (or get existing)
export const useCreateChat = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (recipientUsername) => {
            const { data } = await api.post('/messages', { recipient_username: recipientUsername });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to start chat', 'error');
        }
    });
};

// Create a new group chat
export const useCreateGroup = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async ({ name, participants }) => {
            const { data } = await api.post('/messages/group', { name, participants });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
            showToast('Group created!', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to create group', 'error');
        }
    });
};

// Send a message
export const useSendMessage = (chatId) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (messageData) => {
            const { data } = await api.post(`/messages/${chatId}/messages`, messageData);
            return data;
        },
        onMutate: async (newMessage) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['messages', chatId] });

            // Snapshot the previous value
            const previousMessages = queryClient.getQueryData(['messages', chatId]);

            // Optimistically update to the new value
            const optimisticMessage = {
                id: `temp-${Date.now()}`,
                content: newMessage.content,
                attachment_url: newMessage.attachment_url,
                attachment_type: newMessage.attachment_type,
                created_at: new Date().toISOString(),
                is_me: true,
                is_deleted: false,
                reactions: [],
                reply_to: newMessage.reply_to_id ? { id: newMessage.reply_to_id, username: '...' } : null,
                read_at: null,
                viewed_at: null
            };

            queryClient.setQueryData(['messages', chatId], (old) => {
                if (!old) return [optimisticMessage];
                return [...old, optimisticMessage];
            });

            // Return a context object with the snapshotted value
            return { previousMessages };
        },
        onError: (err, newMessage, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            queryClient.setQueryData(['messages', chatId], context.previousMessages);
            showToast(err.response?.data?.error || 'Failed to send message', 'error');
        },
        onSettled: () => {
            // Always refetch after error or success:
            queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
            queryClient.invalidateQueries({ queryKey: ['chats'] }); // Update last message in chat list
        },
    });
};
// Forward a message
export const useForwardMessage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ chatId, content, attachment_url, attachment_type }) => {
            const { data } = await api.post(`/messages/${chatId}/messages`, { content, attachment_url, attachment_type });
            return data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['messages', variables.chatId] });
            queryClient.invalidateQueries({ queryKey: ['chats'] });
        }
    });
};

// Add participants to a group
export const useAddParticipants = (chatId) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async (usernames) => {
            await api.post(`/messages/${chatId}/participants/add`, { usernames });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
            showToast('Participants added', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to add participants', 'error');
        }
    });
};

// Remove a participant from a group
export const useRemoveParticipant = (chatId) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async (username) => {
            await api.post(`/messages/${chatId}/participants/remove`, { username });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
            showToast('Participant removed', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to remove participant', 'error');
        }
    });
};

// Leave a group
export const useLeaveGroup = (chatId) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async () => {
            await api.post(`/messages/${chatId}/leave`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
            showToast('You left the group', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to leave group', 'error');
        }
    });
};

// Mute chat
export const useMuteChat = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async ({ chatId, mute }) => {
            if (mute) await api.post(`/users/chat/${chatId}/mute`);
            else await api.delete(`/users/chat/${chatId}/mute`);
        },
        onSuccess: (_, { mute }) => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
            showToast(mute ? 'Chat muted' : 'Chat unmuted', 'success');
        }
    });
};

// Block user
export const useBlockUser = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async ({ userId, block }) => {
            if (block) await api.post(`/users/block/${userId}`);
            else await api.delete(`/users/block/${userId}`);
        },
        onSuccess: (_, { block }) => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
            showToast(block ? 'User blocked' : 'User unblocked', 'success');
        }
    });
};

// Set disappearing messages
export const useSetDisappearing = (chatId) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async (duration) => {
            await api.post(`/messages/${chatId}/disappearing`, { duration });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
            showToast('Disappearing messages updated', 'success');
        }
    });
};

// React to a message
export const useReactMessage = (chatId) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ messageId, emoji }) => {
            const { data } = await api.post(`/messages/messages/${messageId}/react`, { emoji });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
        }
    });
};

// Mark a message as read
export const useMarkRead = (chatId) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (messageId) => {
            const { data } = await api.post(`/messages/messages/${messageId}/read`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
        }
    });
};

// Vote on a poll
export const useVotePoll = (chatId) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ messageId, optionIndex }) => {
            const { data } = await api.post(`/messages/messages/${messageId}/vote`, { option_index: optionIndex });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
        }
    });
};

// Mark a view-once message as viewed
export const useMarkViewed = (chatId) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (messageId) => {
            await api.post(`/messages/messages/${messageId}/view`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
        }
    });
};

// Delete a message
export const useDeleteMessage = (chatId) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async ({ messageId, mode }) => {
            const { data } = await api.post(`/messages/messages/${messageId}`, { mode });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
            queryClient.invalidateQueries({ queryKey: ['chats'] });
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to delete message', 'error');
        }
    });
};

// Update group info
export const useUpdateGroup = (chatId) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async ({ name, avatar_url }) => {
            await api.post(`/messages/${chatId}/update`, { name, avatar_url });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
            showToast('Group info updated', 'success');
        }
    });
};

// Toggle admin role
export const useToggleAdmin = (chatId) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async (username) => {
            await api.post(`/messages/${chatId}/toggle-admin`, { username });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
            showToast('Admin role updated', 'success');
        }
    });
};
