import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

// Get activity feed
export const useActivityFeed = () => {
    return useQuery({
        queryKey: ['activity'],
        queryFn: async () => {
            const { data } = await api.get('/notifications');
            return data.map(n => ({
                id: n.id,
                actor: {
                    username: n.actor_username,
                    avatar_url: n.actor_avatar_url
                },
                type: n.notification_type,
                target: { id: n.target_id },
                content: n.content,
                read: n.is_read,
                created_at: n.created_at
            }));
        },
        staleTime: 30 * 1000,
        refetchInterval: 30000,
    });
};

export const useMarkActivityRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (activityId) => {
            await api.post(`/notifications/${activityId}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activity'] });
        },
    });
};

export const useMarkAllActivityRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            await api.post('/notifications/read-all');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activity'] });
        },
    });
};

export const useDeleteActivity = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (activityId) => {
            await api.delete(`/notifications/${activityId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activity'] });
        },
    });
};
