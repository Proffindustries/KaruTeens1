import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { STALE_TIMES } from '../utils/queryConfig';

export const useGroups = (filters = {}) => {
    return useQuery({
        queryKey: ['groups', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.category) params.append('category', filters.category);
            if (filters.search) params.append('search', filters.search);

            const { data } = await api.get(`/groups?${params}`);
            return data;
        },
        staleTime: STALE_TIMES.GROUPS, // 5 minutes
    });
};

export const useGroup = (groupId) => {
    return useQuery({
        queryKey: ['group', groupId],
        queryFn: async () => {
            const { data } = await api.get(`/groups/${groupId}`);
            return data;
        },
        enabled: !!groupId,
        staleTime: STALE_TIMES.GROUPS, // 5 minutes
    });
};

export const useGroupPosts = (groupId) => {
    return useQuery({
        queryKey: ['groupPosts', groupId],
        queryFn: async () => {
            const { data } = await api.get(`/groups/${groupId}/posts`);
            return data;
        },
        enabled: !!groupId,
    });
};

export const useCreateGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (groupData) => {
            const { data } = await api.post('/groups', groupData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
};

export const useJoinGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (groupId) => {
            const { data } = await api.post(`/groups/${groupId}/join`);
            return data;
        },
        onSuccess: (_, groupId) => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: ['group', groupId] });
        },
    });
};

export const useUpdateGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ groupId, updateData }) => {
            const { data } = await api.put(`/groups/${groupId}`, updateData);
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] });
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
};

export const useLeaveGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (groupId) => {
            const { data } = await api.post(`/groups/${groupId}/leave`);
            return data;
        },
        onSuccess: (_, groupId) => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: ['group', groupId] });
        },
    });
};

export const useCreateGroupPost = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ groupId, postData }) => {
            const { data } = await api.post(`/groups/${groupId}/posts`, postData);
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['groupPosts', variables.groupId] });
            queryClient.invalidateQueries({ queryKey: ['feed', 'infinite'] });
            queryClient.invalidateQueries({ queryKey: ['feed', 'for-you'] });
        },
    });
};
