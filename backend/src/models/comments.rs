use bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Comment {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub content_id: ObjectId, // post_id, story_id, etc.
    #[serde(default)]
    pub content_type: String, // post, story, reel, etc.
    pub user_id: ObjectId,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub user_avatar: Option<String>,
    #[serde(default)]
    pub parent_id: Option<ObjectId>, // for nested comments
    #[serde(default)]
    pub content: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub media_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub media_type: Option<String>,
    #[serde(default)]
    pub status: String, // pending, approved, rejected, spam, deleted
    #[serde(default)]
    pub spam_score: Option<f64>,
    #[serde(default)]
    pub sentiment_score: Option<f64>,
    #[serde(default)]
    pub reported_count: i32,
    #[serde(default)]
    pub likes: i32,
    #[serde(default)]
    pub replies_count: i32,
    #[serde(default)]
    pub edited_at: Option<bson::DateTime>,
    #[serde(default)]
    pub deleted_at: Option<bson::DateTime>,
    #[serde(default)]
    pub deleted_by: Option<ObjectId>,
    #[serde(default)]
    pub deleted_reason: Option<String>,
    #[serde(default)]
    pub moderation_notes: Option<String>,
    #[serde(default)]
    pub ip_address: Option<String>,
    #[serde(default)]
    pub user_agent: Option<String>,
    #[serde(default)]
    pub is_edited: bool,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommentReport {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub comment_id: ObjectId,
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
pub struct CommentModeration {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub comment_id: ObjectId,
    pub moderator_id: ObjectId,
    pub moderator_name: String,
    pub action: String,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub before_content: Option<String>,
    pub after_content: Option<String>,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommentLike {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub comment_id: ObjectId,
    pub user_id: ObjectId,
    pub username: String,
    pub liked_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommentAnalytics {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub content_id: ObjectId,
    pub content_type: String,
    pub date: bson::DateTime,
    pub total_comments: i32,
    pub approved_comments: i32,
    pub pending_comments: i32,
    pub rejected_comments: i32,
    pub spam_comments: i32,
    pub deleted_comments: i32,
    pub total_likes: i32,
    pub total_replies: i32,
    pub avg_response_time: Option<f64>,
    pub engagement_rate: f64,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SpamDetectionRule {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub description: String,
    pub pattern: String,
    pub score: f64,
    pub category: String,
    pub is_active: bool,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommentModerationQueue {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub comment_id: ObjectId,
    pub content_id: ObjectId,
    pub content_type: String,
    pub user_id: ObjectId,
    pub username: String,
    pub content: String,
    pub spam_score: f64,
    pub sentiment_score: f64,
    pub reported_count: i32,
    pub created_at: bson::DateTime,
    pub priority: String,
    pub assigned_to: Option<ObjectId>,
    pub assigned_at: Option<bson::DateTime>,
}
