use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, State},
    response::IntoResponse,
};
use futures::{sink::SinkExt, stream::StreamExt};
use std::sync::Arc;
use tokio::sync::mpsc;
use mongodb::bson::oid::ObjectId;
use serde::{Serialize, Deserialize};
use serde_json::json;
use crate::db::AppState;
use crate::auth::decode_token;

#[derive(Serialize, Deserialize, Debug)]
pub struct WsPayload {
    pub r#type: String,
    pub data: serde_json::Value,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

// Utility to broadcast to a specific user
pub async fn send_to_user(state: &Arc<AppState>, user_id: &ObjectId, payload: &WsPayload) {
    if let Some(connections) = state.ws_connections.get(user_id) {
        let msg_text = serde_json::to_string(payload).unwrap();
        for tx in connections.value() {
            let _ = tx.send(Message::Text(msg_text.clone()));
        }
    }
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel();
    
    let mut current_user_id: Option<ObjectId> = None;

    // Handle outgoing messages
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Handle incoming messages (Authentication first)
    while let Some(Ok(msg)) = receiver.next().await {
        if let Message::Text(text) = msg {
            if let Ok(payload) = serde_json::from_str::<serde_json::Value>(&text) {
                // Check for auth message: { "type": "auth", "token": "..." }
                if payload["type"] == "auth" {
                    if let Some(token) = payload["token"].as_str() {
                        if let Ok(claims_data) = decode_token(token, &state.jwt_secret) {
                            if let Ok(uid) = ObjectId::parse_str(&claims_data.claims.sub) {
                                current_user_id = Some(uid);
                                
                                // Register connection
                                state.ws_connections.entry(uid).or_insert_with(Vec::new).push(tx.clone());
                                
                                let _ = tx.send(Message::Text(serde_json::to_string(&json!({
                                    "type": "auth_success",
                                    "data": { "user_id": uid.to_hex() }
                                })).unwrap()));
                            }
                        }
                    }
                } else {
                    // Start signaling logic for authenticated users
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
                drop(connections); // Release lock before remove
                state.ws_connections.remove(&uid);
            }
        }
    }
    send_task.abort();
}
