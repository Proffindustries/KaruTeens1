use serde::{Deserialize, Serialize};

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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NotificationSettings {
    #[serde(default = "default_true")]
    pub messages: bool,
    #[serde(default = "default_true")]
    pub likes: bool,
    #[serde(default = "default_true")]
    pub comments: bool,
    #[serde(default = "default_true")]
    pub follows: bool,
    #[serde(default = "default_true")]
    pub mentions: bool,
    #[serde(default = "default_true")]
    pub class_reminders: bool,
    #[serde(default = "default_false")]
    pub template_updates: bool,
    #[serde(default = "default_false")]
    pub ad_promotions: bool,
    #[serde(default = "default_false")]
    pub email_digest: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Badge {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub description: String,
}

pub fn default_true() -> bool {
    true
}

pub fn default_false() -> bool {
    false
}
