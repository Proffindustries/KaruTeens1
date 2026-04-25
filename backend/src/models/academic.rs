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
pub struct TimetableClass {
    pub id: String,
    pub title: String,
    pub start_time: String,
    pub end_time: String,
    pub room: String,
    pub day: String,
    pub professor: Option<String>,
    pub course_code: Option<String>,
    #[serde(default)]
    pub is_exam: bool,
    pub date: Option<String>, // ISO date for exams
    #[serde(default)]
    pub reliability_score: f64, // 0.0 to 1.0
    pub last_report: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Timetable {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub name: String,
    pub is_template: bool,
    #[serde(default)]
    pub is_public: bool,
    #[serde(default)]
    pub fork_count: i32,
    pub school: Option<String>,
    pub programme: Option<String>,
    pub classes: Vec<TimetableClass>,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AttendanceLog {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub timetable_id: ObjectId,
    pub class_id: String,
    pub date: String, // ISO date
    pub status: String, // attended, missed, partial
    pub notes: Option<String>,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CrowdReport {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub timetable_id: ObjectId, // The original template/public timetable
    pub class_id: String,
    pub reporter_id: ObjectId,
    pub report_type: String, // cancelled, room_changed, professor_changed, other
    pub description: Option<String>,
    pub timestamp: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RevisionMaterial {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub course_code: String,
    pub category: String, // CATs, Exams, Question Papers, Notes, Other
    pub material_type: String, // "revision" or "recall"
    pub school: String,
    pub programme: String,
    pub year: i32,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PhysicalRoom {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub building: String,
    pub floor: String,
    pub capacity: i32,
    pub amenities: Vec<String>, // e.g., "Whiteboard", "Projector", "AC"
    pub is_available: bool,
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RoomBooking {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub room_id: ObjectId,
    pub user_id: ObjectId,
    pub start_time: bson::DateTime,
    pub end_time: bson::DateTime,
    pub purpose: Option<String>,
    pub status: String, // pending, confirmed, cancelled, completed
    pub created_at: bson::DateTime,
}
