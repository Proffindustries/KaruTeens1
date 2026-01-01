use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use mongodb::{
    bson::{doc, oid::ObjectId, DateTime},
    options::FindOptions,
};
use futures::stream::TryStreamExt;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::{
    db::AppState,
    models::{Chat, Message, Profile, MessageReaction},
    auth::AuthUser,
    notifications::create_notification,
    ws::{send_to_user, WsPayload},
};
use redis::AsyncCommands;
use serde_json::json;

// --- DTOs ---
#[derive(Debug, Deserialize)]
pub struct CreateChatRequest {
    pub recipient_username: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateGroupRequest {
    pub name: String,
    pub participants: Vec<String>, // Usernames
}

#[derive(Debug, Deserialize)]
pub struct CreatePollRequest {
    pub question: String,
    pub options: Vec<String>,
    pub is_multiple: bool,
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub content: String,
    pub attachment_url: Option<String>,
    pub attachment_type: Option<String>,
    pub reply_to_id: Option<String>,
    pub encrypted_content: Option<String>,
    pub encryption_iv: Option<String>,
    pub poll: Option<CreatePollRequest>,
    pub location: Option<LocationRequest>,
    pub contact: Option<ContactRequest>,
    pub is_view_once: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct DisappearingRequest {
    pub duration: Option<i64>, // seconds
}

#[derive(Debug, Deserialize)]
pub struct ContactRequest {
    pub username: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LocationRequest {
    pub latitude: f64,
    pub longitude: f64,
    pub label: Option<String>,
    pub is_live: Option<bool>,
    pub duration_minutes: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct ChatParticipant {
    pub user_id: String,
    pub username: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub id: String,
    pub is_group: bool,
    pub name: String,
    pub avatar_url: Option<String>,
    pub participant: Option<ProfileSummary>, 
    pub last_message: Option<String>,
    pub last_message_time: String,
    pub unread_count: i32,
    pub group_participants: Option<Vec<ChatParticipant>>,
    pub admins: Option<Vec<String>>,
    pub is_muted: bool,
    pub disappearing_duration: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct ProfileSummary {
    pub user_id: String,
    pub username: String,
    pub avatar_url: Option<String>,
    pub public_key: Option<String>,
    pub is_online: bool,
    pub last_seen: Option<String>,
    pub last_location: Option<LocationResponse>,
}

#[derive(Debug, Deserialize)]
pub struct ParticipantRequest {
    pub username: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGroupRequest {
    pub name: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LinkPreviewResponse {
    pub title: Option<String>,
    pub description: Option<String>,
    pub image: Option<String>,
    pub url: String,
}

#[derive(Debug, Serialize)]
pub struct ParentMessageSummary {
    pub id: String,
    pub content: String,
    pub username: String,
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub id: String,
    pub sender_id: String,
    pub sender_username: String,
    pub content: String,
    pub attachment_url: Option<String>,
    pub attachment_type: Option<String>,
    pub created_at: String,
    pub is_me: bool,
    pub reply_to: Option<ParentMessageSummary>,
    pub reactions: Vec<ReactionSummary>,
    pub is_deleted: bool,
    pub read_at: Option<String>,
    pub encrypted_content: Option<String>,
    pub encryption_iv: Option<String>,
    pub poll: Option<PollResponse>,
    pub location: Option<LocationResponse>,
    pub contact: Option<ContactResponse>,
    pub is_view_once: bool,
    pub viewed_at: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ContactResponse {
    pub username: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LocationResponse {
    pub latitude: f64,
    pub longitude: f64,
    pub label: Option<String>,
    pub is_live: Option<bool>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PollResponse {
    pub question: String,
    pub options: Vec<PollOptionResponse>,
    pub is_multiple: bool,
    pub is_closed: bool,
    pub total_votes: usize,
}

#[derive(Debug, Serialize)]
pub struct PollOptionResponse {
    pub text: String,
    pub count: usize,
    pub me_voted: bool,
}

#[derive(Debug, Serialize)]
pub struct ReactionSummary {
    pub emoji: String,
    pub count: usize,
    pub me_reacted: bool,
}

#[derive(Deserialize)]
pub struct ReactRequest {
    pub emoji: String,
}

#[derive(Deserialize)]
pub struct VoteRequest {
    pub option_index: usize,
}

#[derive(Deserialize)]
pub struct DeleteRequest {
    pub mode: String, // "me" or "everyone"
}

// --- Routes ---
pub fn message_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(get_chats_handler).post(create_chat_handler))
        .route("/group", post(create_group_handler))
        .route("/:id/messages", get(get_messages_handler).post(send_message_handler))
        .route("/:id/participants/add", post(add_participants_handler))
        .route("/:id/participants/remove", post(remove_participant_handler))
        .route("/:id/leave", post(leave_group_handler))
        .route("/:id/update", post(update_group_handler))
        .route("/:id/toggle-admin", post(toggle_admin_handler))
        .route("/:id/disappearing", post(set_disappearing_handler))
        .route("/preview", get(get_link_preview_handler))
        .route("/messages/:msg_id/react", post(react_message_handler))
        .route("/messages/:msg_id/vote", post(vote_poll_handler))
        .route("/messages/:msg_id/view", post(mark_viewed_handler))
        .route("/messages/:msg_id/read", post(mark_read_handler))
        .route("/messages/:msg_id", post(delete_message_handler))
        .route("/update-live-location", post(update_live_location_handler))
}

// --- Handlers ---

// Create or Get Chat
pub async fn create_chat_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateChatRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    let chats_collection = state.mongo.collection::<Chat>("chats");

    // 1. Find recipient by username (case-insensitive)
    let recipient_profile = profiles_collection
        .find_one(doc! { "username": { "$regex": format!("^{}$", payload.recipient_username), "$options": "i" } }, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))))?;

    if recipient_profile.user_id == user.user_id {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Cannot chat with yourself"}))));
    }

    // 2. Check if chat already exists
    let existing_chat = chats_collection.find_one(
        doc! { 
            "is_group": false,
            "participants": { 
                "$all": [user.user_id, recipient_profile.user_id] 
            } 
        }, 
        None
    ).await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    if let Some(chat) = existing_chat {
        return Ok((StatusCode::OK, Json(json!({ "id": chat.id.unwrap().to_hex() }))));
    }

    // 3. Create new chat
    let new_chat = Chat {
        id: None,
        participants: vec![user.user_id, recipient_profile.user_id],
        is_group: false,
        name: None,
        avatar_url: None,
        admins: Vec::new(),
        last_message: None,
        last_message_time: mongodb::bson::DateTime::now(),
        disappearing_duration: None,
        created_at: mongodb::bson::DateTime::now(),
    };

    let result = chats_collection.insert_one(new_chat, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({ "id": result.inserted_id.as_object_id().unwrap().to_hex() }))))
}

// Create Group Chat
pub async fn create_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateGroupRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    let chats_collection = state.mongo.collection::<Chat>("chats");

    let mut participant_ids = vec![user.user_id];
    
    for username in payload.participants {
        if let Ok(Some(p)) = profiles_collection.find_one(doc! { "username": username }, None).await {
            if !participant_ids.contains(&p.user_id) {
                participant_ids.push(p.user_id);
            }
        }
    }

    if participant_ids.len() < 2 {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Group must have at least 2 participants"}))));
    }

    let new_group = Chat {
        id: None,
        participants: participant_ids,
        is_group: true,
        name: Some(payload.name),
        avatar_url: None, // Could add dynamic avatar generation later
        admins: vec![user.user_id],
        last_message: None,
        last_message_time: mongodb::bson::DateTime::now(),
        disappearing_duration: None,
        created_at: mongodb::bson::DateTime::now(),
    };

    let result = chats_collection.insert_one(new_group, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({ "id": result.inserted_id.as_object_id().unwrap().to_hex() }))))
}

// Get All Chats for User
pub async fn get_chats_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let chats_collection = state.mongo.collection::<Chat>("chats");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    let messages_collection = state.mongo.collection::<Message>("messages");

    let find_options = FindOptions::builder().sort(doc! { "last_message_time": -1 }).build();
    let mut cursor = chats_collection.find(
        doc! { "participants": user.user_id }, 
        find_options
    ).await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut response_chats = Vec::new();

    let user_profile = profiles_collection.find_one(doc! { "user_id": user.user_id }, None).await.unwrap_or(None);
    let muted_chat_ids = user_profile.and_then(|p| p.muted_chats).unwrap_or_default();

    while let Some(chat) = cursor.try_next().await.unwrap_or(None) {
        let chat_id = chat.id.unwrap();
        let is_muted = muted_chat_ids.contains(&chat_id);
        
        let unread_count = messages_collection.count_documents(
            doc! { "chat_id": chat_id, "sender_id": { "$ne": user.user_id }, "read_at": null },
            None
        ).await.unwrap_or(0);

        if chat.is_group {
            let mut group_p = Vec::new();
            for pid in &chat.participants {
                if let Ok(Some(p)) = profiles_collection.find_one(doc! { "user_id": pid }, None).await {
                    group_p.push(ChatParticipant {
                        user_id: p.user_id.to_hex(),
                        username: p.username,
                        avatar_url: p.avatar_url,
                    });
                }
            }

            response_chats.push(ChatResponse {
                id: chat_id.to_hex(),
                is_group: true,
                name: chat.name.unwrap_or_else(|| "Untitled Group".to_string()),
                avatar_url: chat.avatar_url,
                participant: None,
                last_message: chat.last_message,
                last_message_time: chat.last_message_time.to_chrono().to_rfc3339(),
                unread_count: unread_count as i32,
                group_participants: Some(group_p),
                admins: Some(chat.admins.iter().map(|id| id.to_hex()).collect()),
                is_muted,
                disappearing_duration: chat.disappearing_duration,
            });
        } else {
            let other_id = chat.participants.iter().find(|&&id| id != user.user_id).unwrap_or(&user.user_id);
            let profile = profiles_collection.find_one(doc! { "user_id": other_id }, None).await.unwrap_or(None);

            if let Some(p) = profile {
                let presence_key = format!("user:presence:{}", p.user_id.to_hex());
                let mut conn = state.redis.get_async_connection().await
                    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Redis error"}))))?;
                
                let is_online: bool = conn.exists(&presence_key).await.unwrap_or(false);

                response_chats.push(ChatResponse {
                    id: chat_id.to_hex(),
                    is_group: false,
                    name: p.username.clone(),
                    avatar_url: p.avatar_url.clone(),
                    participant: Some(ProfileSummary {
                        user_id: p.user_id.to_hex(),
                        username: p.username,
                        avatar_url: p.avatar_url,
                        public_key: p.public_key,
                        is_online,
                        last_seen: p.last_seen_at.map(|dt| dt.to_chrono().to_rfc3339()),
                        last_location: p.last_location.map(|l| LocationResponse {
                            latitude: l.latitude,
                            longitude: l.longitude,
                            label: l.label,
                            is_live: l.is_live,
                            expires_at: l.expires_at.map(|dt| dt.to_chrono().to_rfc3339()),
                        }),
                    }),
                    last_message: chat.last_message,
                    last_message_time: chat.last_message_time.to_chrono().to_rfc3339(),
                    unread_count: unread_count as i32, 
                    group_participants: None,
                    admins: None,
                    is_muted,
                    disappearing_duration: chat.disappearing_duration,
                });
            }
        }
    }

    Ok((StatusCode::OK, Json(response_chats)))
}

// Get Messages for a Chat
pub async fn get_messages_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(chat_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&chat_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let chats_collection = state.mongo.collection::<Chat>("chats");
    let messages_collection = state.mongo.collection::<Message>("messages");

    // Verify participation
    let _chat = chats_collection.find_one(doc! { "_id": oid, "participants": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Chat not found or access denied"}))))?;

    let find_options = FindOptions::builder().sort(doc! { "created_at": 1 }).limit(100).build();
    let mut cursor = messages_collection.find(doc! { "chat_id": oid }, find_options).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut messages = Vec::new();
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    while let Some(msg) = cursor.try_next().await.unwrap_or(None) {
        // Skip expired messages
        if let Some(expires_at) = msg.expires_at {
            if expires_at.to_chrono() < chrono::Utc::now() {
                continue;
            }
        }
        let sender_profile = profiles_collection.find_one(doc! { "user_id": msg.sender_id }, None).await.unwrap_or(None);
        let sender_username = sender_profile.map(|p| p.username).unwrap_or_else(|| "Unknown".to_string());

        let mut reply_to = None;
        if let Some(parent_id) = msg.reply_to_id {
            if let Ok(Some(parent_msg)) = messages_collection.find_one(doc! { "_id": parent_id }, None).await {
                let parent_sender = profiles_collection.find_one(doc! { "user_id": parent_msg.sender_id }, None).await.unwrap_or(None);
                reply_to = Some(ParentMessageSummary {
                    id: parent_id.to_hex(),
                    content: parent_msg.content,
                    username: parent_sender.map(|p| p.username).unwrap_or_else(|| "Unknown".to_string()),
                });
            }
        }

        let mut reaction_summaries = Vec::new();
        let mut emo_map: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
        let mut me_emojis = std::collections::HashSet::new();

        for r in &msg.reactions {
            *emo_map.entry(r.emoji.clone()).or_insert(0) += 1;
            if r.user_id == user.user_id {
                me_emojis.insert(r.emoji.clone());
            }
        }

        for (emoji, count) in emo_map {
            reaction_summaries.push(ReactionSummary {
                emoji: emoji.clone(),
                count,
                me_reacted: me_emojis.contains(&emoji),
            });
        }

        let content = if msg.is_deleted {
            "This message was deleted".to_string()
        } else {
            msg.content
        };

        let mut res = MessageResponse {
            id: msg.id.unwrap().to_hex(),
            sender_id: msg.sender_id.to_hex(),
            sender_username,
            content,
            attachment_url: if msg.is_deleted { None } else { msg.attachment_url },
            attachment_type: if msg.is_deleted { None } else { msg.attachment_type },
            created_at: msg.created_at.to_chrono().to_rfc3339(),
            is_me: msg.sender_id == user.user_id,
            reply_to,
            reactions: reaction_summaries,
            is_deleted: msg.is_deleted,
            read_at: msg.read_at.map(|dt| dt.to_chrono().to_rfc3339()),
            encrypted_content: msg.encrypted_content,
            encryption_iv: msg.encryption_iv,
            poll: msg.poll.map(|p| {
                let mut total_votes = 0;
                let options = p.options.into_iter().map(|opt| {
                    let count = opt.voter_ids.len();
                    total_votes += count;
                    PollOptionResponse {
                        text: opt.text,
                        count,
                        me_voted: opt.voter_ids.contains(&user.user_id),
                    }
                }).collect();
                PollResponse {
                    question: p.question,
                    options,
                    is_multiple: p.is_multiple,
                    is_closed: p.is_closed,
                    total_votes,
                }
            }),
            location: msg.location.map(|l| LocationResponse {
                latitude: l.latitude,
                longitude: l.longitude,
                label: l.label,
                is_live: l.is_live,
                expires_at: l.expires_at.map(|dt| dt.to_chrono().to_rfc3339()),
            }),
            contact: msg.contact.map(|c| ContactResponse {
                username: c.username,
                full_name: c.full_name,
                avatar_url: c.avatar_url,
            }),
            is_view_once: msg.is_view_once,
            viewed_at: msg.viewed_at.map(|dt| dt.to_chrono().to_rfc3339()),
            expires_at: msg.expires_at.map(|dt| dt.to_chrono().to_rfc3339()),
        };

        // Redact attachment if view once and viewed
        if res.is_view_once && res.viewed_at.is_some() {
            res.attachment_url = None;
            res.content = "Media viewed".to_string();
        }

        messages.push(res);
    }

    Ok((StatusCode::OK, Json(messages)))
}

// Send Message
pub async fn send_message_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(chat_id): Path<String>,
    Json(payload): Json<SendMessageRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&chat_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let chats_collection = state.mongo.collection::<Chat>("chats");
    let messages_collection = state.mongo.collection::<Message>("messages");
    let users_collection = state.mongo.collection::<crate::models::User>("users");

    // Check verification
    let db_user = users_collection.find_one(doc! { "_id": user.user_id }, None).await.unwrap_or(None);
    if db_user.map_or(true, |u| !u.is_verified) {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Account verification required to send messages. Please verify your account for Ksh 20."}))));
    }

    // Verify participation
    let chat = chats_collection.find_one(doc! { "_id": oid, "participants": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Chat not found or access denied"}))))?;

    // Block Check for DMs
    if !chat.is_group {
        let other_id = chat.participants.iter().find(|&&id| id != user.user_id).unwrap_or(&user.user_id);
        let profiles_collection = state.mongo.collection::<Profile>("profiles");
        if let Ok(Some(other_profile)) = profiles_collection.find_one(doc! { "user_id": other_id }, None).await {
            if let Some(blocked) = other_profile.blocked_users {
                if blocked.contains(&user.user_id) {
                    return Err((StatusCode::FORBIDDEN, Json(json!({"error": "You are blocked by this user"}))));
                }
            }
        }
    }

    let reply_to_id = payload.reply_to_id.and_then(|id| ObjectId::parse_str(id).ok());

    let new_message = Message {
        id: None,
        chat_id: oid,
        sender_id: user.user_id,
        content: payload.content.clone(),
        attachment_url: payload.attachment_url.clone(),
        attachment_type: payload.attachment_type.clone(),
        reply_to_id,
        reactions: Vec::new(),
        is_deleted: false,
        deleted_at: None,
        read_at: None,
        encrypted_content: payload.encrypted_content.clone(),
        encryption_iv: payload.encryption_iv.clone(),
        poll: payload.poll.map(|p| {
            crate::models::Poll {
                question: p.question,
                options: p.options.into_iter().map(|o| crate::models::PollOption {
                    text: o,
                    voter_ids: Vec::new(),
                }).collect(),
                is_multiple: p.is_multiple,
                is_closed: false,
                created_at: DateTime::now(),
            }
        }),
        location: payload.location.map(|l| {
            let expires_at = l.duration_minutes.map(|mins| {
                let chrono_dt = chrono::Utc::now() + chrono::Duration::minutes(mins as i64);
                mongodb::bson::DateTime::from_chrono(chrono_dt)
            });
            crate::models::Location {
                latitude: l.latitude,
                longitude: l.longitude,
                label: l.label,
                is_live: l.is_live,
                expires_at,
            }
        }),
        contact: payload.contact.map(|c| crate::models::Contact {
            username: c.username,
            full_name: c.full_name,
            avatar_url: c.avatar_url,
        }),
        is_view_once: payload.is_view_once.unwrap_or(false),
        viewed_at: None,
        expires_at: chat.disappearing_duration.map(|d| {
            let expires = chrono::Utc::now() + chrono::Duration::seconds(d);
            mongodb::bson::DateTime::from_chrono(expires)
        }),
        created_at: DateTime::now(),
    };

    let result = messages_collection.insert_one(new_message, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Update Chat last_message
    chats_collection.update_one(
        doc! { "_id": oid },
        doc! { 
            "$set": { 
                "last_message": payload.content.clone(),
                "last_message_time": mongodb::bson::DateTime::now() 
            }  
        },
        None
    ).await
    .ok();

    // 4. Trigger Notifications & WS Broadcast (Async)
    if let Ok(Some(full_chat)) = chats_collection.find_one(doc! { "_id": oid }, None).await {
        let msg_id = result.inserted_id.as_object_id().unwrap();
        
        let profiles_collection = state.mongo.collection::<Profile>("profiles");
        let sender_username = profiles_collection.find_one(doc! { "user_id": user.user_id }, None).await
            .unwrap_or(None)
            .map(|p| p.username)
            .unwrap_or_else(|| "Unknown".to_string());

        // Prepare response DTO for broadcast
        let res = MessageResponse {
            id: msg_id.to_hex(),
            // chat_id: oid.to_hex(), // Removed as it is not in MessageResponse definition
            sender_id: user.user_id.to_hex(),
            sender_username,
            content: payload.content.clone(),
            attachment_url: payload.attachment_url.clone(),
            attachment_type: payload.attachment_type.clone(),
            reply_to: None, // Simplified for now, or fetch
            reactions: Vec::new(),
            is_deleted: false,
            // deleted_at: None, // Removed
            read_at: None,
            is_me: false, // Recipients won't see it as "me" unless handled on frontend
            encrypted_content: payload.encrypted_content.clone(),
            encryption_iv: payload.encryption_iv.clone(),
            poll: None, // Simplified, same as above
            location: None,
            contact: None,
            is_view_once: payload.is_view_once.unwrap_or(false),
            viewed_at: None,
            expires_at: chat.disappearing_duration.map(|d| {
                let expires = chrono::Utc::now() + chrono::Duration::seconds(d);
                mongodb::bson::DateTime::from_chrono(expires).to_chrono().to_rfc3339()
            }),
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        let ws_payload = WsPayload {
            r#type: "message".to_string(),
            data: json!(res),
        };

        for pid in full_chat.participants {
            if pid != user.user_id {
                let notification_text = if full_chat.is_group {
                    format!("sent a message to {}", full_chat.name.clone().unwrap_or_else(|| "group".to_string()))
                } else {
                    "sent you a message".to_string()
                };

                let _ = create_notification(
                    &state,
                    pid,
                    user.user_id,
                    "message",
                    Some(oid),
                    &notification_text,
                    false
                ).await;

                send_to_user(&state, &pid, &ws_payload).await;
            }
        }
    }

    Ok((StatusCode::CREATED, Json(json!({ 
        "id": result.inserted_id.as_object_id().unwrap().to_hex(),
        "created_at": mongodb::bson::DateTime::now().to_chrono().to_rfc3339()
    }))))
}

// React to Message
pub async fn react_message_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(msg_id): Path<String>,
    Json(payload): Json<ReactRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&msg_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let messages_collection = state.mongo.collection::<Message>("messages");

    let filter = doc! { "_id": oid, "reactions": { "$elemMatch": { "user_id": user.user_id, "emoji": &payload.emoji } } };
    let already_reacted = messages_collection.find_one(filter, None).await.unwrap_or(None).is_some();

    if already_reacted {
        messages_collection.update_one(
            doc! { "_id": oid },
            doc! { "$pull": { "reactions": { "user_id": user.user_id, "emoji": payload.emoji } } },
            None
        ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    } else {
        let new_reaction = MessageReaction {
            user_id: user.user_id,
            emoji: payload.emoji,
            created_at: DateTime::now(),
        };
        messages_collection.update_one(
            doc! { "_id": oid },
            doc! { "$push": { "reactions": mongodb::bson::to_bson(&new_reaction).unwrap() } },
            None
        ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    }

    Ok(StatusCode::OK)
}

// Mark Message as Read
pub async fn mark_read_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(msg_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&msg_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let messages_collection = state.mongo.collection::<Message>("messages");

    messages_collection.update_one(
        doc! { "_id": oid, "sender_id": { "$ne": user.user_id }, "read_at": null },
        doc! { "$set": { "read_at": DateTime::now() } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(StatusCode::OK)
}

// Mark View Once Message as Viewed
pub async fn mark_viewed_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(msg_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&msg_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let messages_collection = state.mongo.collection::<crate::models::Message>("messages");

    messages_collection.update_one(
        doc! { "_id": oid, "sender_id": { "$ne": user.user_id }, "is_view_once": true, "viewed_at": null },
        doc! { "$set": { "viewed_at": DateTime::now() } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(StatusCode::OK)
}

// Delete Message
pub async fn delete_message_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(msg_id): Path<String>,
    Json(payload): Json<DeleteRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&msg_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let messages_collection = state.mongo.collection::<Message>("messages");

    let msg = messages_collection.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Message not found"}))))?;

    if payload.mode == "everyone" {
        if msg.sender_id != user.user_id {
            return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Not your message to delete for everyone"}))));
        }
        messages_collection.update_one(
            doc! { "_id": oid },
            doc! { "$set": { "is_deleted": true, "deleted_at": DateTime::now() } },
            None
        ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    } else {
        // Mode "me" - Simple delete for sender
        if msg.sender_id == user.user_id {
            messages_collection.delete_one(doc! { "_id": oid }, None).await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
        }
    }

    Ok(StatusCode::OK)
}

// Vote on Poll
pub async fn vote_poll_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(msg_id): Path<String>,
    Json(payload): Json<VoteRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&msg_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let messages_collection = state.mongo.collection::<crate::models::Message>("messages");

    let msg = messages_collection.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Message not found"}))))?;

    let mut poll = msg.poll.ok_or((StatusCode::BAD_REQUEST, Json(json!({"error": "Message is not a poll"}))))?;

    if poll.is_closed {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Poll is closed"}))));
    }

    if payload.option_index >= poll.options.len() {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid option index"}))));
    }

    // Toggle vote logic
    if poll.options[payload.option_index].voter_ids.contains(&user.user_id) {
        // Remove vote
        poll.options[payload.option_index].voter_ids.retain(|&id| id != user.user_id);
    } else {
        // Add vote
        if !poll.is_multiple {
            // Remove previous votes if not multiple
            for opt in &mut poll.options {
                opt.voter_ids.retain(|&id| id != user.user_id);
            }
        }
        poll.options[payload.option_index].voter_ids.push(user.user_id);
    }

    messages_collection.update_one(
        doc! { "_id": oid },
        doc! { "$set": { "poll": mongodb::bson::to_bson(&poll).unwrap() } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(StatusCode::OK)
}

// Get Link Preview
pub async fn get_link_preview_handler(
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let url = params.get("url").ok_or((StatusCode::BAD_REQUEST, Json(json!({"error": "Missing URL"}))))?;
    
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (compatible; KaruTeensBot/1.0)")
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let res = client.get(url).send().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let body = res.text().await
        .unwrap_or_default();

    let mut preview = LinkPreviewResponse {
        title: None,
        description: None,
        image: None,
        url: url.clone(),
    };

    // Very simple extraction without scraper
    if let Some(t_start) = body.find("<title>") {
        if let Some(t_end) = body[t_start..].find("</title>") {
            preview.title = Some(body[t_start+7..t_start+t_end].trim().to_string());
        }
    }

    // Look for OG tags
    let og_title = extract_meta(&body, "og:title");
    if og_title.is_some() { preview.title = og_title; }
    
    preview.description = extract_meta(&body, "og:description")
        .or_else(|| extract_meta(&body, "description"));
    
    preview.image = extract_meta(&body, "og:image");

    Ok((StatusCode::OK, Json(preview)))
}

fn extract_meta(body: &str, property: &str) -> Option<String> {
    let patterns = [
        format!("property=\"{}\" content=\"", property),
        format!("name=\"{}\" content=\"", property),
    ];

    for p in patterns.iter() {
        if let Some(start) = body.find(p) {
            let offset = start + p.len();
            if let Some(end) = body[offset..].find("\"") {
                return Some(body[offset..offset+end].to_string());
            }
        }
    }
    None
}

// Add Participants to Group
pub async fn add_participants_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(chat_id): Path<String>,
    Json(payload): Json<UpdateGroupParticipantsRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&chat_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let chats_collection = state.mongo.collection::<Chat>("chats");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    // Check if chat is group and user is admin
    let chat = chats_collection.find_one(doc! { "_id": oid, "is_group": true, "admins": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::FORBIDDEN, Json(json!({"error": "Only admins can add participants"}))))?;

    let mut new_ids = Vec::new();
    for username in payload.usernames {
        if let Ok(Some(p)) = profiles_collection.find_one(doc! { "username": username }, None).await {
            if !chat.participants.contains(&p.user_id) {
                new_ids.push(p.user_id);
            }
        }
    }

    if new_ids.is_empty() {
        return Ok(StatusCode::OK);
    }

    chats_collection.update_one(
        doc! { "_id": oid },
        doc! { "$push": { "participants": { "$each": new_ids } } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(StatusCode::OK)
}

// Remove Participant from Group
pub async fn remove_participant_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(chat_id): Path<String>,
    Json(payload): Json<ParticipantRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&chat_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let chats_collection = state.mongo.collection::<Chat>("chats");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    // Check if chat is group and user is admin
    let _chat = chats_collection.find_one(doc! { "_id": oid, "is_group": true, "admins": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::FORBIDDEN, Json(json!({"error": "Only admins can remove participants"}))))?;

    let p_to_remove = profiles_collection.find_one(doc! { "username": payload.username }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))))?;

    if p_to_remove.user_id == user.user_id {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Admins cannot remove themselves. Use 'leave' (not implemented yet)"}))));
    }

    chats_collection.update_one(
        doc! { "_id": oid },
        doc! { "$pull": { "participants": p_to_remove.user_id, "admins": p_to_remove.user_id } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(StatusCode::OK)
}

// Leave Group
pub async fn leave_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(chat_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&chat_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let chats_collection = state.mongo.collection::<Chat>("chats");

    chats_collection.update_one(
        doc! { "_id": oid, "is_group": true },
        doc! { "$pull": { "participants": user.user_id, "admins": user.user_id } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(StatusCode::OK)
}

#[derive(Debug, Deserialize)]
pub struct UpdateGroupParticipantsRequest {
    pub usernames: Vec<String>,
}
pub async fn set_disappearing_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(chat_id): Path<String>,
    Json(payload): Json<DisappearingRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&chat_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let chats_collection = state.mongo.collection::<Chat>("chats");

    // Verify admin/participant (if group)
    let chat = chats_collection.find_one(doc! { "_id": oid, "participants": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Chat not found"}))))?;

    if chat.is_group && !chat.admins.contains(&user.user_id) {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Only admins can change this setting"}))));
    }

    chats_collection.update_one(
        doc! { "_id": oid },
        doc! { "$set": { "disappearing_duration": payload.duration } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Disappearing messages updated"}))))
}

// Update Group Metadata
pub async fn update_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(chat_id): Path<String>,
    Json(payload): Json<UpdateGroupRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&chat_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let chats_collection = state.mongo.collection::<Chat>("chats");

    // Check if chat is group and user is admin
    let _ = chats_collection.find_one(doc! { "_id": oid, "is_group": true, "admins": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::FORBIDDEN, Json(json!({"error": "Only admins can update group info"}))))?;

    let mut update_doc = doc! {};
    if let Some(name) = payload.name { update_doc.insert("name", name); }
    if let Some(avatar) = payload.avatar_url { update_doc.insert("avatar_url", avatar); }

    if update_doc.is_empty() {
        return Ok(StatusCode::OK);
    }

    chats_collection.update_one(doc! { "_id": oid }, doc! { "$set": update_doc }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(StatusCode::OK)
}

// Toggle Admin Role
pub async fn toggle_admin_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(chat_id): Path<String>,
    Json(payload): Json<ParticipantRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&chat_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let chats_collection = state.mongo.collection::<Chat>("chats");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    // Check if current user is admin
    let chat = chats_collection.find_one(doc! { "_id": oid, "is_group": true, "admins": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::FORBIDDEN, Json(json!({"error": "Only admins can manage roles"}))))?;

    let target_p = profiles_collection.find_one(doc! { "username": payload.username }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))))?;

    if target_p.user_id == user.user_id {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "You cannot demote yourself"}))));
    }

    if chat.admins.contains(&target_p.user_id) {
        // Demote
        chats_collection.update_one(doc! { "_id": oid }, doc! { "$pull": { "admins": target_p.user_id } }, None).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    } else {
        // Promote
        chats_collection.update_one(doc! { "_id": oid }, doc! { "$push": { "admins": target_p.user_id } }, None).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    }

    Ok(StatusCode::OK)
}

pub async fn update_live_location_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<LocationRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    
    let location = crate::models::Location {
        latitude: payload.latitude,
        longitude: payload.longitude,
        label: payload.label,
        is_live: Some(true),
        expires_at: None,
    };

    profiles_collection.update_one(
        doc! { "user_id": user.user_id },
        doc! { "$set": { "last_location": mongodb::bson::to_bson(&location).unwrap() } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(json!({"status": "success"})))
}
