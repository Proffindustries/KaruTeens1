use bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StudyRoom {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub subject: Option<String>,
    pub creator_id: ObjectId,
    pub participants: Vec<ObjectId>,
    pub max_participants: i32,
    pub is_active: bool,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RevisionMaterial {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub course_code: String,
    pub category: String,
    pub file_url: String,
    pub thumbnail_url: Option<String>,
    pub price: i64, // In cents
    pub is_locked: bool,
    pub uploader_id: ObjectId,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RevisionMaterialPurchase {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub material_id: ObjectId,
    pub user_id: ObjectId,
    pub amount: i64, // In cents
    pub transaction_id: Option<ObjectId>,
    pub purchased_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlaylistItem {
    pub id: i32,
    pub item_type: String, // video, document, link, note
    pub title: String,
    pub url: String,
    pub duration_minutes: Option<i32>,
    pub added_by: ObjectId,
    pub added_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StudyPlaylist {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub description: Option<String>,
    pub creator_id: ObjectId,
    pub collaborators: Vec<ObjectId>,
    pub items: Vec<PlaylistItem>,
    pub is_public: bool,
    pub subject: String,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RoomMessage {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub room_id: ObjectId,
    pub user_id: ObjectId,
    pub username: String,
    pub content: String,
    pub timestamp: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RoomFile {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub room_id: ObjectId,
    pub user_id: ObjectId,
    pub username: String,
    pub filename: String,
    pub url: String,
    pub file_type: String,
    pub timestamp: bson::DateTime,
}
