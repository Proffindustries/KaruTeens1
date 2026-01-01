use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post, delete},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use crate::db::AppState;
use crate::models::{StudyRoom, User};
use crate::auth::AuthUser;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use futures::stream::StreamExt;
use chrono::{Utc, Duration};

// --- DTOs ---

#[derive(Deserialize)]
pub struct CreateRoomRequest {
    pub name: String,
    pub subject: Option<String>,
}

#[derive(Serialize)]
pub struct InviteLinkResponse {
    pub invite_link: String,
    pub expires_at: String,
}

#[derive(Serialize)]
pub struct RoomResponse {
    pub id: String,
    pub name: String,
    pub subject: Option<String>,
    pub creator_id: String,
    pub participant_count: usize,
    pub max_participants: i32,
    pub is_active: bool,
    pub created_at: String,
    pub participants: Option<Vec<ParticipantInfo>>,
}

#[derive(Serialize)]
pub struct ParticipantInfo {
    pub user_id: String,
    pub username: String,
    pub avatar_url: Option<String>,
}

// --- Middleware: Check Premium ---
async fn check_premium(
    user_id: ObjectId,
    state: &Arc<AppState>,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let users = state.mongo.collection::<User>("users");
    let user_doc = users.find_one(doc! { "_id": user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    match user_doc {
        Some(u) if u.role == "premium" => Ok(()),
        _ => Err((StatusCode::PAYMENT_REQUIRED, Json(json!({"error": "Premium subscription required for Study Rooms"})))),
    }
}

// --- Handlers ---

pub async fn create_room_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateRoomRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // Check premium
    check_premium(user.user_id, &state).await?;

    let collection = state.mongo.collection::<StudyRoom>("study_rooms");

    let new_room = StudyRoom {
        id: None,
        name: payload.name,
        subject: payload.subject,
        creator_id: user.user_id,
        participants: vec![user.user_id],
        max_participants: 6,
        is_active: true,
        created_at: DateTime::now(),
    };

    let result = collection.insert_one(new_room, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({
        "message": "Room created",
        "id": result.inserted_id.as_object_id().unwrap().to_hex()
    }))))
}

pub async fn list_rooms_handler(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<StudyRoom>("study_rooms");

    let mut cursor = collection.find(doc! { "is_active": true }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut rooms = Vec::new();
    while let Some(room) = cursor.next().await {
        if let Ok(r) = room {
            rooms.push(RoomResponse {
                id: r.id.unwrap().to_hex(),
                name: r.name,
                subject: r.subject,
                creator_id: r.creator_id.to_hex(),
                participant_count: r.participants.len(),
                max_participants: r.max_participants,
                is_active: r.is_active,
                created_at: r.created_at.to_chrono().to_rfc3339(),
                participants: None, // Don't fetch participants for list view
            });
        }
    }

    Ok((StatusCode::OK, Json(rooms)))
}

pub async fn get_room_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid room ID"}))))?;

    let collection = state.mongo.collection::<StudyRoom>("study_rooms");
    let room = collection.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Room not found"}))))?;

    // Fetch participant details
    let profiles_collection = state.mongo.collection::<crate::models::Profile>("profiles");
    let mut participants_info = Vec::new();
    
    for participant_id in &room.participants {
        if let Ok(Some(profile)) = profiles_collection.find_one(doc! { "user_id": participant_id }, None).await {
            participants_info.push(ParticipantInfo {
                user_id: participant_id.to_hex(),
                username: profile.username,
                avatar_url: profile.avatar_url,
            });
        }
    }

    let response = RoomResponse {
        id: room.id.unwrap().to_hex(),
        name: room.name,
        subject: room.subject,
        creator_id: room.creator_id.to_hex(),
        participant_count: room.participants.len(),
        max_participants: room.max_participants,
        is_active: room.is_active,
        created_at: room.created_at.to_chrono().to_rfc3339(),
        participants: Some(participants_info),
    };

    Ok((StatusCode::OK, Json(response)))
}

pub async fn join_room_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // Check premium
    check_premium(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid room ID"}))))?;

    let collection = state.mongo.collection::<StudyRoom>("study_rooms");
    let room = collection.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Room not found"}))))?;

    // Check capacity
    if room.participants.len() >= room.max_participants as usize {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Room is full"}))));
    }

    // Check if already joined
    if room.participants.contains(&user.user_id) {
        return Ok((StatusCode::OK, Json(json!({"message": "Already in room"}))));
    }

    // Add participant
    collection.update_one(
        doc! { "_id": oid },
        doc! { "$push": { "participants": user.user_id } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Joined room"}))))
}

pub async fn leave_room_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid room ID"}))))?;

    let collection = state.mongo.collection::<StudyRoom>("study_rooms");

    // Remove participant
    collection.update_one(
        doc! { "_id": oid },
        doc! { "$pull": { "participants": user.user_id } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // If creator left or room empty, mark inactive
    let room = collection.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    if let Some(r) = room {
        if r.participants.is_empty() || r.creator_id == user.user_id {
            collection.update_one(
                doc! { "_id": oid },
                doc! { "$set": { "is_active": false } },
                None
            ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
        }
    }

    Ok((StatusCode::OK, Json(json!({"message": "Left room"}))))
}

pub async fn delete_room_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid room ID"}))))?;

    let collection = state.mongo.collection::<StudyRoom>("study_rooms");
    let room = collection.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Room not found"}))))?;

    // Only creator can delete
    if room.creator_id != user.user_id {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Only room creator can delete"}))));
    }

    collection.update_one(
        doc! { "_id": oid },
        doc! { "$set": { "is_active": false } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Room deleted"}))))
}

pub async fn generate_invite_link_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid room ID"}))))?;

    let collection = state.mongo.collection::<StudyRoom>("study_rooms");
    let room = collection.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Room not found"}))))?;

    // Only creator can generate invite link
    if room.creator_id != user.user_id {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Only room creator can generate invite links"}))));
    }

    // Generate invite link
    let base_url = std::env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:5173".to_string());
    let invite_link = format!("{}/study-rooms/join/{}", base_url, oid.to_hex());
    
    // Link expires in 24 hours
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(24);

    Ok((StatusCode::OK, Json(InviteLinkResponse {
        invite_link,
        expires_at: expires_at.to_rfc3339(),
    })))
}

pub async fn remove_user_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path((room_id, user_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let room_oid = ObjectId::parse_str(&room_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid room ID"}))))?;
    
    let target_user_oid = ObjectId::parse_str(&user_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;

    let collection = state.mongo.collection::<StudyRoom>("study_rooms");
    let room = collection.find_one(doc! { "_id": room_oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Room not found"}))))?;

    // Only creator can remove users
    if room.creator_id != user.user_id {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Only room creator can remove users"}))));
    }

    // Cannot remove yourself
    if target_user_oid == user.user_id {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Cannot remove yourself"}))));
    }

    // Remove user from participants
    collection.update_one(
        doc! { "_id": room_oid },
        doc! { "$pull": { "participants": target_user_oid } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // If room becomes empty, mark as inactive
    let updated_room = collection.find_one(doc! { "_id": room_oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Room not found"}))))?;

    if updated_room.participants.is_empty() {
        collection.update_one(
            doc! { "_id": room_oid },
            doc! { "$set": { "is_active": false } },
            None
        ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    }

    Ok((StatusCode::OK, Json(json!({"message": "User removed from room"}))))
}

pub fn study_room_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(create_room_handler).get(list_rooms_handler))
        .route("/:id", get(get_room_handler).delete(delete_room_handler))
        .route("/:id/join", post(join_room_handler))
        .route("/:id/leave", post(leave_room_handler))
        .route("/:id/invite", get(generate_invite_link_handler))
        .route("/:id/remove/:user_id", delete(remove_user_handler))
}
