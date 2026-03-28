import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

// Get activity feed
export const useActivityFeed = () => {
    return useQuery({
        queryKey: ['activity'],
        queryFn: async () => {
            const { data } = await api.get('/activity');
            return data;
        },
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 30000, // Poll every 30 seconds
    });
};

// Mark activity as read
export const useMarkActivityRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (activityId) => {
            await api.post(`/activity/${activityId}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activity'] });
        },
    });
};

// Mark all activities as read
export const useMarkAllActivityRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            await api.post('/activity/read-all');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activity'] });
        },
    });
};

// Delete activity
export const useDeleteActivity = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (activityId) => {
            await api.delete(`/activity/${activityId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activity'] });
        },
    });
};
