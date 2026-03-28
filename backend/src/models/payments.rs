use bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transaction {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub phone_number: String,
    pub amount: i64, // Amount in cents (e.g. 100 for Ksh 1.00)
    pub mpesa_receipt_number: Option<String>,
    pub checkout_request_id: String,
    pub status: String, // pending, completed, failed
    pub transaction_type: String, // verification, premium, donation
    pub premium_duration: Option<String>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}
