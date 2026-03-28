use bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MarketplaceItem {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub seller_id: ObjectId,
    pub title: String,
    pub description: String,
    pub price: i64, // In cents
    pub currency: String,
    pub condition: String,
    pub category: String,
    pub images: Vec<String>,
    pub status: String,
    pub created_at: bson::DateTime,
}
