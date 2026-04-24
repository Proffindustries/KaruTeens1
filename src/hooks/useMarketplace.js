import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';
import { STALE_TIMES } from '../utils/queryConfig';

export const useMarketplaceItems = (filters = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.category && filters.category !== 'all')
        queryParams.append('category', filters.category);
    if (filters.search) queryParams.append('search', filters.search);

    return useQuery({
        queryKey: ['marketplaceItems', filters],
        queryFn: async () => {
            const { data } = await api.get(`/marketplace?${queryParams.toString()}`);
            return data;
        },
        staleTime: STALE_TIMES.MARKETPLACE, // 5 minutes
    });
};

export const useMarketplaceItem = (itemId) => {
    return useQuery({
        queryKey: ['marketplaceItem', itemId],
        queryFn: async () => {
            const { data } = await api.get(`/marketplace/${itemId}`);
            return data;
        },
        enabled: !!itemId,
        staleTime: STALE_TIMES.MARKETPLACE, // 5 minutes
    });
};

export const useCreateItem = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (itemData) => {
            const { data } = await api.post('/marketplace', itemData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marketplaceItems'] });
            showToast('Item listed successfully!', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to list item', 'error');
        },
    });
};

export const useMarkSold = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (itemId) => {
            const { data } = await api.put(`/marketplace/${itemId}/sold`);
            return data;
        },
        onSuccess: (_, itemId) => {
            queryClient.invalidateQueries({ queryKey: ['marketplaceItems'] });
            queryClient.invalidateQueries({ queryKey: ['marketplaceItem', itemId] });
            showToast('Item marked as sold!', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to mark as sold', 'error');
        },
    });
};

export const useBoostItem = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (itemId) => {
            const { data } = await api.post(`/marketplace/${itemId}/boost`);
            return data;
        },
        onSuccess: (_, itemId) => {
            queryClient.invalidateQueries({ queryKey: ['marketplaceItems'] });
            queryClient.invalidateQueries({ queryKey: ['marketplaceItem', itemId] });
            showToast('Item boosted for 24 hours! 🔥', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to boost item', 'error');
        },
    });
};

export const useDeleteItem = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (itemId) => {
            const { data } = await api.delete(`/marketplace/${itemId}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marketplaceItems'] });
            showToast('Item deleted successfully', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to delete item', 'error');
        },
    });
};
