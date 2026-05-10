import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { STALE_TIMES } from '../utils/queryConfig';
import { useToast } from '../context/ToastContext.jsx';

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
        staleTime: STALE_TIMES.GROUPS,
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
        staleTime: STALE_TIMES.GROUPS,
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
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async (groupData) => {
            const { data } = await api.post('/groups', groupData);
            return data;
        },
        onSuccess: (newGroup) => {
            queryClient.setQueryData(['groups', {}], (old) => {
                if (!old) return [newGroup];
                return [newGroup, ...old];
            });
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            showToast('Group created!', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to create group', 'error');
        },
    });
};

export const useJoinGroup = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async (groupId) => {
            const { data } = await api.post(`/groups/${groupId}/join`);
            return data;
        },
        onMutate: async (groupId) => {
            await queryClient.cancelQueries({ queryKey: ['group', groupId] });
            const previousGroup = queryClient.getQueryData(['group', groupId]);

            queryClient.setQueryData(['group', groupId], (old) => {
                if (!old) return old;
                return { ...old, is_member: true, member_count: (old.member_count || 0) + 1 };
            });

            return { previousGroup };
        },
        onError: (err, groupId, context) => {
            if (context?.previousGroup) {
                queryClient.setQueryData(['group', groupId], context.previousGroup);
            }
            showToast(err.response?.data?.error || 'Failed to join group', 'error');
        },
        onSettled: (_, __, groupId) => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: ['group', groupId] });
        },
    });
};

export const useLeaveGroup = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async (groupId) => {
            const { data } = await api.post(`/groups/${groupId}/leave`);
            return data;
        },
        onMutate: async (groupId) => {
            await queryClient.cancelQueries({ queryKey: ['group', groupId] });
            const previousGroup = queryClient.getQueryData(['group', groupId]);

            queryClient.setQueryData(['group', groupId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    is_member: false,
                    member_count: Math.max((old.member_count || 1) - 1, 0),
                };
            });

            return { previousGroup };
        },
        onError: (err, groupId, context) => {
            if (context?.previousGroup) {
                queryClient.setQueryData(['group', groupId], context.previousGroup);
            }
            showToast(err.response?.data?.error || 'Failed to leave group', 'error');
        },
        onSettled: (_, __, groupId) => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: ['group', groupId] });
        },
    });
};

export const useUpdateGroup = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async ({ groupId, updateData }) => {
            const { data } = await api.put(`/groups/${groupId}`, updateData);
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] });
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            showToast('Group updated!', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to update group', 'error');
        },
    });
};

export const useCreateGroupPost = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async ({ groupId, postData }) => {
            const { data } = await api.post(`/groups/${groupId}/posts`, postData);
            return data;
        },
        onMutate: async ({ groupId, postData }) => {
            await queryClient.cancelQueries({ queryKey: ['groupPosts', groupId] });
            const optimisticPost = {
                id: `temp-${Date.now()}`,
                content: postData.content,
                created_at: new Date().toISOString(),
                is_optimistic: true,
            };
            queryClient.setQueryData(['groupPosts', groupId], (old) => {
                if (!old) return [optimisticPost];
                return [optimisticPost, ...old];
            });
            return { previousPosts: queryClient.getQueryData(['groupPosts', groupId]) };
        },
        onError: (err, variables, context) => {
            if (context?.previousPosts) {
                queryClient.setQueryData(['groupPosts', variables.groupId], context.previousPosts);
            }
            showToast(err.response?.data?.error || 'Failed to create post', 'error');
        },
        onSettled: (_, __, variables) => {
            queryClient.invalidateQueries({ queryKey: ['groupPosts', variables.groupId] });
            queryClient.invalidateQueries({ queryKey: ['feed', 'infinite'] });
            queryClient.invalidateQueries({ queryKey: ['feed', 'for-you'] });
        },
    });
};
