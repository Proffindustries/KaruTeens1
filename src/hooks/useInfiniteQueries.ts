import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../api/client';
import { STALE_TIMES, infiniteQueryConfig } from '../utils/queryConfig';
import type { PostResponse, FeedResponse } from '../types';

/**
 * Generic infinite query hook for paginated endpoints
 */
export const useInfinitePosts = <T = any>(
    endpoint: string,
    queryKey: string[],
    paramsFactory: (pageParam: string | null) => Record<string, any>,
    dataExtractor: (response: any) => T[] = (response) => response.posts || response.data || [],
    options: any = {},
) => {
    return useInfiniteQuery({
        queryKey,
        queryFn: async ({ pageParam }: { pageParam: string | null }) => {
            const { data } = await api.get(endpoint, {
                params: {
                    ...paramsFactory(pageParam),
                    limit: 10,
                },
            });
            return dataExtractor(data);
        },
        getNextPageParam: (lastPage: T[]) => {
            if (!lastPage || lastPage.length === 0) return undefined;
            const lastItem = lastPage[lastPage.length - 1] as any;
            return lastItem?.id;
        },
        initialPageParam: null as string | null,
        staleTime: STALE_TIMES.FEED_POSTS,
        ...options,
    });
};

/**
 * Infinite query for standard feed
 */
export const useInfiniteFeed = () => {
    return useInfinitePosts(
        '/posts/feed',
        ['feed', 'infinite'],
        (pageParam) => ({ last_id: pageParam }),
        (response) => response.posts,
        {
            staleTime: STALE_TIMES.FEED_POSTS,
        },
    );
};

/**
 * Infinite query for "For You" feed
 */
export const useInfiniteForYouFeed = () => {
    return useInfinitePosts(
        '/posts/for-you',
        ['feed', 'for-you'],
        (pageParam) => ({ last_id: pageParam }),
        (response) => response.posts,
        {
            staleTime: STALE_TIMES.FEED_POSTS,
        },
    );
};

/**
 * Infinite query for trending posts
 */
export const useInfiniteTrendingPosts = () => {
    return useInfinitePosts(
        '/posts/trending-posts',
        ['feed', 'trending'],
        (pageParam) => ({ last_id: pageParam }),
        (response) => response.posts,
        {
            staleTime: STALE_TIMES.TRENDING_POSTS,
        },
    );
};

/**
 * Generic infinite query for user-generated content
 */
export const useInfiniteUserContent = (
    userId: string,
    contentType: 'posts' | 'comments' | 'reactions',
    options: any = {},
) => {
    return useInfiniteQuery({
        queryKey: ['user-content', userId, contentType],
        queryFn: async ({ pageParam }: { pageParam: string | null }) => {
            const { data } = await api.get(`/users/${userId}/${contentType}`, {
                params: {
                    last_id: pageParam,
                    limit: 10,
                },
            });
            return data[contentType] || data.data || [];
        },
        getNextPageParam: (lastPage: any[]) => {
            if (!lastPage || lastPage.length === 0) return undefined;
            const lastItem = lastPage[lastPage.length - 1];
            return lastItem?.id;
        },
        initialPageParam: null as string | null,
        staleTime: STALE_TIMES.USER_PROFILE,
        ...options,
    });
};

/**
 * Infinite query for chat messages (special case with different pagination)
 */
export const useInfiniteChatMessages = (chatId: string) => {
    return useInfiniteQuery({
        ...infiniteQueryConfig,
        queryKey: ['messages', chatId, 'infinite'],
        queryFn: async ({ pageParam }: { pageParam: string | null }) => {
            const { data } = await api.get(`/messages/${chatId}/messages`, {
                params: {
                    before: pageParam,
                    limit: 50,
                },
            });
            return data.messages || data;
        },
        getNextPageParam: (lastPage: any[]) => {
            if (!lastPage || lastPage.length === 0) return undefined;
            const lastMessage = lastPage[lastPage.length - 1];
            return lastMessage?.id;
        },
        initialPageParam: null as string | null,
        staleTime: STALE_TIMES.CHAT_MESSAGES,
    });
};
export const useInfinitePagePosts = (pageId: string) => {
    return useInfinitePosts(
        '/posts/feed',
        ['page-posts', pageId],
        (pageParam) => ({
            last_id: pageParam,
            page_id: pageId
        }),
        (response) => response.posts,
    );
};
