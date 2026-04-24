use serde::{Deserialize, Serialize};
use crate::models::{Location, Poll, Badge, SocialLinks, NotificationSettings};

// Basic DTOs needed for compilation
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
    pub role: String,
    pub username: Option<String>,
    pub is_verified: bool,
    pub is_premium: bool,
    pub premium_expires_at: Option<String>,
    pub onboarded: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub username: String,
    pub full_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub school: Option<String>,
    pub year_of_study: Option<i32>,
    pub age: Option<i32>,
    pub gender: Option<String>,
}

// Event DTOs
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EventResponse {
    pub id: String,
    pub title: String,
    pub description: String,
    pub location: String,
    pub location_type: Option<String>,
    pub venue_name: Option<String>,
    pub venue_address: Option<String>,
    pub virtual_meeting_url: Option<String>,
    pub start_datetime: String,
    pub end_datetime: String,
    pub registration_start: Option<String>,
    pub registration_end: Option<String>,
    pub category: String,
    pub is_virtual: bool,
    pub max_attendees: u64,
    pub current_attendees: u64,
    pub event_type: String,
    pub status: String,
    pub is_recurring: bool,
    pub recurrence_pattern: Option<String>,
    pub recurrence_end_date: Option<String>,
    pub image_url: Option<String>,
    pub banner_url: Option<String>,
    pub featured: bool,
    pub ticket_price: Option<f64>,
    pub currency: Option<String>,
    pub rsvp_required: bool,
    pub waitlist_enabled: bool,
    pub waitlist_count: u64,
    pub tags: Option<Vec<String>>,
    pub organizer_id: String,
    pub organizer_name: String,
    pub organizer_contact: Option<String>,
    pub rsvp_stats: RSVPStats,
    pub attendance_stats: AttendanceStats,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
pub struct CreateEventRequest {
    pub title: String,
    pub description: String,
    pub location: String,
    pub start_datetime: String,
    pub end_datetime: String,
    pub registration_start: Option<String>,
    pub registration_end: Option<String>,
    pub max_attendees: Option<i32>,
    pub category: String,
    pub tags: Option<Vec<String>>,
    pub event_type: Option<String>,
    pub status: Option<String>,
    pub featured: Option<bool>,
    pub ticket_price: Option<f64>,
    pub currency: Option<String>,
    pub rsvp_required: Option<bool>,
    pub waitlist_enabled: Option<bool>,
    pub organizer_contact: Option<String>,
    pub is_recurring: Option<bool>,
    pub recurrence_pattern: Option<String>,
    pub image_url: Option<String>,
    pub banner_url: Option<String>,
    pub location_type: Option<String>,
    pub venue_name: Option<String>,
    pub venue_address: Option<String>,
    pub virtual_meeting_url: Option<String>,
    pub recurrence_end_date: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateEventRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub location: Option<String>,
    pub start_datetime: Option<String>,
    pub end_datetime: Option<String>,
    pub registration_start: Option<String>,
    pub registration_end: Option<String>,
    pub max_attendees: Option<i32>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub event_type: Option<String>,
    pub status: Option<String>,
}

#[derive(Deserialize)]
pub struct EventUpdateRequest {
    pub location: Option<String>,
    pub start_datetime: Option<String>,
    pub end_datetime: Option<String>,
    pub registration_start: Option<String>,
    pub registration_end: Option<String>,
    pub category: Option<String>,
    pub is_virtual: Option<bool>,
    pub max_attendees: Option<i32>,
    pub image_url: Option<String>,
    pub banner_url: Option<String>,
    pub ticket_price: Option<i64>,
    pub currency: Option<String>,
    pub rsvp_required: Option<bool>,
    pub waitlist_enabled: Option<bool>,
}

// Post DTOs
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PostResponse {
    pub id: String,
    pub content: String,
    pub user: String,
    pub user_avatar: Option<String>,
    pub likes: i32,
    pub comments: i32,
    pub created_at: String,
    pub media_urls: Option<Vec<String>>,
    pub location: Option<String>,
    pub post_type: String,
    pub is_liked: bool,
    pub group_id: Option<String>,
    pub group_name: Option<String>,
    pub group_avatar: Option<String>,
    pub page_id: Option<String>,
    pub page_name: Option<String>,
    pub page_avatar: Option<String>,
    pub is_nsfw: bool,
    pub is_anonymous: bool,
    pub content_rating: Option<String>,
    pub is_saved: bool,
    pub poll: Option<serde_json::Value>,
    pub engagement_score: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PostDetailResponse {
    pub id: String,
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub slug: String,
    pub status: String,
    pub post_type: String,
    pub category: String,
    pub tags: Option<Vec<String>>,
    pub author_id: String,
    pub author_name: String,
    pub author_username: Option<String>,
    pub author_avatar: Option<String>,
    pub media_urls: Option<Vec<String>>,
    pub scheduled_publish_date: Option<String>,
    pub published_at: Option<String>,
    pub approved_at: Option<String>,
    pub approved_by: Option<String>,
    pub rejected_at: Option<String>,
    pub rejected_by: Option<String>,
    pub rejection_reason: Option<String>,
    pub view_count: i32,
    pub like_count: i32,
    pub comment_count: i32,
    pub share_count: i32,
    pub reading_time: Option<i32>,
    pub language: Option<String>,
    pub is_featured: bool,
    pub is_premium: bool,
    pub allow_comments: bool,
    pub allow_sharing: bool,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub seo_keywords: Option<Vec<String>>,
    pub is_nsfw: bool,
    pub is_anonymous: bool,
    pub source_url: Option<String>,
    pub source_author: Option<String>,
    pub plagiarism_score: Option<f64>,
    pub content_rating: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub analytics: Option<PostAnalyticsSummary>,
}

#[derive(Deserialize)]
pub struct CreatePostRequest {
    pub title: Option<String>,
    pub content: String,
    pub excerpt: Option<String>,
    pub category: String,
    pub tags: Option<Vec<String>>,
    pub post_type: Option<String>,
    pub scheduled_publish_date: Option<String>,
    pub language: Option<String>,
    pub is_featured: Option<bool>,
    pub is_premium: Option<bool>,
    pub allow_comments: Option<bool>,
    pub allow_sharing: Option<bool>,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub seo_keywords: Option<Vec<String>>,
    pub meta_data: Option<serde_json::Value>,
    pub content_rating: Option<String>,
    pub media_urls: Option<Vec<String>>,
    pub is_nsfw: Option<bool>,
    pub is_anonymous: Option<bool>,
    pub status: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdatePostRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub excerpt: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub post_type: Option<String>,
    pub scheduled_publish_date: Option<String>,
    pub language: Option<String>,
    pub is_featured: Option<bool>,
    pub is_premium: Option<bool>,
    pub allow_comments: Option<bool>,
    pub allow_sharing: Option<bool>,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub seo_keywords: Option<Vec<String>>,
    pub meta_data: Option<serde_json::Value>,
    pub content_rating: Option<String>,
}

#[derive(Deserialize)]
pub struct ReportPostRequest {
    pub reason: String,
    pub description: Option<String>,
}

// Common filter types
#[derive(Deserialize, Debug, Serialize)]
pub struct PostFilter {
    pub status: Option<String>,
    pub post_type: Option<String>,
    pub category: Option<String>,
    pub search: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}

#[derive(Deserialize, Debug, Serialize)]
pub struct EventFilter {
    pub status: Option<String>,
    pub category: Option<String>,
    pub search: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub location_type: Option<String>,
    pub event_type: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub upcoming: Option<bool>,
}

#[derive(Deserialize, Debug, Serialize)]
pub struct GroupFilter {
    pub category: Option<String>,
    pub search: Option<String>,
    pub is_private: Option<bool>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

// Placeholder DTOs for other modules
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GroupPostResponse {
    pub id: String,
    pub content: String,
    pub group_id: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GroupResponse {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: String,
    pub member_count: u64,
    pub is_member: bool,
    pub cover_url: Option<String>,
    pub creator_id: String,
    pub admins: Vec<String>,
    pub members: Vec<MemberInfo>,
    pub is_private: bool,
    pub max_members: u64,
    pub category: String,
    pub avatar_url: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StoryResponse {
    pub id: String,
    pub user_id: String,
    pub username: String,
    pub user_avatar: Option<String>,
    pub media_url: String,
    pub media_type: String,
    pub caption: Option<String>,
    pub location: Option<Location>,
    pub hashtags: Option<Vec<String>>,
    pub mentions: Option<Vec<String>>,
    pub is_highlight: bool,
    pub highlight_category: Option<String>,
    pub created_at: String,
    pub expires_at: String,
    pub is_deleted: bool,
    pub deleted_at: Option<String>,
    pub deleted_by: Option<String>,
    pub deleted_reason: Option<String>,
    pub moderation_status: String,
    pub moderation_notes: Option<String>,
    pub spam_score: Option<f64>,
    pub sentiment_score: Option<f64>,
    pub reported_count: i32,
    pub view_count: i32,
    pub reply_count: i32,
    pub engagement_score: f64,
    pub is_private: bool,
    pub allowed_users: Option<Vec<String>>,
    pub story_type: String,
    pub story_data: Option<serde_json::Value>,
    pub updated_at: String,
    pub views: Option<Vec<serde_json::Value>>,
    pub replies: Option<Vec<serde_json::Value>>,
    pub reports: Option<Vec<serde_json::Value>>,
    pub moderation_history: Option<Vec<serde_json::Value>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MarketplaceItemResponse {
    pub id: String,
    pub title: String,
    pub description: String,
    pub price: f64,
    pub category: String,
    pub images: Option<Vec<String>>,
    pub status: String,
    pub seller_is_verified: bool,
    pub seller_id: String,
    pub seller_name: String,
    pub seller_avatar: Option<String>,
    pub currency: String,
    pub condition: String,
    pub boosted_until: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PageResponse {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub is_official: bool,
    pub follower_count: u64,
    pub post_count: u64,
    pub is_following: bool,
    pub is_creator: bool,
    pub slug: String,
    pub avatar_url: Option<String>,
    pub cover_url: Option<String>,
    pub creator_id: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CommentResponse {
    pub id: String,
    pub content_id: String,
    pub content_type: String,
    pub user_id: String,
    pub username: String,
    pub user_avatar: Option<String>,
    pub parent_id: Option<String>,
    pub content: String,
    pub status: String,
    pub spam_score: Option<f64>,
    pub sentiment_score: Option<f64>,
    pub reported_count: i32,
    pub likes: i32,
    pub replies_count: i32,
    pub created_at: String,
    pub updated_at: String,
    pub edited_at: Option<String>,
    pub deleted_at: Option<String>,
    pub deleted_by: Option<String>,
    pub deleted_reason: Option<String>,
    pub moderation_notes: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub is_edited: bool,
    pub reports: Option<Vec<serde_json::Value>>,
    pub moderation_history: Option<Vec<serde_json::Value>>,
}



#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FeedResponse {
    pub posts: Vec<PostResponse>,
    pub next_cursor: Option<String>,
}

#[derive(Deserialize)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Deserialize)]
pub struct ResetPasswordRequest {
    pub email: String,
    pub code: String,
    pub new_password: String,
}

#[derive(Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MessageResponse {
    pub message: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct IdResponse {
    pub id: String,
    pub message: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PaginationInfo {
    pub current_page: i64,
    pub total_pages: i64,
    pub total_items: u64,
    pub items_per_page: i64,
    pub has_next: bool,
    pub has_prev: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub pagination: PaginationInfo,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RSVPStats {
    pub interested: i32,
    pub going: i32,
    pub maybe: i32,
    pub not_going: i32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AttendanceStats {
    pub checked_in: i32,
    pub total_attendees: i32,
    pub attendance_rate: f64,
}

#[derive(Deserialize)]
pub struct CheckInRequest {
    pub event_id: String,
    pub attended: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MemberInfo {
    pub user_id: String,
    pub username: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateGroupRequest {
    pub name: String,
    pub description: String,
    pub category: String,
    pub is_private: bool,
    pub avatar_url: Option<String>,
    pub cover_url: Option<String>,
    pub max_members: Option<i32>,
}

#[derive(Deserialize)]
pub struct UpdateGroupRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub is_private: Option<bool>,
    pub avatar_url: Option<String>,
    pub cover_url: Option<String>,
    pub max_members: Option<i32>,
}

#[derive(Deserialize)]
pub struct AddMemberRequest {
    pub user_id: String,
}

#[derive(Deserialize)]
pub struct RemoveMemberRequest {
    pub user_id: String,
}

#[derive(Deserialize)]
pub struct MakeAdminRequest {
    pub user_id: String,
}

#[derive(Deserialize)]
pub struct CreateItemRequest {
    pub title: String,
    pub description: String,
    pub price: f64,
    pub category: String,
    pub condition: String,
    pub currency: Option<String>,
    pub images: Option<Vec<String>>,
}

#[derive(Deserialize, Debug, Serialize)]
pub struct ItemFilter {
    pub category: Option<String>,
    pub search: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Deserialize)]
pub struct CreatePageRequest {
    pub name: String,
    pub description: String,
    pub category: String,
    pub cover_url: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Deserialize, Debug, Serialize)]
pub struct PageFilter {
    pub category: Option<String>,
    pub search: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PostAnalyticsSummary {
    pub total_views: i32,
    pub unique_views: i32,
    pub total_likes: i32,
    pub total_comments: i32,
    pub total_shares: i32,
    pub avg_reading_time: Option<f64>,
    pub engagement_rate: f64,
}

#[derive(Deserialize)]
pub struct ApprovePostRequest {
    pub status: String,
    pub comments: Option<String>,
    pub rejection_reason: Option<String>,
    pub media_urls: Option<Vec<String>>,
    pub approved_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProfileResponse {
    pub id: Option<String>,
    pub user_id: String,
    pub username: String,
    pub full_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub school: Option<String>,
    pub year_of_study: Option<i32>,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub reg: Option<String>,
    pub quote: Option<String>,
    pub location: Option<String>,
    pub social_links: Option<SocialLinks>,
    pub is_verified: bool,
    pub is_premium: bool,
    pub follower_count: u64,
    pub following_count: u64,
    pub points: u64,
    pub level: u64,
    pub created_at: Option<String>,
    pub is_locked: bool,
    pub onboarded: bool,
}

#[derive(Deserialize, Serialize)]
pub struct UpdateProfileRequest {
    pub full_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub school: Option<String>,
    pub year_of_study: Option<i32>,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub reg: Option<String>,
    pub quote: Option<String>,
    pub location: Option<String>,
    pub is_locked: Option<bool>,
    pub social_links: Option<SocialLinks>,
    pub public_key: Option<String>,
    pub onboarded: Option<bool>,
    pub interests: Option<Vec<String>>,
    pub notification_settings: Option<NotificationSettings>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UserGamificationResponse {
    pub points: u64,
    pub streak: i32,
    pub longest_streak: i32,
    pub profile_views: u64,
    pub badges: Vec<Badge>,
    pub level: u64,
    pub next_level_points: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProfileResponseWrapper {
    pub profile: ProfileResponse,
    pub is_following: bool,
}

// Placeholder DTOs for remaining modules
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CommentModerationQueueResponse {
    pub comment_id: String,
    pub content_id: String,
    pub content_type: String,
    pub user_id: String,
    pub username: String,
    pub content: String,
    pub spam_score: f64,
    pub sentiment_score: f64,
    pub reported_count: i32,
    pub created_at: String,
    pub priority: String,
    pub assigned_to: Option<String>,
    pub assigned_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UserCommentStatsResponse {
    pub user_id: String,
    pub username: String,
    pub total_comments: i32,
    pub approved_comments: i32,
    pub pending_comments: i32,
    pub rejected_comments: i32,
    pub spam_comments: i32,
    pub deleted_comments: i32,
    pub total_likes_received: i32,
    pub total_replies_received: i32,
    pub avg_spam_score: Option<f64>,
    pub avg_sentiment_score: Option<f64>,
    pub last_comment_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
pub struct UpdateCommentRequest {
    pub content: String,
}

#[derive(Deserialize)]
pub struct ReportCommentRequest {
    pub reason: String,
    pub description: Option<String>,
}

#[derive(Deserialize)]
pub struct ModerateCommentRequest {
    pub action: String,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub after_content: Option<String>,
}

#[derive(Deserialize, Debug, Serialize)]
pub struct CommentFilter {
    pub content_type: Option<String>,
    pub status: Option<String>,
    pub user_id: Option<String>,
    pub spam_score_min: Option<f64>,
    pub spam_score_max: Option<f64>,
    pub reported_count_min: Option<i32>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Deserialize)]
pub struct SpamRuleRequest {
    pub name: String,
    pub pattern: String,
    pub action: String,
    pub description: Option<String>,
    pub score: Option<f64>,
    pub category: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ConfessionResponse {
    pub id: String,
    pub content: String,
    pub author_id: String,
    pub author_name: String,
    pub is_anonymous: bool,
    pub likes: i32,
    pub comments: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ConfessionCommentResponse {
    pub id: String,
    pub content: String,
    pub created_at: String,
    pub confession_id: String,
    pub author_id: String,
    pub author_username: String,
}

#[derive(Deserialize)]
pub struct CreateConfessionRequest {
    pub content: String,
    pub is_anonymous: Option<bool>,
    pub author_id: Option<String>,
    pub author_name: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateConfessionRequest {
    pub content: Option<String>,
    pub is_anonymous: Option<bool>,
}

#[derive(Deserialize)]
pub struct CreateConfessionCommentRequest {
    pub content: String,
}

#[derive(Deserialize)]
pub struct ReportConfessionRequest {
    pub reason: String,
}



#[derive(Deserialize, Debug, Serialize)]
pub struct ConfessionFilter {
    pub status: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StoryModerationQueueResponse {
    pub id: String,
    pub story_id: String,
    pub user_id: String,
    pub username: String,
    pub media_url: String,
    pub caption: Option<String>,
    pub media_type: String,
    pub status: String,
    pub spam_score: f64,
    pub sentiment_score: f64,
    pub reported_count: i32,
    pub priority: i32,
    pub assigned_to: Option<String>,
    pub assigned_at: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UserStoryStatsResponse {
    pub user_id: String,
    pub username: String,
    pub total_stories: i32,
    pub total_views: i32,
    pub active_stories: i32,
    pub expired_stories: i32,
    pub highlights: i32,
    pub total_replies: i32,
    pub avg_completion_rate: f64,
    pub avg_engagement_rate: f64,
    pub avg_view_duration: f64,
    pub last_story_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
pub struct CreateStoryRequest {
    pub media_url: String,
    pub media_type: String,
    pub caption: Option<String>,
    pub location: Option<Location>,
    pub hashtags: Option<Vec<String>>,
    pub mentions: Option<Vec<String>>,
    pub is_highlight: Option<bool>,
    pub highlight_category: Option<String>,
    pub is_private: Option<bool>,
    pub story_type: Option<String>,
    pub story_data: Option<serde_json::Value>,
    pub is_nsfw: Option<bool>,
    pub allowed_users: Option<Vec<String>>,
}

#[derive(Deserialize)]
pub struct UpdateStoryRequest {
    pub caption: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateStoryViewRequest {
    pub story_id: String,
}

#[derive(Deserialize)]
pub struct CreateStoryReplyRequest {
    pub content: String,
}

#[derive(Deserialize)]
pub struct CreateStoryReportRequest {
    pub reason: String,
}

#[derive(Deserialize)]
pub struct ModerateStoryRequest {
    pub action: String,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub after_caption: Option<String>,
}

#[derive(Deserialize, Debug, Serialize)]
pub struct StoryFilter {
    pub status: Option<String>,
    pub media_type: Option<String>,
    pub user_id: Option<String>,
    pub story_type: Option<String>,
    pub is_highlight: Option<bool>,
    pub is_private: Option<bool>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Deserialize)]
pub struct CreateStoryScheduleRequest {
    pub scheduled_time: String,
}

#[derive(Deserialize)]
pub struct CreateStoryTemplateRequest {
    pub name: String,
    pub template_data: serde_json::Value,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PostWorkflowResponse {
    pub post: PostDetailResponse,
    pub revisions: Vec<serde_json::Value>,
    pub approvals: Vec<serde_json::Value>,
    pub moderation_history: Vec<serde_json::Value>,
}
