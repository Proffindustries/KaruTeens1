/**
 * React Query Configuration Constants
 * Standardized stale times and configuration for consistent caching behavior
 */

export const STALE_TIMES = {
    // User data (cached longer, invalidated by mutation)
    USER_PROFILE: 10 * 60 * 1000, // 10 minutes
    USER_PREFERENCES: 15 * 60 * 1000, // 15 minutes
    USER_SETTINGS: 30 * 60 * 1000, // 30 minutes

    // Content (feed is the most-hit endpoint)
    FEED_POSTS: 3 * 60 * 1000, // 3 minutes
    FOR_YOU_FEED: 3 * 60 * 1000, // 3 minutes
    TRENDING_POSTS: 2 * 60 * 1000, // 2 minutes
    POST_DETAIL: 10 * 60 * 1000, // 10 minutes
    TRENDING_TOPICS: 2 * 60 * 1000, // 2 minutes
    SAVED_POSTS: 5 * 60 * 1000, // 5 minutes
    DRAFTS: 5 * 60 * 1000, // 5 minutes

    // Messaging (fresher needed, but use WS for realtime)
    CHAT_LIST: 60 * 1000, // 1 minute
    CHAT_MESSAGES: 60 * 1000, // 1 minute

    // Notifications (WS pushes updates, so we can cache longer)
    NOTIFICATIONS: 30 * 1000, // 30 seconds

    // Study rooms
    STUDY_ROOMS: 30 * 1000, // 30 seconds
    STUDY_ROOM_DETAIL: 60 * 1000, // 1 minute

    // Other features
    EVENTS: 10 * 60 * 1000, // 10 minutes
    GROUPS: 10 * 60 * 1000, // 10 minutes
    MARKETPLACE: 5 * 60 * 1000, // 5 minutes

    // Static data (never changes)
    STATIC_CONFIG: 60 * 60 * 1000, // 1 hour
    LEGAL_PAGES: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Query key factories for consistent query key structure
 */
export const queryKeys = {
    user: {
        profile: (userId) => ['user', 'profile', userId],
        settings: () => ['user', 'settings'],
        notifications: () => ['notifications'],
        savedPosts: () => ['savedPosts'],
    },
    content: {
        feed: (type = 'infinite') => ['feed', type],
        forYouFeed: () => ['feed', 'for-you'],
        trending: () => ['feed', 'trending'],
        post: (postId) => ['post', postId],
        trendingTopics: () => ['trending', 'topics'],
        drafts: () => ['drafts'],
    },
    messaging: {
        chats: () => ['chats'],
        messages: (chatId) => ['messages', chatId],
    },
    study: {
        rooms: () => ['studyRooms'],
        room: (roomId) => ['studyRoom', roomId],
    },
    groups: {
        list: () => ['groups'],
        detail: (groupId) => ['group', groupId],
    },
    events: {
        list: () => ['events'],
        detail: (eventId) => ['event', eventId],
    },
    marketplace: {
        items: () => ['marketplace'],
        item: (itemId) => ['marketplace', 'item', itemId],
    },
};

/**
 * Default query options to apply to all queries
 * gcTime: how long inactive data stays in cache (prevents memory bloat)
 */
export const defaultQueryOptions = {
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    gcTime: 10 * 60 * 1000, // 10 min garbage collection (React Query v5)
};

/**
 * Mutation default options
 */
export const defaultMutationOptions = {
    retry: 1,
    retryDelay: 1000,
};

/**
 * Infinite query configuration for paginated data
 */
export const infiniteQueryConfig = {
    defaultPageSize: 10,
    maxPages: 10, // Reduced from 20 to prevent memory bloat at 10k users
    getNextPageParam: (lastPage) => {
        if (!lastPage || lastPage.length === 0) return undefined;
        const lastItem = lastPage[lastPage.length - 1];
        return lastItem?.id;
    },
};

/**
 * Helper function to create standardized query config
 */
export const createQueryConfig = (type, customOptions = {}) => {
    const baseConfig = {
        staleTime: STALE_TIMES[type] || STALE_TIMES.FEED_POSTS,
        ...defaultQueryOptions,
        ...customOptions,
    };

    return baseConfig;
};

/**
 * Helper function to create standardized infinite query config
 */
export const createInfiniteQueryConfig = (type, customOptions = {}) => {
    const baseConfig = {
        staleTime: STALE_TIMES[type] || STALE_TIMES.FEED_POSTS,
        ...defaultQueryOptions,
        ...infiniteQueryConfig,
        ...customOptions,
    };

    return baseConfig;
};
