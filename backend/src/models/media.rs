use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MediaJobRecord {
    #[serde(rename = "_id")]
    pub id: String, // job_id
    pub user_id: String,
    pub status: String, // "pending", "processing", "completed", "failed"
    pub media_type: String,
    pub original_name: String,
    pub final_url: String,
    pub error: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}
