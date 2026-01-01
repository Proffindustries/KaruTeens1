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
use crate::models::{Story, StoryView, Profile};
use crate::auth::AuthUser;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use futures::stream::StreamExt;
use chrono::Duration;

// --- DTOs ---

#[derive(Deserialize)]
pub struct CreateStoryRequest {
    pub media_url: String,
    pub media_type: String, // image or video
    pub caption: Option<String>,
}

#[derive(Serialize)]
pub struct StoryResponse {
    pub id: String,
    pub user_id: String,
    pub username: String,
    pub avatar_url: Option<String>,
    pub media_url: String,
    pub media_type: String,
    pub caption: Option<String>,
    pub created_at: String,
    pub expires_at: String,
    pub view_count: usize,
    pub is_viewed: bool,
}

// --- Handlers ---

pub async fn create_story_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateStoryRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<Story>("stories");
    let users_collection = state.mongo.collection::<crate::models::User>("users");

    // Check verification
    let db_user = users_collection.find_one(doc! { "_id": user.user_id }, None).await.unwrap_or(None);
    if db_user.map_or(true, |u| !u.is_verified) {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Account verification required to post stories. Please verify your account for Ksh 20."}))));
    }

    let now = chrono::Utc::now();
    let expires_at = now + Duration::hours(24);

    let new_story = Story {
        id: None,
        user_id: user.user_id,
        media_url: payload.media_url,
        media_type: payload.media_type,
        caption: payload.caption,
        created_at: DateTime::from_chrono(now),
        expires_at: DateTime::from_chrono(expires_at),
    };

    let result = collection.insert_one(new_story, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({
        "message": "Story created",
        "id": result.inserted_id.as_object_id().unwrap().to_hex()
    }))))
}

pub async fn list_active_stories_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let stories_collection = state.mongo.collection::<Story>("stories");
    let views_collection = state.mongo.collection::<StoryView>("story_views");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    // Get active stories (not expired)
    let now = DateTime::now();
    let mut cursor = stories_collection.find(
        doc! { "expires_at": { "$gt": now } },
        mongodb::options::FindOptions::builder().sort(doc! { "created_at": -1 }).build()
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut stories_by_user: std::collections::HashMap<String, Vec<StoryResponse>> = std::collections::HashMap::new();

    while let Some(story) = cursor.next().await {
        if let Ok(s) = story {
            let story_id = s.id.unwrap();
            
            // Get profile
            let profile = profiles_collection.find_one(doc! { "user_id": s.user_id }, None).await
                .unwrap_or(None);
            let (username, avatar_url) = match profile {
                Some(p) => (p.username, p.avatar_url),
                None => ("Unknown".to_string(), None),
            };

            // Get view count
            let view_count = views_collection.count_documents(doc! { "story_id": story_id }, None).await
                .unwrap_or(0) as usize;

            // Check if current user viewed
            let is_viewed = views_collection.find_one(
                doc! { "story_id": story_id, "viewer_id": user.user_id },
                None
            ).await.unwrap_or(None).is_some();

            let story_response = StoryResponse {
                id: story_id.to_hex(),
                user_id: s.user_id.to_hex(),
                username: username.clone(),
                avatar_url: avatar_url.clone(),
                media_url: s.media_url,
                media_type: s.media_type,
                caption: s.caption,
                created_at: s.created_at.to_chrono().to_rfc3339(),
                expires_at: s.expires_at.to_chrono().to_rfc3339(),
                view_count,
                is_viewed,
            };

            stories_by_user
                .entry(s.user_id.to_hex())
                .or_insert_with(Vec::new)
                .push(story_response);
        }
    }

    // Convert to array of users with their stories
    let result: Vec<serde_json::Value> = stories_by_user.into_iter().map(|(user_id, stories)| {
        json!({
            "user_id": user_id,
            "username": stories[0].username.clone(),
            "avatar_url": stories[0].avatar_url.clone(),
            "stories": stories,
            "has_unviewed": stories.iter().any(|s| !s.is_viewed)
        })
    }).collect();

    Ok((StatusCode::OK, Json(result)))
}

pub async fn get_user_stories_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(user_id_str): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let target_user_id = ObjectId::parse_str(&user_id_str)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;

    let stories_collection = state.mongo.collection::<Story>("stories");
    let views_collection = state.mongo.collection::<StoryView>("story_views");

    let now = DateTime::now();
    let mut cursor = stories_collection.find(
        doc! { "user_id": target_user_id, "expires_at": { "$gt": now } },
        mongodb::options::FindOptions::builder().sort(doc! { "created_at": 1 }).build()
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut stories = Vec::new();

    while let Some(story) = cursor.next().await {
        if let Ok(s) = story {
            let story_id = s.id.unwrap();

            let view_count = views_collection.count_documents(doc! { "story_id": story_id }, None).await
                .unwrap_or(0) as usize;

            let is_viewed = views_collection.find_one(
                doc! { "story_id": story_id, "viewer_id": user.user_id },
                None
            ).await.unwrap_or(None).is_some();

            stories.push(json!({
                "id": story_id.to_hex(),
                "media_url": s.media_url,
                "media_type": s.media_type,
                "caption": s.caption,
                "created_at": s.created_at.to_chrono().to_rfc3339(),
                "view_count": view_count,
                "is_viewed": is_viewed
            }));
        }
    }

    Ok((StatusCode::OK, Json(stories)))
}

pub async fn mark_story_viewed_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(story_id_str): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let story_id = ObjectId::parse_str(&story_id_str)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid story ID"}))))?;

    let views_collection = state.mongo.collection::<StoryView>("story_views");

    // Check if already viewed
    let existing = views_collection.find_one(
        doc! { "story_id": story_id, "viewer_id": user.user_id },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    if existing.is_some() {
        return Ok((StatusCode::OK, Json(json!({"message": "Already viewed"}))));
    }

    // Record view
    let new_view = StoryView {
        id: None,
        story_id,
        viewer_id: user.user_id,
        viewed_at: DateTime::now(),
    };

    views_collection.insert_one(new_view, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({"message": "View recorded"}))))
}

pub async fn get_story_viewers_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(story_id_str): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let story_id = ObjectId::parse_str(&story_id_str)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid story ID"}))))?;

    // Verify ownership
    let stories_collection = state.mongo.collection::<Story>("stories");
    let story = stories_collection.find_one(doc! { "_id": story_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Story not found"}))))?;

    if story.user_id != user.user_id {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Not your story"}))));
    }

    let views_collection = state.mongo.collection::<StoryView>("story_views");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    let mut cursor = views_collection.find(doc! { "story_id": story_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut viewers = Vec::new();

    while let Some(view) = cursor.next().await {
        if let Ok(v) = view {
            let profile = profiles_collection.find_one(doc! { "user_id": v.viewer_id }, None).await
                .unwrap_or(None);

            let (username, avatar_url) = match profile {
                Some(p) => (p.username, p.avatar_url),
                None => ("Unknown".to_string(), None),
            };

            viewers.push(json!({
                "user_id": v.viewer_id.to_hex(),
                "username": username,
                "avatar_url": avatar_url,
                "viewed_at": v.viewed_at.to_chrono().to_rfc3339()
            }));
        }
    }

    Ok((StatusCode::OK, Json(viewers)))
}

pub fn story_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(create_story_handler).get(list_active_stories_handler))
        .route("/user/:userId", get(get_user_stories_handler))
        .route("/:id/view", post(mark_story_viewed_handler))
        .route("/:id/viewers", get(get_story_viewers_handler))
}
