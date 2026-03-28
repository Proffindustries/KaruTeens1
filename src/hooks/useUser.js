import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';
import { STALE_TIMES } from '../utils/queryConfig';

export const useProfile = (username) => {
    return useQuery({
        queryKey: ['profile', username],
        queryFn: async () => {
            if (!username) return null;
            const { data } = await api.get(`/users/${username}`);
            return data;
        },
        enabled: !!username,
        staleTime: STALE_TIMES.USER_PROFILE, // Using standardized constant
    });
};

export const useUpdateProfile = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (profileData) => {
            const { data } = await api.put('/users/update', profileData);
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            showToast('Profile updated successfully!', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to update profile', 'error');
        },
    });
};

export const useFollow = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (username) => {
            const { data } = await api.post(`/users/${username}/follow`);
            return data;
        },
        onSuccess: (_, username) => {
            queryClient.invalidateQueries({ queryKey: ['profile', username] });
            showToast('Followed successfully!', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to follow user', 'error');
        },
    });
};

export const useUnfollow = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (username) => {
            const { data } = await api.post(`/users/${username}/unfollow`);
            return data;
        },
        onSuccess: (_, username) => {
            queryClient.invalidateQueries({ queryKey: ['profile', username] });
            showToast('Unfollowed successfully!', 'info');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to unfollow user', 'error');
        },
    });
};
