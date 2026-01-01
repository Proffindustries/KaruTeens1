import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

export const useAdminStats = () => {
    return useQuery({
        queryKey: ['adminStats'],
        queryFn: async () => {
            const { data } = await api.get('/admin/stats');
            return data;
        }
    });
};

export const useAdminUsers = (filters = {}) => {
    return useQuery({
        queryKey: ['adminUsers', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.role) params.append('role', filters.role);
            if (filters.verified !== undefined) params.append('verified', filters.verified);
            if (filters.premium !== undefined) params.append('premium', filters.premium);
            if (filters.search) params.append('search', filters.search);

            const { data } = await api.get(`/admin/users?${params}`);
            return data;
        }
    });
};

export const useUpdateUserRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, role }) => {
            const { data } = await api.put(`/admin/users/${userId}/role`, { role });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
            queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        }
    });
};

export const useBanUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, banned }) => {
            const { data } = await api.put(`/admin/users/${userId}/ban`, { banned });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
            queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        }
    });
};

export const useVerifyUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (userId) => {
            const { data } = await api.put(`/admin/users/${userId}/verify`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
            queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        }
    });
};

export const useDeletePost = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (postId) => {
            const { data } = await api.delete(`/admin/posts/${postId}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        }
    });
};
