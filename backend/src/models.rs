use serde::{Deserialize, Serialize};
use bson::oid::ObjectId;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Location {
    pub latitude: f64,
    pub longitude: f64,
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub is_live: Option<bool>,
    #[serde(default)]
    pub expires_at: Option<bson::DateTime>,
}

// --- User Models ---
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
    pub created_at: Option<bson::DateTime>,
}

// --- Content Models ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Post {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub content: Option<String>,
    pub media_urls: Vec<String>,
    pub post_type: String, // text, photo, video
    pub location: Option<Location>,
    pub created_at: bson::DateTime,
    pub likes_count: i32,
    pub comments_count: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Like {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub post_id: ObjectId,
    pub user_id: ObjectId,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Comment {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub post_id: ObjectId,
    pub user_id: ObjectId,
    pub username: String, // Denormalized for speed
    pub content: String,
    pub parent_comment_id: Option<ObjectId>, // None for top-level, Some for replies
    pub replies_count: i32,
    pub created_at: bson::DateTime,
}

// --- Marketplace Models ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MarketplaceItem {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub seller_id: ObjectId,
    pub title: String,
    pub description: String,
    pub price: f64,
    pub currency: String, // "Ksh"
    pub condition: String, // New, Like New, Used
    pub category: String, // Books, Electronics, etc.
    pub images: Vec<String>,
    pub status: String, // available, sold
    pub created_at: bson::DateTime,
}

// --- Messaging Models ---
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
    pub disappearing_duration: Option<i64>, // in seconds
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageReaction {
    pub user_id: ObjectId,
    pub emoji: String,
    pub created_at: bson::DateTime,
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
    pub content: String, // Plaintext (for unencrypted) or placeholder
    pub encrypted_content: Option<String>,
    pub encryption_iv: Option<String>,
    pub attachment_url: Option<String>,
    pub attachment_type: Option<String>,
    pub reply_to_id: Option<ObjectId>,
    pub reactions: Vec<MessageReaction>,
    pub is_deleted: bool,
    pub deleted_at: Option<bson::DateTime>,
    pub read_at: Option<bson::DateTime>,
    pub poll: Option<Poll>,
    pub location: Option<Location>,
    pub contact: Option<Contact>,
    pub is_view_once: bool,
    pub viewed_at: Option<bson::DateTime>,
    pub expires_at: Option<bson::DateTime>,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Notification {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId, // Recipient
    pub actor_id: ObjectId, // User who triggered the notification
    pub notification_type: String, // "like", "comment", "message", "follow", etc.
    pub target_id: Option<ObjectId>, // ID of the post, chat, etc.
    pub content: String, // Descriptive text
    pub is_read: bool,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transaction {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub phone_number: String,
    pub amount: f64,
    pub mpesa_receipt_number: Option<String>,
    pub checkout_request_id: String,
    pub status: String, // pending, completed, failed
    pub transaction_type: String, // verification, premium, donation
    pub premium_duration: Option<String>, // weekly, monthly, semi-annual
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
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
    pub is_verified: bool, // requires Ksh 20 payment
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HookupMatch {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub from_alias_id: ObjectId,
    pub to_alias_id: ObjectId,
    pub interaction: String, // like, pass
    pub created_at: bson::DateTime,
}

// --- Study Room Models ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StudyRoom {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub creator_id: ObjectId,
    pub participants: Vec<ObjectId>,
    pub max_participants: i32,
    pub is_active: bool,
    pub created_at: bson::DateTime,
}

// --- Event Models ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Event {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub creator_id: ObjectId,
    pub title: String,
    pub description: String,
    pub location: String,
    pub start_datetime: bson::DateTime,
    pub end_datetime: bson::DateTime,
    pub image_url: Option<String>,
    pub category: String,
    pub max_attendees: Option<i32>,
    pub is_active: bool,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EventRSVP {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub event_id: ObjectId,
    pub user_id: ObjectId,
    pub status: String, // interested, going, maybe
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
}

// --- Story Models ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Story {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub media_url: String,
    pub media_type: String, // image or video
    pub caption: Option<String>,
    pub created_at: bson::DateTime,
    pub expires_at: bson::DateTime, // 24 hours from creation
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoryView {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub story_id: ObjectId,
    pub viewer_id: ObjectId,
    pub viewed_at: bson::DateTime,
}

