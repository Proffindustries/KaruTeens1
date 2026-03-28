use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{delete, get, post},
    Router,
};
use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use crate::db::AppState;
use crate::auth::AuthUser;
use crate::models::{Profile, Follow};
use mongodb::bson::doc;
use bson::oid::ObjectId;
use futures::StreamExt;

// --- DTOs ---
#[derive(Deserialize)]
pub struct FollowRequest {
    pub target_username: String,
}

// --- Handlers ---
pub async fn follow_user_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(target_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let target_oid = ObjectId::parse_str(&target_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;
    
    if target_oid == user.user_id {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Cannot follow yourself"}))));
    }
    
    let follows_collection = state.mongo.collection::<Follow>("follows");
    let users_collection = state.mongo.collection::<crate::models::User>("users");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    
    // Check if target user exists
    let target_exists = users_collection.find_one(doc! { "_id": target_oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .is_some();

    if !target_exists {
        return Err((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))));
    }
    
    let existing_follow = follows_collection.find_one(doc! { 
        "follower_id": user.user_id,
        "followed_id": target_oid
    }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    if existing_follow.is_some() {
        return Err((StatusCode::CONFLICT, Json(json!({"error": "Already following this user"}))));
    }
    
    let follow = Follow {
        id: None,
        follower_id: user.user_id,
        followed_id: target_oid,
        created_at: bson::DateTime::now(),
    };
    
    follows_collection.insert_one(follow, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    // Denormalized counts - increments
    let _ = profiles_collection.update_one(
        doc! { "user_id": target_oid },
        doc! { "$inc": { "follower_count": 1 } },
        None
    ).await;
    
    let _ = profiles_collection.update_one(
        doc! { "user_id": user.user_id },
        doc! { "$inc": { "following_count": 1 } },
        None
    ).await;
    
    // Notification logic
    if let Ok(Some(follower_profile)) = profiles_collection.find_one(doc! { "user_id": user.user_id }, None).await {
        let follower_name = if follower_profile.username.is_empty() {
            "Unknown".to_string()
        } else {
            follower_profile.username.clone()
        };
        
        let state_clone = state.clone();
        let follower_id = user.user_id;
        let followed_id = target_oid;
        tokio::spawn(async move {
            let _ = crate::push::notify_new_follower(&state_clone, followed_id, follower_id, follower_name).await;
        });
    }
    
    Ok((StatusCode::CREATED, Json(json!({"message": "User followed successfully"}))))
}

pub async fn unfollow_user_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(target_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let target_oid = ObjectId::parse_str(&target_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;
    
    let follows_collection = state.mongo.collection::<Follow>("follows");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    
    let result = follows_collection.delete_one(doc! { 
        "follower_id": user.user_id,
        "followed_id": target_oid
    }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    if result.deleted_count == 0 {
        return Err((StatusCode::NOT_FOUND, Json(json!({"error": "Not following this user"}))));
    }
    
    // Decrement counts
    let _ = profiles_collection.update_one(
        doc! { "user_id": target_oid },
        doc! { "$inc": { "follower_count": -1 } },
        None
    ).await;
    
    let _ = profiles_collection.update_one(
        doc! { "user_id": user.user_id },
        doc! { "$inc": { "following_count": -1 } },
        None
    ).await;
    
    Ok((StatusCode::OK, Json(json!({"message": "User unfollowed successfully"}))))
}

pub async fn get_followers_handler(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&user_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;
    
    let limit = params.get("limit").and_then(|v| v.parse::<i64>().ok()).unwrap_or(20);
    let skip = params.get("skip").and_then(|v| v.parse::<i64>().ok()).unwrap_or(0);
    
    let follows_collection = state.mongo.collection::<Follow>("follows");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    
    let find_options = mongodb::options::FindOptions::builder()
        .skip(Some(skip as u64))
        .limit(Some(limit))
        .sort(doc! { "created_at": -1 })
        .build();

    let mut cursor = follows_collection.find(doc! { "followed_id": oid }, find_options).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let mut follows = Vec::new();
    while let Some(Ok(follow)) = cursor.next().await {
        follows.push(follow);
    }
    
    // Batch fetch profiles to avoid N+1
    let follower_ids: Vec<ObjectId> = follows.iter().map(|f| f.follower_id).collect();
    let mut profile_map = HashMap::new();
    
    if !follower_ids.is_empty() {
        let mut profile_cursor = profiles_collection.find(doc! { "user_id": { "$in": follower_ids } }, None).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
        
        while let Some(Ok(profile)) = profile_cursor.next().await {
            profile_map.insert(profile.user_id, profile);
        }
    }
    
    let followers = follows.into_iter().map(|f| {
        let profile = profile_map.get(&f.follower_id);
        json!({
            "id": f.follower_id.to_hex(),
            "username": profile.map(|p| p.username.clone()).unwrap_or_else(|| "Unknown".to_string()),
            "avatar_url": profile.and_then(|p| p.avatar_url.clone()),
            "followed_at": f.created_at.to_chrono().to_rfc3339()
        })
    }).collect::<Vec<_>>();
    
    let total_count = follows_collection.count_documents(doc! { "followed_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    Ok((StatusCode::OK, Json(json!({
        "followers": followers,
        "pagination": {
            "total": total_count,
            "limit": limit,
            "skip": skip,
            "has_more": (skip + limit) < total_count as i64
        }
    }))))
}

pub async fn get_following_handler(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&user_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;
    
    let limit = params.get("limit").and_then(|v| v.parse::<i64>().ok()).unwrap_or(20);
    let skip = params.get("skip").and_then(|v| v.parse::<i64>().ok()).unwrap_or(0);
    
    let follows_collection = state.mongo.collection::<Follow>("follows");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    
    let find_options = mongodb::options::FindOptions::builder()
        .skip(Some(skip as u64))
        .limit(Some(limit))
        .sort(doc! { "created_at": -1 })
        .build();

    let mut cursor = follows_collection.find(doc! { "follower_id": oid }, find_options).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let mut follows = Vec::new();
    while let Some(Ok(follow)) = cursor.next().await {
        follows.push(follow);
    }
    
    // Batch fetch profiles to avoid N+1
    let followed_ids: Vec<ObjectId> = follows.iter().map(|f| f.followed_id).collect();
    let mut profile_map = HashMap::new();
    
    if !followed_ids.is_empty() {
        let mut profile_cursor = profiles_collection.find(doc! { "user_id": { "$in": followed_ids } }, None).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
        
        while let Some(Ok(profile)) = profile_cursor.next().await {
            profile_map.insert(profile.user_id, profile);
        }
    }
    
    let following = follows.into_iter().map(|f| {
        let profile = profile_map.get(&f.followed_id);
        json!({
            "id": f.followed_id.to_hex(),
            "username": profile.map(|p| p.username.clone()).unwrap_or_else(|| "Unknown".to_string()),
            "avatar_url": profile.and_then(|p| p.avatar_url.clone()),
            "followed_at": f.created_at.to_chrono().to_rfc3339()
        })
    }).collect::<Vec<_>>();
    
    let total_count = follows_collection.count_documents(doc! { "follower_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    Ok((StatusCode::OK, Json(json!({
        "following": following,
        "pagination": {
            "total": total_count,
            "limit": limit,
            "skip": skip,
            "has_more": (skip + limit) < total_count as i64
        }
    }))))
}

pub fn follows_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/follow/:target_id", post(follow_user_handler))
        .route("/unfollow/:target_id", delete(unfollow_user_handler))
        .route("/followers/:user_id", get(get_followers_handler))
        .route("/following/:user_id", get(get_following_handler))
}