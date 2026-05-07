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


