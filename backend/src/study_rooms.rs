use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
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

// --- DTOs ---

#[derive(Deserialize)]
pub struct CreateRoomRequest {
    pub name: String,
    pub subject: Option<String>,
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

    let response = RoomResponse {
        id: room.id.unwrap().to_hex(),
        name: room.name,
        subject: room.subject,
        creator_id: room.creator_id.to_hex(),
        participant_count: room.participants.len(),
        max_participants: room.max_participants,
        is_active: room.is_active,
        created_at: room.created_at.to_chrono().to_rfc3339(),
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

pub fn study_room_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(create_room_handler).get(list_rooms_handler))
        .route("/:id", get(get_room_handler).delete(delete_room_handler))
        .route("/:id/join", post(join_room_handler))
        .route("/:id/leave", post(leave_room_handler))
}
