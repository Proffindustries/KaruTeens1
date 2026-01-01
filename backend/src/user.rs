use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, put, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use crate::db::AppState;
use crate::models::{Profile, SocialLinks};
use mongodb::bson::doc;
use crate::auth::AuthUser;
use bson::oid::ObjectId;

// --- DTOs ---
#[derive(Deserialize, Serialize)]
pub struct UpdateProfileRequest {
    pub full_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub school: Option<String>,
    pub year_of_study: Option<i32>,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub social_links: Option<SocialLinks>,
    pub public_key: Option<String>,
}

// --- Handlers ---
pub async fn get_profile_handler(
    State(state): State<Arc<AppState>>,
    Path(username): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<Profile>("profiles");

    let profile = collection
        .find_one(doc! { "username": username }, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    match profile {
        Some(p) => Ok((StatusCode::OK, Json(p))),
        None => Err((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))))
    }
}

pub async fn update_profile_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<UpdateProfileRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<Profile>("profiles");

    let mut update_doc = doc! {};
    if let Some(f) = payload.full_name { update_doc.insert("full_name", f); }
    if let Some(b) = payload.bio { update_doc.insert("bio", b); }
    if let Some(a) = payload.avatar_url { update_doc.insert("avatar_url", a); }
    if let Some(s) = payload.school { update_doc.insert("school", s); }
    if let Some(y) = payload.year_of_study { update_doc.insert("year_of_study", y); }
    if let Some(age) = payload.age { update_doc.insert("age", age); }
    if let Some(g) = payload.gender { update_doc.insert("gender", g); }
    if let Some(pk) = payload.public_key { update_doc.insert("public_key", pk); }
    if let Some(sl) = payload.social_links {
        if let Ok(sl_bson) = mongodb::bson::to_bson(&sl) {
            update_doc.insert("social_links", sl_bson);
        }
    }

    if update_doc.is_empty() {
        return Ok((StatusCode::OK, Json(json!({"message": "No changes made"}))));
    }

    collection
        .update_one(doc! { "user_id": user.user_id }, doc! { "$set": update_doc }, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Profile updated successfully"}))))
}

pub async fn mute_chat_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(chat_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let chat_oid = ObjectId::parse_str(&chat_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid chat ID"}))))?;
    let collection = state.mongo.collection::<Profile>("profiles");

    collection.update_one(
        doc! { "user_id": user.user_id },
        doc! { "$addToSet": { "muted_chats": chat_oid } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Chat muted"}))))
}

pub async fn unmute_chat_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(chat_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let chat_oid = ObjectId::parse_str(&chat_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid chat ID"}))))?;
    let collection = state.mongo.collection::<Profile>("profiles");

    collection.update_one(
        doc! { "user_id": user.user_id },
        doc! { "$pull": { "muted_chats": chat_oid } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Chat unmuted"}))))
}

pub async fn block_user_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(target_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let target_oid = ObjectId::parse_str(&target_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;
    let collection = state.mongo.collection::<Profile>("profiles");

    collection.update_one(
        doc! { "user_id": user.user_id },
        doc! { "$addToSet": { "blocked_users": target_oid } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "User blocked"}))))
}

pub async fn unblock_user_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(target_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let target_oid = ObjectId::parse_str(&target_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;
    let collection = state.mongo.collection::<Profile>("profiles");

    collection.update_one(
        doc! { "user_id": user.user_id },
        doc! { "$pull": { "blocked_users": target_oid } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "User unblocked"}))))
}

pub fn user_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/:username", get(get_profile_handler))
        .route("/update", put(update_profile_handler))
        .route("/chat/:id/mute", post(mute_chat_handler).delete(unmute_chat_handler))
        .route("/block/:id", post(block_user_handler).delete(unblock_user_handler))
}
