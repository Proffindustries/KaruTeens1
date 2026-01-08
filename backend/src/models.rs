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
pub struct Like {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub post_id: ObjectId,
    pub user_id: ObjectId,
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
    pub subject: Option<String>,
    pub creator_id: ObjectId,
    pub participants: Vec<ObjectId>,
    pub max_participants: i32,
    pub is_active: bool,
    pub created_at: bson::DateTime,
}

// --- Event Models ---
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

// --- Page Management Models ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Page {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub slug: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub featured_image: Option<String>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub meta_keywords: Option<Vec<String>>,
    pub status: String, // draft, published, archived
    pub visibility: String, // public, private, hidden
    pub author_id: ObjectId,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub template: Option<String>,
    pub redirect_url: Option<String>,
    pub seo_score: Option<f64>,
    pub view_count: i32,
    pub likes_count: i32,
    pub comments_count: i32,
    pub published_at: Option<bson::DateTime>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
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

// --- Event Management Models ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Event {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub description: String,
    pub location: String,
    pub location_type: String, // physical, virtual, hybrid
    pub venue_name: Option<String>,
    pub venue_address: Option<String>,
    pub virtual_meeting_url: Option<String>,
    pub start_datetime: bson::DateTime,
    pub end_datetime: bson::DateTime,
    pub registration_start: Option<bson::DateTime>,
    pub registration_end: Option<bson::DateTime>,
    pub max_attendees: Option<i32>,
    pub current_attendees: i32,
    pub category: String,
    pub tags: Option<Vec<String>>,
    pub organizer_id: ObjectId,
    pub organizer_name: String,
    pub organizer_contact: Option<String>,
    pub event_type: String, // public, private, invite_only
    pub status: String, // draft, published, cancelled, completed
    pub is_recurring: bool,
    pub recurrence_pattern: Option<String>, // daily, weekly, monthly
    pub recurrence_end_date: Option<bson::DateTime>,
    pub image_url: Option<String>,
    pub banner_url: Option<String>,
    pub featured: bool,
    pub ticket_price: Option<f64>,
    pub currency: Option<String>,
    pub rsvp_required: bool,
    pub waitlist_enabled: bool,
    pub waitlist_count: i32,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EventAttendee {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub event_id: ObjectId,
    pub user_id: ObjectId,
    pub username: String,
    pub full_name: Option<String>,
    pub email: String,
    pub phone: Option<String>,
    pub check_in_time: Option<bson::DateTime>,
    pub checked_in: bool,
    pub ticket_type: Option<String>,
    pub payment_status: Option<String>, // pending, paid, free, refunded
    pub payment_amount: Option<f64>,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EventComment {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub event_id: ObjectId,
    pub user_id: ObjectId,
    pub username: String,
    pub content: String,
    pub parent_comment_id: Option<ObjectId>,
    pub likes_count: i32,
    pub is_approved: bool,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EventNotification {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub event_id: ObjectId,
    pub notification_type: String, // reminder, update, cancellation
    pub message: String,
    pub scheduled_time: bson::DateTime,
    pub sent: bool,
    pub sent_at: Option<bson::DateTime>,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EventAnalytics {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub event_id: ObjectId,
    pub date: bson::DateTime,
    pub views: i32,
    pub rsvps: i32,
    pub attendees: i32,
    pub waitlist: i32,
    pub engagement_score: f64,
    pub created_at: bson::DateTime,
}

// --- Post Management Models ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Post {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub slug: String,
    pub status: String, // draft, pending_review, approved, published, scheduled, rejected
    pub post_type: String, // article, news, blog, announcement, story
    pub category: String,
    pub tags: Option<Vec<String>>,
    pub author_id: ObjectId,
    pub author_name: String,
    pub featured_image: Option<String>,
    pub gallery_images: Option<Vec<String>>,
    pub video_url: Option<String>,
    pub audio_url: Option<String>,
    pub scheduled_publish_date: Option<bson::DateTime>,
    pub published_at: Option<bson::DateTime>,
    pub approved_at: Option<bson::DateTime>,
    pub approved_by: Option<ObjectId>,
    pub rejected_at: Option<bson::DateTime>,
    pub rejected_by: Option<ObjectId>,
    pub rejection_reason: Option<String>,
    pub view_count: i32,
    pub like_count: i32,
    pub comment_count: i32,
    pub share_count: i32,
    pub reading_time: Option<i32>, // in minutes
    pub language: String,
    pub is_featured: bool,
    pub is_premium: bool,
    pub allow_comments: bool,
    pub allow_sharing: bool,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub seo_keywords: Option<Vec<String>>,
    pub meta_data: Option<serde_json::Value>,
    pub source_url: Option<String>, // for imported content
    pub source_author: Option<String>,
    pub plagiarism_score: Option<f64>,
    pub content_rating: Option<String>, // age rating
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
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
    pub changes: Option<String>, // description of what changed
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PostApproval {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub post_id: ObjectId,
    pub approver_id: ObjectId,
    pub approver_name: String,
    pub status: String, // approved, rejected, pending
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
    pub platform: String, // facebook, twitter, whatsapp, etc.
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
    pub content_type: String, // post, comment, story, etc.
    pub content_text: String,
    pub reported_by: Option<ObjectId>,
    pub reported_reason: Option<String>,
    pub reported_at: Option<bson::DateTime>,
    pub status: String, // pending, approved, rejected, escalated
    pub reviewed_by: Option<ObjectId>,
    pub reviewed_at: Option<bson::DateTime>,
    pub review_notes: Option<String>,
    pub action_taken: Option<String>, // removed, edited, warning, etc.
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

// --- Comment Management Models ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Comment {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub content_id: ObjectId, // post_id, story_id, etc.
    pub content_type: String, // post, story, reel, etc.
    pub user_id: ObjectId,
    pub username: String,
    pub user_avatar: Option<String>,
    pub parent_id: Option<ObjectId>, // for nested comments
    pub content: String,
    pub status: String, // pending, approved, rejected, spam, deleted
    pub spam_score: Option<f64>, // AI spam detection score
    pub sentiment_score: Option<f64>, // AI sentiment analysis score
    pub reported_count: i32,
    pub likes: i32,
    pub replies_count: i32,
    pub edited_at: Option<bson::DateTime>,
    pub deleted_at: Option<bson::DateTime>,
    pub deleted_by: Option<ObjectId>,
    pub deleted_reason: Option<String>,
    pub moderation_notes: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
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
    pub reason: String, // spam, offensive, harassment, etc.
    pub description: Option<String>,
    pub status: String, // pending, reviewed, dismissed
    pub reviewed_by: Option<ObjectId>,
    pub reviewed_at: Option<bson::DateTime>,
    pub review_notes: Option<String>,
    pub action_taken: Option<String>, // warning, removed, no_action
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
    pub action: String, // approve, reject, delete, edit, warn
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
    pub avg_response_time: Option<f64>, // hours
    pub engagement_rate: f64,
    pub created_at: bson::DateTime,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SpamDetectionRule {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub description: String,
    pub pattern: String, // regex pattern
    pub score: f64, // spam score contribution
    pub category: String, // keyword, link, profanity, etc.
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
    pub priority: String, // high, medium, low
    pub assigned_to: Option<ObjectId>,
    pub assigned_at: Option<bson::DateTime>,
}

// --- Story Management Models ---
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
    pub expires_at: bson::DateTime, // 24 hours from creation
    pub is_deleted: bool,
    pub deleted_at: Option<bson::DateTime>,
    pub deleted_by: Option<ObjectId>,
    pub deleted_reason: Option<String>,
    pub moderation_status: String, // pending, approved, rejected, removed
    pub moderation_notes: Option<String>,
    pub spam_score: Option<f64>,
    pub sentiment_score: Option<f64>,
    pub reported_count: i32,
    pub view_count: i32,
    pub reply_count: i32,
    pub engagement_score: f64,
    pub is_private: bool, // for private stories
    pub allowed_users: Option<Vec<ObjectId>>, // for private stories
    pub story_type: String, // normal, live, poll, question, quiz
    pub story_data: Option<serde_json::Value>, // poll options, questions, etc.
    pub updated_at: bson::DateTime,
}

// --- Reel Management Models ---
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
    pub duration: f64, // in seconds
    pub video_size: i64, // in bytes
    pub video_format: String, // mp4, mov, etc.
    pub resolution: String, // 720p, 1080p, 4K
    pub bitrate: Option<i32>, // video bitrate
    pub audio_bitrate: Option<i32>, // audio bitrate
    pub location: Option<Location>,
    pub hashtags: Option<Vec<String>>,
    pub mentions: Option<Vec<String>>,
    pub music_track: Option<String>, // music or audio track used
    pub effects: Option<Vec<String>>, // visual effects applied
    pub filters: Option<Vec<String>>, // filters applied
    pub duet_enabled: bool,
    pub stitch_enabled: bool,
    pub comments_enabled: bool,
    pub shares_enabled: bool,
    pub downloads_enabled: bool,
    pub is_private: bool,
    pub allowed_users: Option<Vec<ObjectId>>,
    pub age_restriction: Option<String>, // none, 13+, 16+, 18+
    pub content_warning: Option<String>, // violence, language, etc.
    pub created_at: bson::DateTime,
    pub published_at: Option<bson::DateTime>,
    pub is_deleted: bool,
    pub deleted_at: Option<bson::DateTime>,
    pub deleted_by: Option<ObjectId>,
    pub deleted_reason: Option<String>,
    pub moderation_status: String, // pending, approved, rejected, removed
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
    pub transcoding_status: String, // pending, processing, completed, failed
    pub transcoding_progress: Option<f64>, // 0.0 to 1.0
    pub transcoding_error: Option<String>,
    pub available_qualities: Option<Vec<String>>, // ["360p", "480p", "720p", "1080p"]
    pub subtitles: Option<Vec<Subtitle>>,
    pub captions: Option<Vec<Caption>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Subtitle {
    pub language: String,
    pub url: String,
    pub format: String, // vtt, srt
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Caption {
    pub text: String,
    pub start_time: f64, // in seconds
    pub end_time: f64, // in seconds
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
    pub view_duration: f64, // in seconds
    pub completion_rate: f64, // 0.0 to 1.0
    pub is_replay: bool,
    pub location: Option<Location>,
    pub device_info: Option<String>,
    pub referrer: Option<String>, // where they came from
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
    pub platform: String, // facebook, instagram, twitter, whatsapp, etc.
    pub shared_at: bson::DateTime,
    pub share_type: String, // direct, story, feed, etc.
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReelDuet {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub original_reel_id: ObjectId,
    pub duet_reel_id: ObjectId,
    pub duet_user_id: ObjectId,
    pub duet_username: String,
    pub duet_type: String, // left_right, top_bottom, picture_in_picture
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
    pub stitch_duration: f64, // duration of the stitched part
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
    pub collection_name: Option<String>, // if saved to a specific collection
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
    pub reason: String, // spam, copyright, harassment, etc.
    pub description: Option<String>,
    pub status: String, // pending, reviewed, dismissed
    pub reviewed_by: Option<ObjectId>,
    pub reviewed_at: Option<bson::DateTime>,
    pub review_notes: Option<String>,
    pub action_taken: Option<String>, // warning, removed, no_action
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
    pub action: String, // approve, reject, delete, edit, warn
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
    pub status: String, // pending, processing, completed, failed
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
    pub category: String, // music, dance, comedy, etc.
    pub region: Option<String>, // country or region
    pub trending_at: bson::DateTime,
    pub peak_trending_at: Option<bson::DateTime>,
    pub trending_duration: Option<i64>, // in hours
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
    pub priority: String, // high, medium, low
    pub assigned_to: Option<ObjectId>,
    pub assigned_at: Option<bson::DateTime>,
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
    pub view_duration: Option<i32>, // in seconds
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
    pub reply_type: String, // text, emoji, sticker
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
    pub reason: String, // spam, offensive, harassment, etc.
    pub description: Option<String>,
    pub status: String, // pending, reviewed, dismissed
    pub reviewed_by: Option<ObjectId>,
    pub reviewed_at: Option<bson::DateTime>,
    pub review_notes: Option<String>,
    pub action_taken: Option<String>, // warning, removed, no_action
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
    pub action: String, // approve, reject, delete, edit, warn
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
    pub status: String, // scheduled, published, failed
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
    pub layout: Option<serde_json::Value>, // JSON layout definition
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
    pub priority: String, // high, medium, low
    pub assigned_to: Option<ObjectId>,
    pub assigned_at: Option<bson::DateTime>,
}

// --- Ad Models ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdBudget {
    pub daily_budget: f64,
    pub lifetime_budget: Option<f64>,
    pub budget_type: String, // daily, lifetime
    pub budget_delivery: String, // standard, accelerated
    pub currency: String,
    pub spent_today: f64,
    pub spent_lifetime: f64,
    pub remaining_daily: f64,
    pub remaining_lifetime: Option<f64>,
    pub budget_utilization: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdFrequencyCapping {
    pub impressions: i32,
    pub time_period: String, // day, week, month
    pub user_type: String, // all, new, returning
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdExclusionRule {
    pub rule_type: String,
    pub rule_value: String,
    pub rule_operator: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdCampaign {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub description: Option<String>,
    pub status: String, // active, paused, draft, archived
    pub start_date: bson::DateTime,
    pub end_date: Option<bson::DateTime>,
    pub budget: AdBudget,
    pub optimization_goal: String,
    pub bidding_strategy: String,
    pub daily_budget: f64,
    pub lifetime_budget: Option<f64>,
    pub target_roas: Option<f64>,
    pub target_cpa: Option<f64>,
    pub campaign_type: String,
    pub objective: String,
    pub tracking_pixel_id: Option<String>,
    pub conversion_actions: Option<Vec<String>>,
    pub attribution_model: String,
    pub frequency_capping: Option<AdFrequencyCapping>,
    pub exclusion_rules: Option<Vec<AdExclusionRule>>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
    pub created_by: ObjectId,
    pub updated_by: Option<ObjectId>,
    pub groups_count: i32,
    pub creatives_count: i32,
    pub total_spend: f64,
    pub total_impressions: i64,
    pub total_clicks: i64,
    pub total_conversions: i64,
    pub ctr: f64,
    pub cpm: f64,
    pub cpc: f64,
    pub roas: f64,
    pub conversion_rate: f64,
    pub quality_score: f64,
    pub ad_rank: f64,
    pub performance_score: f64,
    pub last_updated: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdDemographics {
    pub age_ranges: Option<Vec<String>>,
    pub genders: Option<Vec<String>>,
    pub income_levels: Option<Vec<String>>,
    pub education_levels: Option<Vec<String>>,
    pub relationship_statuses: Option<Vec<String>>,
    pub parental_statuses: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdTimeOfDay {
    pub start_hour: i32,
    pub end_hour: i32,
    pub days_of_week: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdTargeting {
    pub locations: Option<Vec<String>>,
    pub demographics: Option<AdDemographics>,
    pub interests: Option<Vec<String>>,
    pub keywords: Option<Vec<String>>,
    pub devices: Option<Vec<String>>,
    pub operating_systems: Option<Vec<String>>,
    pub time_of_day: Option<AdTimeOfDay>,
    pub custom_audiences: Option<Vec<String>>,
    pub lookalike_audiences: Option<Vec<String>>,
    pub exclusion_audiences: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdBid {
    pub bid_type: String,
    pub bid_amount: f64,
    pub bid_strategy: String,
    pub bid_ceiling: Option<f64>,
    pub bid_floor: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdGroup {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub campaign_id: ObjectId,
    pub name: String,
    pub status: String,
    pub targeting: AdTargeting,
    pub bid_strategy: AdBid,
    pub ad_rotation: String,
    pub ad_serving_optimization: String,
    pub start_date: Option<bson::DateTime>,
    pub end_date: Option<bson::DateTime>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
    pub creatives_count: i32,
    pub total_spend: f64,
    pub total_impressions: i64,
    pub total_clicks: i64,
    pub ctr: f64,
    pub cpm: f64,
    pub cpc: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdAssetDimensions {
    pub width: i32,
    pub height: i32,
    pub aspect_ratio: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdCreativeAsset {
    pub asset_type: String,
    pub asset_url: String,
    pub asset_text: Option<String>,
    pub asset_dimensions: Option<AdAssetDimensions>,
    pub asset_format: Option<String>,
    pub asset_size: Option<i64>,
    pub alt_text: Option<String>,
    pub creative_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdDeviceAdjustment {
    pub device_type: String,
    pub adjustment_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdLocationAdjustment {
    pub location: String,
    pub adjustment_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdTimeAdjustment {
    pub time_period: String,
    pub adjustment_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdBidAdjustments {
    pub device_adjustments: Option<Vec<AdDeviceAdjustment>>,
    pub location_adjustments: Option<Vec<AdLocationAdjustment>>,
    pub time_adjustments: Option<Vec<AdTimeAdjustment>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdCreativeVariant {
    pub variant_name: String,
    pub assets: Vec<AdCreativeAsset>,
    pub targeting: Option<AdTargeting>,
    pub bid_adjustments: Option<AdBidAdjustments>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdCustomParameter {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdTemplateField {
    pub field_name: String,
    pub field_value: String,
    pub field_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdCreative {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub ad_group_id: ObjectId,
    pub name: String,
    pub creative_type: String,
    pub status: String,
    pub assets: Vec<AdCreativeAsset>,
    pub variants: Option<Vec<AdCreativeVariant>>,
    pub call_to_action: Option<String>,
    pub headline: Option<String>,
    pub description: Option<String>,
    pub display_url: Option<String>,
    pub final_url: String,
    pub tracking_url: Option<String>,
    pub custom_parameters: Option<Vec<AdCustomParameter>>,
    pub template_id: Option<String>,
    pub template_fields: Option<Vec<AdTemplateField>>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
    pub impressions: i64,
    pub clicks: i64,
    pub conversions: i64,
    pub ctr: f64,
    pub cpm: f64,
    pub cpc: f64,
    pub quality_score: f64,
    pub relevance_score: f64,
    pub landing_page_score: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdAnalytics {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub campaign_id: Option<ObjectId>,
    pub ad_group_id: Option<ObjectId>,
    pub creative_id: Option<ObjectId>,
    pub date: bson::DateTime,
    pub impressions: i64,
    pub clicks: i64,
    pub conversions: i64,
    pub spend: f64,
    pub revenue: f64,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdReport {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub report_type: String,
    pub date_range: String,
    pub format: String, // pdf, csv, excel
    pub generated_at: bson::DateTime,
    pub url: String,
    pub created_by: ObjectId,
}

