import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';

export const useInfiniteFeed = () => {
    return useInfiniteQuery({
        queryKey: ['feed', 'infinite'],
        queryFn: async ({ pageParam = null }) => {
            const { data } = await api.get('/posts/feed', {
                params: {
                    last_id: pageParam,
                    limit: 10
                }
            });
            return data.posts;
        },
        getNextPageParam: (lastPage) => {
            if (lastPage && lastPage.length < 10) return undefined;
            return lastPage.length > 0 ? lastPage[lastPage.length - 1].id : undefined;
        },
        initialPageParam: null,
    });
};

export const usePost = (postId) => {
    return useQuery({
        queryKey: ['post', postId],
        queryFn: async () => {
            const { data } = await api.get(`/posts/${postId}`);
            return data;
        },
        enabled: !!postId,
    });
};

export const useTrendingTopics = () => {
    return useQuery({
        queryKey: ['trending'],
        queryFn: async () => {
            const { data } = await api.get('/posts/trending');
            return data;
        },
        refetchInterval: 60000, // Refresh every minute
    });
};

export const useCreatePost = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (postData) => {
            const { data } = await api.post('/posts', postData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            showToast('Post created successfully!', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to create post', 'error');
        }
    });
};
export const useLikePost = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async (postId) => {
            const { data } = await api.post(`/posts/${postId}/like`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to like post', 'error');
        }
    });
};

export const useUnlikePost = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async (postId) => {
            const { data } = await api.delete(`/posts/${postId}/like`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to unlike post', 'error');
        }
    });
};

export const useAddComment = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async ({ postId, content, parent_comment_id = null }) => {
            const { data } = await api.post(`/posts/${postId}/comment`, {
                content,
                parent_comment_id
            });
            return data;
        },
        onSuccess: (data, { postId }) => {
            queryClient.invalidateQueries({ queryKey: ['comments', postId] });
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            showToast('Comment added!', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to add comment', 'error');
        }
    });
};

export const useComments = (postId) => {
    return useQuery({
        queryKey: ['comments', postId],
        queryFn: async () => {
            const { data } = await api.get(`/posts/${postId}/comment`);
            return data;
        },
        enabled: !!postId,
    });
};
