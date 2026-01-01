import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

export const useStories = () => {
    return useQuery({
        queryKey: ['stories'],
        queryFn: async () => {
            const { data } = await api.get('/stories');
            return data;
        },
        refetchInterval: 60000 // Refresh every minute
    });
};

export const useUserStories = (userId) => {
    return useQuery({
        queryKey: ['userStories', userId],
        queryFn: async () => {
            const { data } = await api.get(`/stories/user/${userId}`);
            return data;
        },
        enabled: !!userId
    });
};

export const useCreateStory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (storyData) => {
            const { data } = await api.post('/stories', storyData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stories'] });
        }
    });
};

export const useMarkStoryViewed = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (storyId) => {
            const { data } = await api.post(`/stories/${storyId}/view`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stories'] });
        }
    });
};

export const useStoryViewers = (storyId) => {
    return useQuery({
        queryKey: ['storyViewers', storyId],
        queryFn: async () => {
            const { data } = await api.get(`/stories/${storyId}/viewers`);
            return data;
        },
        enabled: !!storyId
    });
};
