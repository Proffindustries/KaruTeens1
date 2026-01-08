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
            if (!lastPage || lastPage.length === 0) return undefined;
            const lastPost = lastPage[lastPage.length - 1];
            return lastPost.id || lastPost._id;
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
        onMutate: async (newComment) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['comments', newComment.postId] });

            // Snapshot the previous value
            const previousComments = queryClient.getQueryData(['comments', newComment.postId]);

            // Optimistically update to the new value
            const currentUser = JSON.parse(localStorage.getItem('user'));
            const optimisticComment = {
                _id: 'temp-' + Date.now(),
                content: newComment.content,
                postId: newComment.postId,
                parent_comment_id: newComment.parent_comment_id,
                username: currentUser?.username || 'You',
                user_avatar: currentUser?.avatar_url,
                created_at: new Date().toISOString(),
                is_optimistic: true
            };

            queryClient.setQueryData(['comments', newComment.postId], (old) => {
                return old ? [...old, optimisticComment] : [optimisticComment];
            });

            return { previousComments };
        },
        onSuccess: (data, { postId }) => {
            queryClient.invalidateQueries({ queryKey: ['comments', postId] });
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            showToast('Comment added!', 'success');
        },
        onError: (err, newComment, context) => {
            // Rollback on error
            if (context?.previousComments) {
                queryClient.setQueryData(['comments', newComment.postId], context.previousComments);
            }
            showToast(err.response?.data?.error || 'Failed to add comment', 'error');
        },
        onSettled: (data, error, { postId }) => {
            // Always refetch after error or success to ensure we are in sync with server
            queryClient.invalidateQueries({ queryKey: ['comments', postId] });
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
