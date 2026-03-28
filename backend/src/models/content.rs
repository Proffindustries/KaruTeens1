use bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use super::base::Location;

// --- Content Models ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Like {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub post_id: ObjectId,
    pub user_id: ObjectId,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedPost {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub post_id: ObjectId,
    pub user_id: ObjectId,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Post {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub excerpt: Option<String>,
    #[serde(default)]
    pub slug: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub post_type: String,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    pub author_id: ObjectId,
    #[serde(default)]
    pub author_name: String,
    #[serde(default)]
    pub media_urls: Option<Vec<String>>,
    #[serde(default)]
    pub location: Option<Location>,
    #[serde(default)]
    pub scheduled_publish_date: Option<bson::DateTime>,
    #[serde(default)]
    pub published_at: Option<bson::DateTime>,
    #[serde(default)]
    pub approved_at: Option<bson::DateTime>,
    #[serde(default)]
    pub approved_by: Option<ObjectId>,
    #[serde(default)]
    pub rejected_at: Option<bson::DateTime>,
    #[serde(default)]
    pub rejected_by: Option<ObjectId>,
    #[serde(default)]
    pub rejection_reason: Option<String>,
    #[serde(default)]
    pub view_count: i32,
    #[serde(default)]
    pub like_count: i32,
    #[serde(default)]
    pub comment_count: i32,
    #[serde(default)]
    pub share_count: i32,
    #[serde(default)]
    pub reading_time: Option<i32>,
    #[serde(default)]
    pub language: String,
    #[serde(default)]
    pub is_featured: bool,
    #[serde(default)]
    pub is_premium: bool,
    #[serde(default)]
    pub allow_comments: bool,
    #[serde(default)]
    pub allow_sharing: bool,
    #[serde(default)]
    pub seo_title: Option<String>,
    #[serde(default)]
    pub seo_description: Option<String>,
    #[serde(default)]
    pub seo_keywords: Option<Vec<String>>,
    #[serde(default)]
    pub meta_data: Option<serde_json::Value>,
    #[serde(default)]
    pub source_url: Option<String>,
    #[serde(default)]
    pub source_author: Option<String>,
    #[serde(default)]
    pub plagiarism_score: Option<f64>,
    #[serde(default)]
    pub content_rating: Option<String>,
    #[serde(default)]
    pub is_nsfw: Option<bool>,
    pub poll: Option<Poll>,
    #[serde(default)]
    pub is_anonymous: bool,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PollOption {
    pub text: String,
    pub voter_ids: Vec<ObjectId>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Poll {
    pub question: String,
    pub options: Vec<PollOption>,
    pub is_multiple: bool,
    pub is_closed: bool,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PostRevision {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub post_id: ObjectId,
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub author_id: ObjectId,
    pub author_name: String,
    pub changes: Option<String>,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PostApproval {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub post_id: ObjectId,
    pub approver_id: ObjectId,
    pub approver_name: String,
    pub status: String,
    pub comments: Option<String>,
    pub reviewed_at: bson::DateTime,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PostView {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub post_id: ObjectId,
    pub user_id: Option<ObjectId>,
    pub session_id: String,
    pub ip_address: String,
    pub user_agent: String,
    pub viewed_at: bson::DateTime,
    pub duration_seconds: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PostLike {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub post_id: ObjectId,
    pub user_id: ObjectId,
    pub username: String,
    pub liked_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PostShare {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub post_id: ObjectId,
    pub user_id: ObjectId,
    pub username: String,
    pub platform: String,
    pub shared_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PostAnalytics {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub post_id: ObjectId,
    pub date: bson::DateTime,
    pub views: i32,
    pub unique_views: i32,
    pub likes: i32,
    pub comments: i32,
    pub shares: i32,
    pub bounce_rate: f64,
    pub avg_time_on_page: f64,
    pub exit_rate: f64,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContentModeration {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub content_id: ObjectId,
    pub content_type: String,
    pub content_text: String,
    pub reported_by: Option<ObjectId>,
    pub reported_reason: Option<String>,
    pub reported_at: Option<bson::DateTime>,
    pub status: String,
    pub reviewed_by: Option<ObjectId>,
    pub reviewed_at: Option<bson::DateTime>,
    pub review_notes: Option<String>,
    pub action_taken: Option<String>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}
