/**
 * React Query Configuration Constants
 * Standardized stale times and configuration for consistent caching behavior
 */

export const STALE_TIMES = {
    // User data
    USER_PROFILE: 5 * 60 * 1000, // 5 minutes
    USER_PREFERENCES: 10 * 60 * 1000, // 10 minutes
    USER_SETTINGS: 30 * 60 * 1000, // 30 minutes

    // Content
    FEED_POSTS: 2 * 60 * 1000, // 2 minutes
    FOR_YOU_FEED: 2 * 60 * 1000, // 2 minutes
    TRENDING_POSTS: 60 * 1000, // 1 minute
    POST_DETAIL: 5 * 60 * 1000, // 5 minutes
    TRENDING_TOPICS: 60 * 1000, // 1 minute
    SAVED_POSTS: 5 * 60 * 1000, // 5 minutes
    DRAFTS: 5 * 60 * 1000, // 5 minutes

    // Messaging
    CHAT_LIST: 30 * 1000, // 30 seconds
    CHAT_MESSAGES: 30 * 1000, // 30 seconds

    // Notifications
    NOTIFICATIONS: 10 * 1000, // 10 seconds

    // Study rooms
    STUDY_ROOMS: 10 * 1000, // 10 seconds
    STUDY_ROOM_DETAIL: 30 * 1000, // 30 seconds

    // Other features
    EVENTS: 5 * 60 * 1000, // 5 minutes
    GROUPS: 5 * 60 * 1000, // 5 minutes
    MARKETPLACE: 2 * 60 * 1000, // 2 minutes

    // Static data
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
 */
export const defaultQueryOptions = {
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
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
    maxPages: 20, // Prevents infinite scrolling memory issues
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
