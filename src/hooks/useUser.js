import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';

export const useProfile = (username) => {
    return useQuery({
        queryKey: ['profile', username],
        queryFn: async () => {
            if (!username) return null;
            const { data } = await api.get(`/users/${username}`);
            return data;
        },
        enabled: !!username,
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
        }
    });
};
