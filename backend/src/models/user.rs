use bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use super::base::{Location, Badge, NotificationSettings};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub email: String,
    pub password_hash: String,
    pub role: String, // user, premium, admin, superadmin
    pub is_verified: bool,
    pub is_premium: bool,
    pub premium_expires_at: Option<bson::DateTime>,
    pub is_banned: bool,
    pub banned_at: Option<bson::DateTime>,
    pub banned_by: Option<ObjectId>,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SocialLinks {
    pub instagram: Option<String>,
    pub tiktok: Option<String>,
    pub youtube: Option<String>,
    pub twitter: Option<String>,
    pub other: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Profile {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId, // Link to User
    pub username: String,
    pub full_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub school: Option<String>,
    pub year_of_study: Option<i32>,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub social_links: Option<SocialLinks>,
    pub last_seen_at: Option<bson::DateTime>,
    pub last_location: Option<Location>,
    pub public_key: Option<String>,
    pub blocked_users: Option<Vec<ObjectId>>,
    pub muted_chats: Option<Vec<ObjectId>>,
    pub interests: Option<Vec<String>>,
    pub notification_settings: Option<NotificationSettings>,
    #[serde(default)]
    pub onboarded: bool,
    #[serde(default)]
    pub follower_count: u64,
    #[serde(default)]
    pub following_count: u64,
    // Gamification fields
    #[serde(default)]
    pub points: u64,
    #[serde(default)]
    pub streak: u64,
    #[serde(default)]
    pub longest_streak: u64,
    #[serde(default)]
    pub profile_views: u64,
    #[serde(default)]
    pub level: u64,
    #[serde(default)]
    pub next_level_points: u64,
    pub badges: Option<Vec<Badge>>,
    pub created_at: Option<bson::DateTime>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProfileView {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub profile_user_id: ObjectId,   // User whose profile was viewed
    pub viewer_id: Option<ObjectId>, // User who viewed (None if anonymous/not logged in)
    pub viewer_username: Option<String>,
    pub viewer_avatar: Option<String>,
    pub ip_address: String,
    pub user_agent: Option<String>,
    pub viewed_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProfileViewSummary {
    pub total_views: i64,
    pub unique_viewers: i64,
    pub views_this_week: i64,
    pub recent_viewers: Vec<ProfileViewerInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProfileViewerInfo {
    pub viewer_id: Option<String>,
    pub username: Option<String>,
    pub avatar_url: Option<String>,
    pub viewed_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserCommentStats {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
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
    pub last_comment_at: Option<bson::DateTime>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}
