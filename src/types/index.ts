/**
 * Common fields for all models that come from the backend.
 * Backend uses ObjectId for IDs, which are serialized as strings in JSON.
 * Standardized ID naming: 'id' for primary ID, 'user_id' for user references
 */
export interface BaseModel {
    id: string;
    created_at: string;
    updated_at?: string;
}

export interface User extends BaseModel {
    email: string;
    role: 'user' | 'premium' | 'admin' | 'superadmin';
    username?: string;
    is_verified: boolean;
    is_premium: boolean;
    premium_expires_at?: string;
    onboarded: boolean;
}

export interface Badge {
    id: string;
    name: string;
    icon: string;
    description: string;
}

export interface NotificationSettings {
    messages: boolean;
    likes: boolean;
    comments: boolean;
    follows: boolean;
}

export interface SocialLinks {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    other?: string;
}

export interface Profile extends BaseModel {
    user_id: string;
    username: string;
    full_name?: string;
    bio?: string;
    avatar_url?: string;
    school?: string;
    year_of_study?: number;
    age?: number;
    gender?: string;
    quote?: string;
    location?: string;
    social_links?: SocialLinks;
    last_seen_at?: string;
    is_locked: boolean;
    follower_count: number;
    following_count: number;
    points: number;
    streak: number;
    level: number;
    badges?: Badge[];
}

export interface Location {
    latitude: number;
    longitude: number;
    label?: string;
    is_live?: boolean;
    expires_at?: string;
}

export interface PollOption {
    text: string;
    voter_ids: string[];
}

export interface Poll {
    question: string;
    options: PollOption[];
    is_multiple: boolean;
    is_closed: boolean;
    created_at: string;
}

export interface Post extends BaseModel {
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
    is_featured: boolean;
    is_premium: boolean;
    is_nsfw: boolean;
    is_anonymous: boolean;
    poll?: Poll;
    allow_comments: boolean;
    allow_sharing: boolean;
}

/**
 * The structure of a post as returned by feed/list endpoints.
 */
export interface PostResponse {
    id: string;
    content: string;
    user: string; // This might be the author's username or ID depending on context
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

export interface Draft extends BaseModel {
    content: string;
    media_urls: string[];
    post_type: string;
    is_anonymous: boolean;
    audience?: string[];
    is_pinned: boolean;
    is_nsfw: boolean;
    title?: string;
}

export interface Comment extends BaseModel {
    content_id: string;
    content_type: string;
    user_id: string;
    username: string;
    user_avatar?: string;
    content: string;
    parent_id?: string;
    replies_count: number;
    likes: number;
    status: string;
    is_edited: boolean;
}

export interface Notification extends BaseModel {
    user_id: string;
    actor_id: string;
    notification_type: string;
    target_id?: string;
    content: string;
    is_read: boolean;
}

export interface Message extends BaseModel {
    conversation_id: string;
    sender_id: string;
    content: string;
    message_type: string;
    media_url?: string;
    read_by: string[];
}

export interface Conversation extends BaseModel {
    participants: string[];
    last_message?: Message;
    unread_count: number;
}

export interface Story extends BaseModel {
    user_id: string;
    media_url: string;
    media_type: string;
    caption?: string;
    viewers: string[];
    reply_count: number;
    expires_at: string;
}

export interface Reel extends BaseModel {
    user_id: string;
    media_url: string;
    caption?: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    share_count: number;
    trending_score: number;
    is_nsfw: boolean;
}

export interface Event extends BaseModel {
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
}

export interface Group extends BaseModel {
    name: string;
    description: string;
    avatar_url?: string;
    cover_url?: string;
    is_private: boolean;
    member_count: number;
    admin_ids: string[];
    members: string[];
}

export interface MarketplaceItem extends BaseModel {
    seller_id: string;
    title: string;
    description: string;
    price: number; // In cents
    currency: string;
    condition: string;
    category: string;
    images: string[];
    status: string;
    views?: number;
    favorites?: number;
}

export interface TrendingTopic {
    id: string; // Standardized from _id to id
    tag: string;
    count: number;
}

export interface ApiError {
    error: string;
    message?: string;
    details?: any; // Additional error details for better debugging
    code?: string; // Error code for programmatic handling
}

export interface PaginatedResponse<T> {
    items: T[]; // Changed from 'data' to 'items' to match backend
    pagination: PaginationInfo;
}

export interface PaginationInfo {
    current_page: number; // Changed to number for TypeScript
    total_pages: number;
    total_items: number; // Changed to number for TypeScript
    items_per_page: number;
    has_next: boolean;
    has_prev: boolean;
}

// Backend DTO matching types
export interface PostDetailResponse {
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
    scheduled_publish_date?: string;
    published_at?: string;
    approved_at?: string;
    approved_by?: string;
    rejected_at?: string;
    rejected_by?: string;
    rejection_reason?: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    share_count: number;
    reading_time?: number;
    language: string;
    is_featured: boolean;
    is_premium: boolean;
    allow_comments: boolean;
    allow_sharing: boolean;
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string[];
    is_nsfw?: boolean;
    is_anonymous: boolean;
    source_url?: string;
    source_author?: string;
    plagiarism_score?: number;
    content_rating?: string;
    created_at: string;
    updated_at: string;
    analytics?: PostAnalyticsSummary;
}

export interface PostAnalyticsSummary {
    total_views: number;
    unique_views: number;
    total_likes: number;
    total_comments: number;
    total_shares: number;
    avg_reading_time?: number;
    engagement_rate: number;
}

export interface EventResponse {
    id: string;
    title: string;
    description: string;
    location: string;
    location_type: string;
    venue_name?: string;
    venue_address?: string;
    virtual_meeting_url?: string;
    start_datetime: string;
    end_datetime: string;
    registration_start?: string;
    registration_end?: string;
    max_attendees?: number;
    current_attendees: number;
    category: string;
    tags?: string[];
    organizer_id: string;
    organizer_name: string;
    organizer_contact?: string;
    event_type: string;
    status: string;
    is_recurring: boolean;
    recurrence_pattern?: string;
    recurrence_end_date?: string;
    image_url?: string;
    banner_url?: string;
    featured: boolean;
    ticket_price?: number;
    currency?: string;
    rsvp_required: boolean;
    waitlist_enabled: boolean;
    waitlist_count: number;
    created_at: string;
    updated_at: string;
    rsvp_stats: RSVPStats;
    attendance_stats: AttendanceStats;
}

export interface RSVPStats {
    interested: number;
    going: number;
    maybe: number;
    not_going: number;
}

export interface AttendanceStats {
    checked_in: number;
    total_attendees: number;
    attendance_rate: number;
}

export interface GroupResponse {
    id: string;
    name: string;
    description: string;
    category: string;
    avatar_url?: string;
    cover_url?: string;
    creator_id: string;
    admins: string[];
    members: MemberInfo[];
    is_private: boolean;
    max_members?: number;
    member_count: number;
    is_member: boolean;
    created_at: string;
}

export interface MemberInfo {
    user_id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
}

export interface StoryResponse {
    id: string;
    user_id: string;
    username: string;
    user_avatar?: string;
    media_url: string;
    media_type: string;
    caption?: string;
    location?: Location;
    hashtags?: string[];
    mentions?: string[];
    is_highlight: boolean;
    highlight_category?: string;
    created_at: string;
    expires_at: string;
    is_deleted: boolean;
    deleted_at?: string;
    deleted_by?: string;
    deleted_reason?: string;
    moderation_status: string;
    moderation_notes?: string;
    spam_score?: number;
    sentiment_score?: number;
    reported_count: number;
    view_count: number;
    reply_count: number;
    engagement_score: number;
    is_private: boolean;
    allowed_users?: string[];
    story_type: string;
    story_data?: any;
    updated_at: string;
}

export interface MarketplaceItemResponse {
    id: string;
    seller_id: string;
    seller_name: string;
    seller_avatar?: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    condition: string;
    category: string;
    images: string[];
    status: string;
    created_at: string;
    seller_is_verified: boolean;
}

// Error handling types
export interface BackendError {
    error: string;
    message?: string;
    details?: any;
    code?: string;
}

// Request types matching backend DTOs
export interface CreateEventRequest {
    title: string;
    description: string;
    location: string;
    location_type?: string;
    venue_name?: string;
    venue_address?: string;
    virtual_meeting_url?: string;
    start_datetime: string;
    end_datetime: string;
    registration_start?: string;
    registration_end?: string;
    max_attendees?: number;
    category: string;
    tags?: string[];
    event_type?: string;
    status?: string;
    is_recurring?: boolean;
    recurrence_pattern?: string;
    recurrence_end_date?: string;
    image_url?: string;
    banner_url?: string;
    featured?: boolean;
    ticket_price?: number;
    currency?: string;
    rsvp_required?: boolean;
    waitlist_enabled?: boolean;
    organizer_contact?: string;
}

export interface UpdateEventRequest {
    title?: string;
    description?: string;
    location?: string;
    location_type?: string;
    venue_name?: string;
    venue_address?: string;
    virtual_meeting_url?: string;
    start_datetime?: string;
    end_datetime?: string;
    registration_start?: string;
    registration_end?: string;
    max_attendees?: number;
    category?: string;
    tags?: string[];
    event_type?: string;
    status?: string;
    is_recurring?: boolean;
    recurrence_pattern?: string;
    recurrence_end_date?: string;
    image_url?: string;
    banner_url?: string;
    featured?: boolean;
    ticket_price?: number;
    currency?: string;
    rsvp_required?: boolean;
    waitlist_enabled?: boolean;
}
