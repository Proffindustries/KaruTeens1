use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, State},
    response::IntoResponse,
    http::HeaderMap,
};
use futures::{sink::SinkExt, stream::StreamExt};
use std::sync::Arc;
use tokio::sync::mpsc;
use mongodb::bson::oid::ObjectId;
use serde::{Serialize, Deserialize};
use serde_json::json;
use crate::features::infrastructure::db::AppState;
use crate::features::auth::auth_service::decode_token;

#[derive(Serialize, Deserialize, Debug)]
pub struct WsPayload {
    pub r#type: String,
    pub data: serde_json::Value,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Validate origin for WebSocket connections
    if let Some(origin) = headers.get("origin") {
        let origin_str = origin.to_str().unwrap_or("");
        let frontend_url = std::env::var("FRONTEND_URL").unwrap_or_else(|_| "*".to_string());

        if frontend_url != "*" {
            let allowed_origins: Vec<&str> = frontend_url.split(',').map(|s| s.trim()).collect();
            if !allowed_origins.contains(&origin_str) {
                tracing::warn!("WebSocket origin validation failed: {}", origin_str);
                return axum::http::StatusCode::FORBIDDEN.into_response();
            }
        }
    }

    ws.on_upgrade(|socket| handle_socket(socket, state))
}

// Utility to broadcast to a specific user via Redis Pub/Sub
pub async fn send_to_user(state: &Arc<AppState>, user_id: &ObjectId, payload: &WsPayload) {
    let channel = format!("ws:user:{}", user_id.to_hex());
    state.cache.publish(&channel, payload).await;
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel();
    
    let mut current_user_id: Option<ObjectId> = None;
    let mut redis_sub_task: Option<tokio::task::JoinHandle<()>> = None;

    // Handle outgoing messages to the WebSocket
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Handle incoming messages from the WebSocket (Authentication first)
    while let Some(Ok(msg)) = receiver.next().await {
        if let Message::Text(text) = msg {
            if let Ok(payload) = serde_json::from_str::<serde_json::Value>(&text) {
                // Check for auth message: { "type": "auth", "token": "..." }
                if payload["type"] == "auth" {
                    if let Some(token) = payload["token"].as_str() {
                        if let Ok(claims_data) = decode_token(token, &state.jwt_secret) {
                            if let Ok(uid) = ObjectId::parse_str(&claims_data.claims.sub) {
                                // If already authenticated, skip
                                if current_user_id.is_some() { continue; }
                                
                                current_user_id = Some(uid);
                                
                                // Register connection locally for cleanup/stats
                                state.ws_connections.entry(uid).or_default().push(tx.clone());
                                
                                // Subscribe to Redis channel for this user
                                let channel = format!("ws:user:{}", uid.to_hex());
                                let redis_url = state.redis_url.clone();
                                let tx_inner = tx.clone();
                                
                                redis_sub_task = Some(tokio::spawn(async move {
                                    if let Ok(client) = redis::Client::open(redis_url) {
                                        if let Ok(mut pubsub_conn) = client.get_async_pubsub().await {
                                            if pubsub_conn.subscribe(&channel).await.is_ok() {
                                                let mut pubsub_stream = pubsub_conn.on_message();
                                                while let Some(msg) = pubsub_stream.next().await {
                                                    let payload: String = msg.get_payload().unwrap_or_default();
                                                    if !payload.is_empty() {
                                                        let _ = tx_inner.send(Message::Text(payload));
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }));

                                let _ = tx.send(Message::Text(serde_json::to_string(&json!({
                                    "type": "auth_success",
                                    "data": { "user_id": uid.to_hex() }
                                })).unwrap()));
                            }
                        }
                    }
                } else if current_user_id.is_none() {
                    // Reject all non-auth messages from unauthenticated users
                    let _ = tx.send(Message::Text(serde_json::to_string(&json!({
                        "type": "error",
                        "error": "Not authenticated"
                    })).unwrap()));
                } else {
                    // Signaling logic for authenticated users
                    let msg_type = payload["type"].as_str().unwrap_or("");
                    if ["call-offer", "call-answer", "ice-candidate", "typing"].contains(&msg_type) {
                        if let Some(sender_uid) = current_user_id {
                             if let Some(to_uid_str) = payload["data"].get("to").and_then(|v| v.as_str()) {
                                if let Ok(to_uid) = ObjectId::parse_str(to_uid_str) {
                                    let mut forward_data = payload["data"].clone();
                                    if let Some(obj) = forward_data.as_object_mut() {
                                        obj.insert("from".to_string(), json!(sender_uid.to_hex()));
                                        
                                        // For call-offer, include caller's username
                                        if msg_type == "call-offer" {
                                            let profiles = state.mongo.collection::<crate::models::Profile>("profiles");
                                            if let Ok(Some(profile)) = profiles.find_one(mongodb::bson::doc! { "user_id": sender_uid }, None).await {
                                                obj.insert("callerUsername".to_string(), json!(profile.username));
                                            }
                                        }
                                    }
                                    
                                    let forward_payload = WsPayload {
                                        r#type: msg_type.to_string(),
                                        data: forward_data,
                                    };
                                    send_to_user(&state, &to_uid, &forward_payload).await;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Cleanup
    if let Some(uid) = current_user_id {
        if let Some(mut connections) = state.ws_connections.get_mut(&uid) {
            connections.retain(|c| !c.same_channel(&tx));
            if connections.is_empty() {
                drop(connections);
                state.ws_connections.remove(&uid);
            }
        }
    }
    
    if let Some(task) = redis_sub_task {
        task.abort();
    }
    send_task.abort();
}
