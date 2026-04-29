use bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use super::base::Location;

// --- Follow Model ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Follow {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub follower_id: ObjectId, // Who is following
    pub followed_id: ObjectId, // Who is being followed
    pub created_at: bson::DateTime,
}

// --- Story Models ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Story {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub username: String,
    pub user_avatar: Option<String>,
    pub media_url: String,
    pub media_type: String, // image, video, text
    pub caption: Option<String>,
    pub location: Option<Location>,
    pub hashtags: Option<Vec<String>>,
    pub mentions: Option<Vec<String>>,
    pub is_highlight: bool,
    pub highlight_category: Option<String>,
    pub created_at: bson::DateTime,
    pub expires_at: bson::DateTime,
    pub is_deleted: bool,
    pub deleted_at: Option<bson::DateTime>,
    pub deleted_by: Option<ObjectId>,
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
    pub allowed_users: Option<Vec<ObjectId>>,
    pub story_type: String,
    pub story_data: Option<serde_json::Value>,
    pub updated_at: bson::DateTime,
    #[serde(default)]
    pub is_nsfw: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoryView {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub story_id: ObjectId,
    pub viewer_id: ObjectId,
    pub viewer_username: String,
    pub viewer_avatar: Option<String>,
    pub viewed_at: bson::DateTime,
    pub view_duration: Option<i32>,
    pub is_replay: bool,
    pub location: Option<Location>,
    pub device_info: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoryReply {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub story_id: ObjectId,
    pub user_id: ObjectId,
    pub username: String,
    pub content: String,
    pub reply_type: String,
    pub created_at: bson::DateTime,
    pub is_deleted: bool,
    pub deleted_at: Option<bson::DateTime>,
    pub moderation_status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoryHighlight {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub title: String,
    pub cover_image: Option<String>,
    pub stories: Vec<ObjectId>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoryAnalytics {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub story_id: ObjectId,
    pub date: bson::DateTime,
    pub views: i32,
    pub unique_viewers: i32,
    pub replays: i32,
    pub replies: i32,
    pub completion_rate: f64,
    pub average_view_duration: f64,
    pub engagement_rate: f64,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserStoryStats {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub username: String,
    pub total_stories: i32,
    pub active_stories: i32,
    pub expired_stories: i32,
    pub highlights: i32,
    pub total_views: i32,
    pub total_replies: i32,
    pub avg_completion_rate: f64,
    pub avg_engagement_rate: f64,
    pub avg_view_duration: f64,
    pub last_story_at: Option<bson::DateTime>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoryReport {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub story_id: ObjectId,
    pub reported_by: ObjectId,
    pub reported_by_username: String,
    pub reason: String,
    pub description: Option<String>,
    pub status: String,
    pub reviewed_by: Option<ObjectId>,
    pub reviewed_at: Option<bson::DateTime>,
    pub review_notes: Option<String>,
    pub action_taken: Option<String>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoryModeration {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub story_id: ObjectId,
    pub moderator_id: ObjectId,
    pub moderator_name: String,
    pub action: String,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StorySchedule {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub scheduled_for: bson::DateTime,
    pub media_url: String,
    pub media_type: String,
    pub caption: Option<String>,
    pub hashtags: Option<Vec<String>>,
    pub mentions: Option<Vec<String>>,
    pub is_highlight: bool,
    pub highlight_category: Option<String>,
    pub story_type: String,
    pub story_data: Option<serde_json::Value>,
    pub status: String,
    pub published_at: Option<bson::DateTime>,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoryTemplate {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub description: Option<String>,
    pub background_color: Option<String>,
    pub font_style: Option<String>,
    pub text_color: Option<String>,
    pub layout: Option<serde_json::Value>,
    pub media_overlay: Option<String>,
    pub stickers: Option<Vec<String>>,
    pub created_by: ObjectId,
    pub is_public: bool,
    pub usage_count: i32,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoryModerationQueue {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub story_id: ObjectId,
    pub user_id: ObjectId,
    pub username: String,
    pub media_url: String,
    pub caption: Option<String>,
    pub spam_score: f64,
    pub sentiment_score: f64,
    pub reported_count: i32,
    pub created_at: bson::DateTime,
    pub priority: String,
    pub assigned_to: Option<ObjectId>,
    pub assigned_at: Option<bson::DateTime>,
}

// --- Reel Models ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Reel {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub username: String,
    pub user_avatar: Option<String>,
    pub video_url: String,
    pub thumbnail_url: String,
    pub title: Option<String>,
    pub description: String,
    pub duration: f64,
    pub video_size: i64,
    pub video_format: String,
    pub resolution: String,
    pub bitrate: Option<i32>,
    pub audio_bitrate: Option<i32>,
    pub location: Option<Location>,
    pub hashtags: Option<Vec<String>>,
    pub mentions: Option<Vec<String>>,
    pub music_track: Option<String>,
    pub effects: Option<Vec<String>>,
    pub filters: Option<Vec<String>>,
    pub duet_enabled: bool,
    pub stitch_enabled: bool,
    pub comments_enabled: bool,
    pub shares_enabled: bool,
    pub downloads_enabled: bool,
    pub is_private: bool,
    pub allowed_users: Option<Vec<ObjectId>>,
    pub age_restriction: Option<String>,
    pub content_warning: Option<String>,
    pub created_at: bson::DateTime,
    pub published_at: Option<bson::DateTime>,
    pub is_deleted: bool,
    pub deleted_at: Option<bson::DateTime>,
    pub deleted_by: Option<ObjectId>,
    pub deleted_reason: Option<String>,
    pub moderation_status: String,
    pub moderation_notes: Option<String>,
    pub spam_score: Option<f64>,
    pub sentiment_score: Option<f64>,
    pub reported_count: i32,
    pub view_count: i32,
    pub like_count: i32,
    pub comment_count: i32,
    pub share_count: i32,
    pub duet_count: i32,
    pub stitch_count: i32,
    pub save_count: i32,
    pub engagement_score: f64,
    pub trending_score: f64,
    pub virality_score: f64,
    pub updated_at: bson::DateTime,
    pub transcoding_status: String,
    pub transcoding_progress: Option<f64>,
    pub transcoding_error: Option<String>,
    pub available_qualities: Option<Vec<String>>,
    pub subtitles: Option<Vec<Subtitle>>,
    pub captions: Option<Vec<Caption>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Subtitle {
    pub language: String,
    pub url: String,
    pub format: String,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Caption {
    pub text: String,
    pub start_time: f64,
    pub end_time: f64,
    pub language: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReelView {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub reel_id: ObjectId,
    pub viewer_id: ObjectId,
    pub viewer_username: String,
    pub viewer_avatar: Option<String>,
    pub viewed_at: bson::DateTime,
    pub view_duration: f64,
    pub completion_rate: f64,
    pub is_replay: bool,
    pub location: Option<Location>,
    pub device_info: Option<String>,
    pub referrer: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReelLike {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub reel_id: ObjectId,
    pub user_id: ObjectId,
    pub username: String,
    pub liked_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReelComment {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub reel_id: ObjectId,
    pub user_id: ObjectId,
    pub username: String,
    pub content: String,
    pub parent_comment_id: Option<ObjectId>,
    pub replies_count: i32,
    pub likes_count: i32,
    pub is_deleted: bool,
    pub deleted_at: Option<bson::DateTime>,
    pub moderation_status: String,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReelShare {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub reel_id: ObjectId,
    pub user_id: ObjectId,
    pub username: String,
    pub platform: String,
    pub shared_at: bson::DateTime,
    pub share_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReelDuet {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub original_reel_id: ObjectId,
    pub duet_reel_id: ObjectId,
    pub duet_user_id: ObjectId,
    pub duet_username: String,
    pub duet_type: String,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReelStitch {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub original_reel_id: ObjectId,
    pub stitch_reel_id: ObjectId,
    pub stitch_user_id: ObjectId,
    pub stitch_username: String,
    pub stitch_duration: f64,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReelSave {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub reel_id: ObjectId,
    pub user_id: ObjectId,
    pub username: String,
    pub saved_at: bson::DateTime,
    pub collection_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReelAnalytics {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub reel_id: ObjectId,
    pub date: bson::DateTime,
    pub views: i32,
    pub unique_viewers: i32,
    pub replays: i32,
    pub completion_rate: f64,
    pub average_view_duration: f64,
    pub likes: i32,
    pub comments: i32,
    pub shares: i32,
    pub duets: i32,
    pub stitches: i32,
    pub saves: i32,
    pub engagement_rate: f64,
    pub trending_score: f64,
    pub virality_score: f64,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserReelStats {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub username: String,
    pub total_reels: i32,
    pub active_reels: i32,
    pub deleted_reels: i32,
    pub total_views: i64,
    pub total_likes: i64,
    pub total_comments: i64,
    pub total_shares: i64,
    pub total_duets: i64,
    pub total_stitches: i64,
    pub total_saves: i64,
    pub avg_completion_rate: f64,
    pub avg_engagement_rate: f64,
    pub avg_trending_score: f64,
    pub avg_virality_score: f64,
    pub avg_view_duration: f64,
    pub top_reel_id: Option<ObjectId>,
    pub follower_growth: i32,
    pub last_reel_at: Option<bson::DateTime>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReelReport {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub reel_id: ObjectId,
    pub reported_by: ObjectId,
    pub reported_by_username: String,
    pub reason: String,
    pub description: Option<String>,
    pub status: String,
    pub reviewed_by: Option<ObjectId>,
    pub reviewed_at: Option<bson::DateTime>,
    pub review_notes: Option<String>,
    pub action_taken: Option<String>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReelModeration {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub reel_id: ObjectId,
    pub moderator_id: ObjectId,
    pub moderator_name: String,
    pub action: String,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReelTranscodingJob {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub reel_id: ObjectId,
    pub original_video_url: String,
    pub target_qualities: Vec<String>,
    pub current_quality: Option<String>,
    pub progress: f64,
    pub status: String,
    pub started_at: bson::DateTime,
    pub completed_at: Option<bson::DateTime>,
    pub error_message: Option<String>,
    pub worker_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReelTrending {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub reel_id: ObjectId,
    pub trending_score: f64,
    pub virality_score: f64,
    pub category: String,
    pub region: Option<String>,
    pub trending_at: bson::DateTime,
    pub peak_trending_at: Option<bson::DateTime>,
    pub trending_duration: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReelModerationQueue {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub reel_id: ObjectId,
    pub user_id: ObjectId,
    pub username: String,
    pub video_url: String,
    pub thumbnail_url: String,
    pub title: Option<String>,
    pub description: String,
    pub spam_score: f64,
    pub sentiment_score: f64,
    pub reported_count: i32,
    pub transcoding_status: String,
    pub created_at: bson::DateTime,
    pub priority: String,
    pub assigned_to: Option<ObjectId>,
    pub assigned_at: Option<bson::DateTime>,
}

// --- Hookup Models ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HookupAlias {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub alias_username: String,
    pub gender: String,
    pub age: i32,
    pub bio: String,
    pub is_verified: bool,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HookupMatch {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub from_alias_id: ObjectId,
    pub to_alias_id: ObjectId,
    pub interaction: String,
    pub created_at: bson::DateTime,
}

// --- Group Models ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Group {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub description: String,
    pub category: String,
    pub avatar_url: Option<String>,
    pub cover_url: Option<String>,
    pub creator_id: ObjectId,
    pub admins: Vec<ObjectId>,
    pub members: Vec<ObjectId>,
    pub is_private: bool,
    pub max_members: Option<i32>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GroupPost {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub group_id: ObjectId,
    pub user_id: ObjectId,
    pub content: String,
    pub media_urls: Vec<String>,
    pub post_type: String,
    pub location: Option<Location>,
    pub likes_count: i32,
    pub comments_count: i32,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

// --- Live Models ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LiveStream {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub username: String,
    pub user_avatar: Option<String>,
    pub title: String,
    pub started_at: bson::DateTime,
    pub ended_at: Option<bson::DateTime>,
    pub is_active: bool,
    pub viewer_count: i32,
    pub stream_key: String,
    pub stream_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}
