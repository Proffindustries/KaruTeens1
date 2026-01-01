import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

export const useGroups = (filters = {}) => {
    return useQuery({
        queryKey: ['groups', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.category) params.append('category', filters.category);
            if (filters.search) params.append('search', filters.search);

            const { data } = await api.get(`/groups?${params}`);
            return data;
        }
    });
};

export const useGroup = (groupId) => {
    return useQuery({
        queryKey: ['group', groupId],
        queryFn: async () => {
            const { data } = await api.get(`/groups/${groupId}`);
            return data;
        },
        enabled: !!groupId
    });
};

export const useGroupPosts = (groupId) => {
    return useQuery({
        queryKey: ['groupPosts', groupId],
        queryFn: async () => {
            const { data } = await api.get(`/groups/${groupId}/posts`);
            return data;
        },
        enabled: !!groupId
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
        }
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
        }
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
        }
    });
};

export const useCreateGroupPost = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ groupId, content, media_urls }) => {
            const { data } = await api.post(`/groups/${groupId}/posts`, { content, media_urls });
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['groupPosts', variables.groupId] });
        }
    });
};
