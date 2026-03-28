use bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Event {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub description: String,
    pub location: String,
    pub location_type: String,
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
    pub event_type: String,
    pub status: String,
    pub is_recurring: bool,
    pub recurrence_pattern: Option<String>,
    pub recurrence_end_date: Option<bson::DateTime>,
    pub image_url: Option<String>,
    pub banner_url: Option<String>,
    pub featured: bool,
    pub ticket_price: Option<i64>, // In cents
    pub currency: Option<String>,
    pub rsvp_required: bool,
    pub waitlist_enabled: bool,
    pub waitlist_count: i32,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EventRSVP {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub event_id: ObjectId,
    pub user_id: ObjectId,
    pub status: String,
    pub created_at: bson::DateTime,
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
    pub payment_status: Option<String>,
    pub payment_amount: Option<i64>, // In cents
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
    pub notification_type: String,
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
