export interface User {
    id: string;
    email: string;
    role: string;
    is_verified: boolean;
    is_premium: boolean;
    premium_tier?: string;
    created_at: string;
}

export interface Profile {
    id: string;
    user_id: string;
    username: string;
    full_name?: string;
    bio?: string;
    avatar_url?: string;
    school?: string;
    year_of_study?: number;
    age?: number;
    gender?: string;
    is_locked: boolean;
    created_at: string;
}

export interface Post {
    id: string;
    title: string;
    content: string;
    excerpt?: string;
    slug: string;
    status: string;
    post_type: string;
    category: string;
    tags?: string[];
    author_id: string;
    author_name: string;
    media_urls?: string[];
    location?: Location;
    published_at?: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    share_count: number;
    reaction_counts: ReactionCounts;
    is_featured: boolean;
    is_premium: boolean;
    is_pinned: boolean;
    is_nsfw: boolean;
    is_anonymous: boolean;
    created_at: string;
    updated_at: string;
}

export interface Location {
    latitude: number;
    longitude: number;
    label?: string;
    is_live?: boolean;
    expires_at?: string;
}

export interface ReactionCounts {
    love: number;
    laugh: number;
    angry: number;
    sad: number;
}

export interface PostResponse {
    id: string;
    content: string;
    user: string;
    user_avatar?: string;
    likes: number;
    comments: number;
    created_at: string;
    media_urls: string[];
    location?: Location;
    post_type: string;
    is_liked: boolean;
    group_id?: string;
    group_name?: string;
    group_avatar?: string;
    is_pinned: boolean;
    is_nsfw: boolean;
    audience?: string[];
}

export interface FeedResponse {
    posts: PostResponse[];
    next_cursor?: string;
}

export interface Draft {
    id: string;
    content: string;
    media_urls: string[];
    post_type: string;
    is_anonymous: boolean;
    audience?: string[];
    is_pinned: boolean;
    is_nsfw: boolean;
    title?: string;
    created_at: string;
    updated_at: string;
}

export interface Comment {
    id: string;
    user_id: string;
    username: string;
    content: string;
    parent_comment_id?: string;
    replies_count: number;
    created_at: string;
}

export interface Notifications {
    id: string;
    user_id: string;
    actor_id: string;
    notification_type: string;
    target_id?: string;
    content: string;
    is_read: boolean;
    created_at: string;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    message_type: string;
    media_url?: string;
    read_by: string[];
    created_at: string;
}

export interface Conversation {
    id: string;
    participants: string[];
    last_message?: Message;
    unread_count: number;
    created_at: string;
    updated_at: string;
}

export interface Story {
    id: string;
    user_id: string;
    media_url: string;
    media_type: string;
    caption?: string;
    viewers: string[];
    reply_count: number;
    expires_at: string;
    created_at: string;
}

export interface Reel {
    id: string;
    user_id: string;
    media_url: string;
    caption?: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    share_count: number;
    trending_score: number;
    is_nsfw: boolean;
    created_at: string;
}

export interface Event {
    id: string;
    title: string;
    description: string;
    cover_url?: string;
    location?: Location;
    location_name?: string;
    start_time: string;
    end_time?: string;
    organizer_id: string;
    organizer_name: string;
    is_online: boolean;
    online_link?: string;
    attendee_count: number;
    category: string;
    status: string;
    created_at: string;
}

export interface Group {
    id: string;
    name: string;
    description: string;
    avatar_url?: string;
    cover_url?: string;
    category: string;
    is_private: boolean;
    member_count: number;
    admin_ids: string[];
    members: string[];
    created_at: string;
}

export interface MarketplaceItem {
    id: string;
    seller_id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    condition: string;
    images: string[];
    status: string;
    views: number;
    favorites: number;
    created_at: string;
}

export interface TrendingTopic {
    _id: string;
    tag: string;
    count: number;
}

export interface ApiError {
    error: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        current_page: number;
        total_pages: number;
        total_items: number;
        items_per_page: number;
        has_next: boolean;
        has_prev: boolean;
    };
}
