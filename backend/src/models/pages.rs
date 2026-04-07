use bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Page {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub slug: String,
    pub description: String,
    pub avatar_url: Option<String>,
    pub cover_url: Option<String>,
    pub creator_id: ObjectId,
    pub category: String,
    pub is_official: bool,
    #[serde(default)]
    pub follower_count: i32,
    #[serde(default)]
    pub post_count: i32,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PageFollow {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub page_id: ObjectId,
    pub user_id: ObjectId,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PageRevision {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub page_id: ObjectId,
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub featured_image: Option<String>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub meta_keywords: Option<Vec<String>>,
    pub editor_id: ObjectId,
    pub editor_notes: Option<String>,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PageView {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub page_id: ObjectId,
    pub user_id: Option<ObjectId>,
    pub ip_address: String,
    pub user_agent: Option<String>,
    pub referrer: Option<String>,
    pub session_id: Option<String>,
    pub duration_seconds: Option<u64>,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PageLike {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub page_id: ObjectId,
    pub user_id: ObjectId,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PageComment {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub page_id: ObjectId,
    pub user_id: ObjectId,
    pub username: String,
    pub content: String,
    pub parent_comment_id: Option<ObjectId>,
    pub replies_count: i32,
    pub likes_count: i32,
    pub is_approved: bool,
    pub is_spam: bool,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PageAnalytics {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub page_id: ObjectId,
    pub date: bson::DateTime,
    pub views: i32,
    pub unique_visitors: i32,
    pub bounce_rate: f64,
    pub avg_time_on_page: f64,
    pub exit_rate: f64,
    pub created_at: bson::DateTime,
}
