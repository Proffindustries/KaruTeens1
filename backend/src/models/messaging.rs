use bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use super::base::Location;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Chat {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub participants: Vec<ObjectId>,
    pub is_group: bool,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
    pub admins: Vec<ObjectId>,
    pub last_message: Option<String>,
    pub last_message_time: bson::DateTime,
    pub disappearing_duration: Option<i64>,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageReaction {
    pub user_id: ObjectId,
    pub emoji: String,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Contact {
    pub username: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub chat_id: ObjectId,
    pub sender_id: ObjectId,
    pub content: String,
    pub encrypted_content: Option<String>,
    pub encryption_iv: Option<String>,
    pub attachment_url: Option<String>,
    pub attachment_type: Option<String>,
    pub reply_to_id: Option<ObjectId>,
    pub reactions: Vec<MessageReaction>,
    pub is_deleted: bool,
    pub deleted_at: Option<bson::DateTime>,
    pub read_at: Option<bson::DateTime>,
    pub poll: Option<super::content::Poll>,
    pub location: Option<Location>,
    pub contact: Option<Contact>,
    pub is_view_once: bool,
    pub is_system: bool,
    pub is_announcement: bool,
    pub viewed_at: Option<bson::DateTime>,
    pub expires_at: Option<bson::DateTime>,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Notification {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub actor_id: ObjectId,
    pub notification_type: String,
    pub target_id: Option<ObjectId>,
    pub content: String,
    pub is_read: bool,
    pub created_at: bson::DateTime,
}
