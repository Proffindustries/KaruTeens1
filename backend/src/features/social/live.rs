use axum::{
    extract::{Path, State},
    response::IntoResponse,
    routing::{get, post},
    Router,
    Json,
};
use std::sync::Arc;
use crate::features::infrastructure::db::AppState;
use crate::features::auth::auth_service::AuthUser;
use crate::models::social::LiveStream;
use serde_json::json;
use bson::{doc, oid::ObjectId, DateTime};
use chrono::Utc;
use futures::StreamExt;

pub fn live_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/start", post(start_stream))
        .route("/active", get(get_active_streams))
        .route("/:id/end", post(end_stream))
        .route("/:id/heart", post(send_heart))
        .route("/:id/viewers", post(update_viewers))
}

async fn start_stream(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let collection = state.mongo.collection::<LiveStream>("live_streams");
    
    // End any existing active streams for this user
    let _ = collection.update_many(
        doc! { "user_id": user.user_id, "is_active": true },
        doc! { "$set": { "is_active": false, "ended_at": DateTime::now() } },
        None
    ).await;

    let stream_key = uuid::Uuid::new_v4().to_string();
    let now = DateTime::now();
    
    let new_stream = LiveStream {
        id: None,
        user_id: user.user_id,
        username: user.username.clone(),
        user_avatar: user.avatar_url.clone(),
        title: payload.get("title").and_then(|t| t.as_str()).unwrap_or("Live Stream").to_string(),
        started_at: now,
        ended_at: None,
        is_active: true,
        viewer_count: 0,
        stream_key,
        stream_url: None,
        thumbnail_url: payload.get("thumbnail_url").and_then(|t| t.as_str()).map(|s| s.to_string()),
        created_at: now,
        updated_at: now,
    };

    match collection.insert_one(new_stream, None).await {
        Ok(result) => {
            (axum::http::StatusCode::CREATED, Json(json!({
                "id": result.inserted_id,
                "message": "Stream started successfully"
            }))).into_response()
        }
        Err(_) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to start stream"}))).into_response()
    }
}

async fn get_active_streams(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let collection = state.mongo.collection::<LiveStream>("live_streams");
    let mut cursor = match collection.find(doc! { "is_active": true }, None).await {
        Ok(c) => c,
        Err(_) => return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to fetch streams"}))).into_response(),
    };

    let mut streams = Vec::new();
    while let Some(Ok(stream)) = cursor.next().await {
        streams.push(stream);
    }

    Json(streams).into_response()
}

async fn end_stream(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let obj_id = match ObjectId::parse_str(&id) {
        Ok(oid) => oid,
        Err(_) => return (axum::http::StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid stream ID"}))).into_response(),
    };

    let collection = state.mongo.collection::<LiveStream>("live_streams");
    let result = collection.update_one(
        doc! { "_id": obj_id, "user_id": user.user_id },
        doc! { "$set": { "is_active": false, "ended_at": DateTime::now() } },
        None
    ).await;

    match result {
        Ok(res) if res.modified_count > 0 => Json(json!({"message": "Stream ended"})).into_response(),
        _ => (axum::http::StatusCode::NOT_FOUND, Json(json!({"error": "Stream not found or unauthorized"}))).into_response(),
    }
}

async fn update_viewers(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let obj_id = match ObjectId::parse_str(&id) {
        Ok(oid) => oid,
        Err(_) => return (axum::http::StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid stream ID"}))).into_response(),
    };

    let count = payload.get("count").and_then(|c| c.as_i64()).unwrap_or(0);
    let collection = state.mongo.collection::<LiveStream>("live_streams");
    
    let _ = collection.update_one(
        doc! { "_id": obj_id },
        doc! { "$set": { "viewer_count": count as i32, "updated_at": DateTime::now() } },
        None
    ).await;

    Json(json!({"status": "updated"})).into_response()
}

async fn send_heart(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    // Logic for sending hearts could be here, but usually it's just a real-time event.
    // For now, we'll just return success to confirm receipt.
    Json(json!({"message": "Heart sent"})).into_response()
}
