use axum::{
    extract::State,
    response::IntoResponse,
    routing::get,
    Router,
    Json,
};
use serde::Serialize;
use std::sync::Arc;
use crate::db::AppState;
use crate::auth::AuthUser;
use serde_json::json;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use chrono::Utc;
use base64::Engine;

#[derive(Serialize)]
pub struct AblyTokenRequest {
    pub key_name: String,
    pub nonce: String,
    pub timestamp: i64,
    pub capability: String,
    pub client_id: String,
    pub mac: String,
}

pub fn ably_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/auth", get(get_ably_token_request))
}

async fn get_ably_token_request(
    State(_state): State<Arc<AppState>>,
    user: AuthUser,
) -> impl IntoResponse {
    let ably_api_key = std::env::var("ABLY_API_KEY").unwrap_or_default();
    if ably_api_key.is_empty() {
        return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "ABLY_API_KEY not set"}))).into_response();
    }
    
    let parts: Vec<&str> = ably_api_key.split(':').collect();
    if parts.len() != 2 {
        return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Invalid ABLY_API_KEY format"}))).into_response();
    }
    
    let key_name = parts[0];
    let key_secret = parts[1].trim();
    
    let client_id = user.user_id.to_hex();
    let timestamp = Utc::now().timestamp_millis();
    let nonce = uuid::Uuid::new_v4().to_string().replace("-", "").to_lowercase();
    let capability = "{\"*\":[\"*\"]}";
    let ttl = "3600000"; // 1 hour in ms
    
    // Sign the token request
    // Format: keyName + "\n" + ttl + "\n" + capability + "\n" + clientId + "\n" + timestamp + "\n" + nonce + "\n"
    let sign_data = format!("{}\n{}\n{}\n{}\n{}\n{}\n", 
        key_name, 
        ttl, 
        capability, 
        client_id, 
        timestamp, 
        nonce
    );
    
    type HmacSha256 = Hmac<Sha256>;
    let mut mac_hasher = HmacSha256::new_from_slice(key_secret.as_bytes()).unwrap();
    mac_hasher.update(sign_data.as_bytes());
    let mac_base64 = base64::engine::general_purpose::STANDARD.encode(mac_hasher.finalize().into_bytes());

    Json(json!({
        "keyName": key_name,
        "nonce": nonce,
        "timestamp": timestamp,
        "capability": capability,
        "clientId": client_id,
        "ttl": 3600000,
        "mac": mac_base64
    })).into_response()
}
