use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post, delete},
    Router,
};
use serde::Serialize;
use serde_json::json;
use std::sync::Arc;
use crate::db::AppState;
use crate::models::{Notification, Profile};
use crate::auth::AuthUser;
use mongodb::{bson::{doc, oid::ObjectId}, options::FindOptions};
use crate::ws::{send_to_user, WsPayload};

use futures::stream::StreamExt;

// --- DTOs ---
#[derive(Serialize)]
pub struct NotificationResponse {
    pub id: String,
    pub actor_username: String,
    pub actor_avatar_url: Option<String>,
    pub notification_type: String,
    pub target_id: Option<String>,
    pub content: String,
    pub is_read: bool,
    pub created_at: String,
}

// --- Handlers ---

pub async fn get_notifications_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<Notification>("notifications");
    let profile_collection = state.mongo.collection::<Profile>("profiles");

    let find_options = FindOptions::builder().sort(doc! { "created_at": -1 }).limit(50).build();
    let mut cursor = collection.find(doc! { "user_id": user.user_id }, find_options).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut responses = Vec::new();
    while let Some(result) = cursor.next().await {
        if let Ok(notif) = result {
            let actor = profile_collection.find_one(doc! { "user_id": notif.actor_id }, None).await.unwrap_or(None);
            responses.push(NotificationResponse {
                id: notif.id.unwrap().to_hex(),
                actor_username: actor.as_ref().map(|p| p.username.clone()).unwrap_or_else(|| "Someone".to_string()),
                actor_avatar_url: actor.map(|p| p.avatar_url).flatten(),
                notification_type: notif.notification_type,
                target_id: notif.target_id.map(|oid| oid.to_hex()),
                content: notif.content,
                is_read: notif.is_read,
                created_at: notif.created_at.to_chrono().to_rfc3339(),
            });
        }
    }

    Ok((StatusCode::OK, Json(responses)))
}

pub async fn mark_notification_read_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let collection = state.mongo.collection::<Notification>("notifications");

    collection.update_one(
        doc! { "_id": oid, "user_id": user.user_id },
        doc! { "$set": { "is_read": true } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(StatusCode::OK)
}

pub async fn mark_all_notifications_read_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<Notification>("notifications");

    collection.update_many(
        doc! { "user_id": user.user_id, "is_read": false },
        doc! { "$set": { "is_read": true } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(StatusCode::OK)
}

pub async fn delete_notification_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let collection = state.mongo.collection::<Notification>("notifications");

    collection.delete_one(doc! { "_id": oid, "user_id": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(StatusCode::OK)
}

// Utility to create notification (not a handler)
pub async fn create_notification(
    state: &Arc<AppState>,
    user_id: ObjectId,
    actor_id: ObjectId,
    notification_type: &str,
    target_id: Option<ObjectId>,
    content: &str,
    broadcast: bool,
) -> Result<(), mongodb::error::Error> {
    if user_id == actor_id { return Ok(()); } // Don't notify self

    // Block check: don't notify if user (recipient) has blocked the actor
    let profiles = state.mongo.collection::<Profile>("profiles");
    if let Ok(Some(profile)) = profiles.find_one(doc! { "user_id": user_id }, None).await {
        if let Some(blocked) = profile.blocked_users {
            if blocked.contains(&actor_id) {
                return Ok(());
            }
        }
    }

    let collection = state.mongo.collection::<Notification>("notifications");
    let new_notif = Notification {
        id: None,
        user_id,
        actor_id,
        notification_type: notification_type.to_string(),
        target_id,
        content: content.to_string(),
        is_read: false,
        created_at: mongodb::bson::DateTime::now(),
    };

    let result = collection.insert_one(new_notif, None).await?;
    let notif_id = result.inserted_id.as_object_id().unwrap();

    // Broadcast via WS
    if broadcast {
        let actor = profiles.find_one(doc! { "user_id": actor_id }, None).await.unwrap_or(None);
        let ws_payload = WsPayload {
            r#type: "notification".to_string(),
            data: json!(NotificationResponse {
                id: notif_id.to_hex(),
                actor_username: actor.as_ref().map(|p| p.username.clone()).unwrap_or_else(|| "Someone".to_string()),
                actor_avatar_url: actor.map(|p| p.avatar_url).flatten(),
                notification_type: notification_type.to_string(),
                target_id: target_id.map(|id| id.to_hex()),
                content: content.to_string(),
                is_read: false,
                created_at: chrono::Utc::now().to_rfc3339(),
            }),
        };

        send_to_user(state, &user_id, &ws_payload).await;
    }

    Ok(())
}

pub fn notification_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(get_notifications_handler))
        .route("/read-all", post(mark_all_notifications_read_handler))
        .route("/:id/read", post(mark_notification_read_handler))
        .route("/:id", delete(delete_notification_handler))
}
