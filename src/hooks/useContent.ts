import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';
import type { PostResponse, FeedResponse, Draft } from '../types';
import { STALE_TIMES } from '../utils/queryConfig';
import {
    useInfiniteFeed as useInfiniteFeedHook,
    useInfiniteForYouFeed as useInfiniteForYouFeedHook,
    useInfiniteTrendingPosts as useInfiniteTrendingPostsHook,
} from './useInfiniteQueries';

interface FeedQueryParams {
    last_id?: string | null;
    limit?: number;
}

// Export the optimized infinite query hooks
export {
    useInfiniteFeedHook as useInfiniteFeed,
    useInfiniteForYouFeedHook as useForYouFeed,
    useInfiniteTrendingPostsHook as useTrendingPosts,
};

export const usePost = (postId?: string) => {
    return useQuery<PostResponse, Error>({
        queryKey: ['post', postId],
        queryFn: async () => {
            if (!postId) throw new Error('Post ID is required');
            const { data } = await api.get<PostResponse>(`/posts/${postId}`);
            return data;
        },
        enabled: !!postId,
        staleTime: STALE_TIMES.POST_DETAIL,
    });
};

export const useTrendingTopics = () => {
    return useQuery<{ _id: string; tag: string; count: number }[], Error>({
        queryKey: ['trending', 'topics'],
        queryFn: async () => {
            const { data } = await api.get('/posts/trending');
            return data;
        },
        staleTime: STALE_TIMES.TRENDING_TOPICS,
        refetchInterval: 60 * 1000,
    });
};

export const useCreatePost = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (postData: {
            content: string;
            media_urls?: string[];
            post_type?: string;
            location?: any;
            is_anonymous?: boolean;
            audience?: string[];
            is_nsfw?: boolean;
        }) => {
            const { data } = await api.post('/posts', postData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feed', 'infinite'] });
            showToast('Post created successfully!', 'success');
        },
        onError: (err: any) => {
            showToast(err.response?.data?.error || 'Failed to create post', 'error');
        },
    });
};

export const useLikePost = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async (postId: string) => {
            const { data } = await api.post(`/posts/${postId}/like`);
            return data;
        },
        onMutate: async (postId: string) => {
            await queryClient.cancelQueries({ queryKey: ['feed', 'infinite'] });
            const previousFeed = queryClient.getQueryData(['feed', 'infinite']);

            queryClient.setQueryData(['feed', 'infinite'], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: PostResponse[]) =>
                        page.map((post: PostResponse) => {
                            const postIdToCheck = post.id || (post as any)._id;
                            if (postIdToCheck === postId) {
                                return {
                                    ...post,
                                    likes: (post.likes || 0) + 1,
                                    is_liked: true,
                                };
                            }
                            return post;
                        }),
                    ),
                };
            });

            return { previousFeed };
        },
        onError: (err: any, postId: string, context: any) => {
            if (context?.previousFeed) {
                queryClient.setQueryData(['feed', 'infinite'], context.previousFeed);
            }
            showToast(err.response?.data?.error || 'Failed to like post', 'error');
        },
    });
};

export const useUnlikePost = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async (postId: string) => {
            const { data } = await api.delete(`/posts/${postId}/like`);
            return data;
        },
        onMutate: async (postId: string) => {
            await queryClient.cancelQueries({ queryKey: ['feed', 'infinite'] });
            const previousFeed = queryClient.getQueryData(['feed', 'infinite']);

            queryClient.setQueryData(['feed', 'infinite'], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: PostResponse[]) =>
                        page.map((post: PostResponse) => {
                            const postIdToCheck = post.id || (post as any)._id;
                            if (postIdToCheck === postId) {
                                return {
                                    ...post,
                                    likes: Math.max((post.likes || 1) - 1, 0),
                                    is_liked: false,
                                };
                            }
                            return post;
                        }),
                    ),
                };
            });

            return { previousFeed };
        },
        onError: (err: any, postId: string, context: any) => {
            if (context?.previousFeed) {
                queryClient.setQueryData(['feed', 'infinite'], context.previousFeed);
            }
            showToast(err.response?.data?.error || 'Failed to unlike post', 'error');
        },
    });
};

export const useAddComment = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async ({
            postId,
            content,
            parentCommentId,
        }: {
            postId: string;
            content: string;
            parentCommentId?: string;
        }) => {
            const { data } = await api.post(`/posts/${postId}/comments`, {
                content,
                parent_comment_id: parentCommentId,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['post'] });
            showToast('Comment added!', 'success');
        },
        onError: (err: any) => {
            showToast(err.response?.data?.error || 'Failed to add comment', 'error');
        },
    });
};

export const useComments = (postId: string) => {
    return useQuery({
        queryKey: ['comments', postId],
        queryFn: async () => {
            const { data } = await api.get(`/posts/${postId}/comments`);
            return data;
        },
        enabled: !!postId,
    });
};

export const useSavePost = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async (postId: string) => {
            const { data } = await api.post(`/posts/${postId}/save`);
            return data;
        },
        onMutate: async (postId: string) => {
            await queryClient.cancelQueries({ queryKey: ['feed', 'infinite'] });
            const previousFeed = queryClient.getQueryData(['feed', 'infinite']);

            queryClient.setQueryData(['feed', 'infinite'], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: PostResponse[]) =>
                        page.map((post: PostResponse) => {
                            const postIdToCheck = post.id || (post as any)._id;
                            if (postIdToCheck === postId) {
                                // Since PostResponse doesn't have is_saved property,
                                // we're optimistically updating the UI
                                // The actual state will be corrected when we refetch
                                return {
                                    ...post,
                                    // @ts-ignore - Adding temporary property for optimistic update
                                    is_saved: !(post as any).is_saved,
                                };
                            }
                            return post;
                        }),
                    ),
                };
            });

            return { previousFeed };
        },
        onError: (err: any, postId: string, context: any) => {
            if (context?.previousFeed) {
                queryClient.setQueryData(['feed', 'infinite'], context.previousFeed);
            }
            showToast(err.response?.data?.error || 'Failed to save post', 'error');
        },
    });
};

export const useSavedPosts = () => {
    return useQuery<PostResponse[], Error>({
        queryKey: ['savedPosts'],
        queryFn: async () => {
            const { data } = await api.get('/posts/saved');
            return data;
        },
    });
};

export const useDrafts = () => {
    return useQuery<Draft[], Error>({
        queryKey: ['drafts'],
        queryFn: async () => {
            const { data } = await api.get('/posts/drafts');
            return data;
        },
    });
};

export const useSaveDraft = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (draftData: {
            content: string;
            media_urls?: string[];
            post_type?: string;
            is_anonymous?: boolean;
            audience?: string[];
            is_pinned?: boolean;
            is_nsfw?: boolean;
            title?: string;
        }) => {
            const { data } = await api.post('/posts/drafts', draftData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drafts'] });
            showToast('Draft saved!', 'success');
        },
        onError: (err: any) => {
            showToast(err.response?.data?.error || 'Failed to save draft', 'error');
        },
    });
};

export const useUpdateDraft = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async ({ draftId, draftData }: { draftId: string; draftData: any }) => {
            const { data } = await api.put(`/posts/drafts/${draftId}`, draftData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drafts'] });
            showToast('Draft updated!', 'success');
        },
        onError: (err: any) => {
            showToast(err.response?.data?.error || 'Failed to update draft', 'error');
        },
    });
};

export const useDeleteDraft = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (draftId: string) => {
            const { data } = await api.delete(`/posts/drafts/${draftId}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drafts'] });
            showToast('Draft deleted!', 'success');
        },
        onError: (err: any) => {
            showToast(err.response?.data?.error || 'Failed to delete draft', 'error');
        },
    });
};

export const usePublishDraft = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (draftId: string) => {
            const { data } = await api.post(`/posts/drafts/${draftId}/publish`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drafts'] });
            queryClient.invalidateQueries({ queryKey: ['feed', 'infinite'] });
            showToast('Post published!', 'success');
        },
        onError: (err: any) => {
            showToast(err.response?.data?.error || 'Failed to publish draft', 'error');
        },
    });
};

export const useDraftPreview = (draftId?: string) => {
    return useQuery<PostResponse, Error>({
        queryKey: ['draftPreview', draftId],
        queryFn: async () => {
            if (!draftId) throw new Error('Draft ID is required');
            const { data } = await api.get<PostResponse>(`/posts/drafts/${draftId}/preview`);
            return data;
        },
        enabled: !!draftId,
        staleTime: 0,
    });
};

export const useDeletePost = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (postId: string) => {
            const { data } = await api.delete(`/posts/${postId}`);
            return data;
        },
        onMutate: async (postId: string) => {
            await queryClient.cancelQueries({ queryKey: ['feed', 'infinite'] });
            const previousFeed = queryClient.getQueryData(['feed', 'infinite']);

            queryClient.setQueryData(['feed', 'infinite'], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: PostResponse[]) =>
                        page.filter(
                            (post: PostResponse) => (post.id || (post as any)._id) !== postId,
                        ),
                    ),
                };
            });

            return { previousFeed };
        },
        onError: (err: any, postId: string, context: any) => {
            if (context?.previousFeed) {
                queryClient.setQueryData(['feed', 'infinite'], context.previousFeed);
            }
            showToast(err.response?.data?.error || 'Failed to delete post', 'error');
        },
        onSuccess: () => {
            showToast('Post deleted successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['feed', 'infinite'] });
        },
    });
};

export const useReportPost = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (postId: string) => {
            const { data } = await api.post(`/posts/${postId}/report`);
            return data;
        },
        onSuccess: () => {
            showToast('Post reported successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['feed', 'infinite'] });
        },
        onError: (err: any) => {
            showToast(err.response?.data?.error || 'Failed to report post', 'error');
        },
    });
};
