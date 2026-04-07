import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

export const usePages = (filters = {}) => {
    return useQuery({
        queryKey: ['pages', filters],
        queryFn: async () => {
            const { data } = await api.get('/pages', { params: filters });
            return data;
        }
    });
};

export const usePage = (idOrSlug) => {
    return useQuery({
        queryKey: ['page', idOrSlug],
        queryFn: async () => {
            const { data } = await api.get(`/pages/${idOrSlug}`);
            return data;
        },
        enabled: !!idOrSlug
    });
};

export const useCreatePage = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (pageData) => {
            const { data } = await api.post('/pages', pageData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pages'] });
            showToast('Page created successfully!', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to create page', 'error');
        }
    });
};

export const useFollowPage = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (pageId) => {
            const { data } = await api.post(`/pages/${pageId}/follow`);
            return data;
        },
        onSuccess: (_, pageId) => {
            queryClient.invalidateQueries({ queryKey: ['page', pageId] });
            queryClient.invalidateQueries({ queryKey: ['pages'] });
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            showToast('Followed successfully!', 'success');
        }
    });
};

export const useUnfollowPage = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (pageId) => {
            const { data } = await api.delete(`/pages/${pageId}/follow`);
            return data;
        },
        onSuccess: (_, pageId) => {
            queryClient.invalidateQueries({ queryKey: ['page', pageId] });
            queryClient.invalidateQueries({ queryKey: ['pages'] });
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            showToast('Unfollowed successfully!', 'success');
        }
    });
};
