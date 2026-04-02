use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, put, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use crate::db::AppState;
use crate::models::{Profile, SocialLinks, Post, Comment};
use mongodb::{bson::doc, options::FindOptions};
use crate::auth::AuthUser;
use bson::oid::ObjectId;
use futures::stream::StreamExt;

// CommentResponse struct for returning comment data
#[derive(Serialize)]
pub struct CommentResponse {
    pub _id: String,
    pub post_id: String,
    pub user_id: String,
    pub username: String,
    pub content: String,
    pub parent_comment_id: Option<String>,
    pub replies_count: i32,
    pub created_at: String,
}

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
    pub onboarded: Option<bool>,
    pub interests: Option<Vec<String>>,
    pub notification_settings: Option<crate::models::NotificationSettings>,
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

pub async fn get_user_gamification_handler(
    State(state): State<Arc<AppState>>,
    Path(username): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<Profile>("profiles");

    let profile = collection
        .find_one(doc! { "username": username }, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    match profile {
        Some(p) => {
            // Return only the gamification fields
            let gamification = serde_json::json!({
                "points": p.points,
                "streak": p.streak,
                "longestStreak": p.longest_streak,
                "profileViews": p.profile_views,
                "badges": p.badges,
                "level": p.level,
                "nextLevelPoints": p.next_level_points
            });
            Ok((StatusCode::OK, Json(gamification)))
        }
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
    if let Some(ob) = payload.onboarded { update_doc.insert("onboarded", ob); }
    if let Some(it) = payload.interests {
        if let Ok(it_bson) = mongodb::bson::to_bson(&it) {
            update_doc.insert("interests", it_bson);
        }
    }
    if let Some(ns) = payload.notification_settings {
        if let Ok(ns_bson) = mongodb::bson::to_bson(&ns) {
            update_doc.insert("notification_settings", ns_bson);
        }
    }
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

// New handlers for user posts and comments
pub async fn get_user_posts_handler(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let user_oid = ObjectId::parse_str(&user_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;
    
    let posts_collection = state.mongo.collection::<Post>("posts");
    let profile_collection = state.mongo.collection::<Profile>("profiles");
    let likes_collection = state.mongo.collection::<crate::models::Like>("likes");
    
    // Get user's published posts
    let mut cursor = posts_collection
        .find(
            doc! { 
                "author_id": user_oid,
                "status": "published"
            },
            FindOptions::builder()
                .sort(doc! { "created_at": -1 })
                .build()
        )
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let mut posts = Vec::new();
    while let Some(result) = cursor.next().await {
        if let Ok(post) = result {
            posts.push(post);
        }
    }
    
    if posts.is_empty() {
        return Ok((StatusCode::OK, Json(json!({
            "posts": Vec::<PostResponse>::new(),
            "next_cursor": Option::<String>::None
        }))));
    }
    
    // Build responses (similar to get_feed_handler)
    let author_ids: Vec<ObjectId> = posts.iter().map(|p| p.author_id).collect();
    
    let mut all_profiles = Vec::new();
    if !author_ids.is_empty() {
        if let Ok(mut profiles_cursor) = profile_collection.find(
            doc! { "user_id": { "$in": &author_ids } },
            FindOptions::builder()
                .projection(doc! {
                    "user_id": 1,
                    "username": 1,
                    "avatar_url": 1
                })
                .build()
        ).await {
            while let Some(p) = profiles_cursor.next().await {
                if let Ok(profile) = p {
                    all_profiles.push(profile);
                }
            }
        }
    }
    
    let profile_map: std::collections::HashMap<_, _> = all_profiles
        .into_iter()
        .map(|p| (p.user_id, p))
        .collect();
    
    // For simplicity, we're not checking likes here since it's a public endpoint
    // In a real implementation, you might want to check if the requesting user has liked these posts
    
    let post_responses: Vec<PostResponse> = posts.into_iter().map(|p| {
        let profile = profile_map.get(&p.author_id);
        let pid = p.id.unwrap();
        
        PostResponse {
            id: pid.to_hex(),
            content: p.content,
            user: profile.map(|pr| pr.username.clone()).unwrap_or_else(|| "Anonymous".to_string()),
            user_avatar: profile.and_then(|pr| pr.avatar_url.clone()),
            likes: p.like_count,
            comments: p.comment_count,
            created_at: p.created_at.to_chrono().to_rfc3339(),
            media_urls: p.media_urls.unwrap_or_default(),
            location: p.location,
            post_type: p.post_type,
            is_liked: false, // Simplified for public endpoint
            group_id: None,
            group_name: None,
            group_avatar: None,
            is_nsfw: p.is_nsfw,
            is_anonymous: p.is_anonymous,
            content_rating: p.content_rating,
            is_saved: false,
            poll: p.poll,
            algorithmic_score: (p.like_count as f64 * 2.0) + (p.comment_count as f64 * 3.0),
        }
    }).collect();
    
    Ok((StatusCode::OK, Json(json!({
        "posts": post_responses,
        "next_cursor": post_responses.last().map(|p| p.id.clone())
    }))))
}

pub async fn get_user_comments_handler(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let user_oid = ObjectId::parse_str(&user_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;
    
    let comments_collection = state.mongo.collection::<Comment>("comments");
    let posts_collection = state.mongo.collection::<Post>("posts");
    
    // Get comments by the user
    let mut cursor = comments_collection
        .find(
            doc! { "user_id": user_oid },
            FindOptions::builder()
                .sort(doc! { "created_at": -1 })
                .build()
        )
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let mut comments = Vec::new();
    while let Some(result) = cursor.next().await {
        if let Ok(comment) = result {
            comments.push(comment);
        }
    }
    
    if comments.is_empty() {
        return Ok((StatusCode::OK, Json(json!({
            "comments": Vec::<Comment>::new(),
            "next_cursor": Option::<String>::None
        }))));
    }
    
    // Get post IDs to fetch post info
    let post_ids: Vec<ObjectId> = comments.iter().map(|c| c.content_id).collect();
    
    let mut posts_map = std::collections::HashMap::new();
    if !post_ids.is_empty() {
        if let Ok(mut posts_cursor) = posts_collection.find(
            doc! { "_id": { "$in": &post_ids } },
            None
        ).await {
            while let Some(post_result) = posts_cursor.next().await {
                if let Ok(post) = post_result {
                    posts_map.insert(post.id.unwrap(), post);
                }
            }
        }
    }
    
    // Build comment responses
    let comment_responses: Vec<CommentResponse> = comments.into_iter().map(|comment| {
        let post = posts_map.get(&comment.content_id);
        let post_id_str = post.map(|p| p.id.unwrap().to_hex()).unwrap_or_else(|| "unknown".to_string());
        
        CommentResponse {
            _id: comment.id.unwrap().to_hex(),
            post_id: post_id_str,
            user_id: comment.user_id.to_hex(),
            username: comment.username,
            content: comment.content,
            parent_comment_id: comment.parent_id.map(|oid| oid.to_hex()),
            replies_count: comment.replies_count,
            created_at: comment.created_at.to_chrono().to_rfc3339(),
        }
    }).collect();
    
    Ok((StatusCode::OK, Json(json!({
        "comments": comment_responses,
        "next_cursor": comment_responses.last().map(|c| c._id.clone())
    }))))
}

// New handlers for follow/unfollow by username
pub async fn follow_user_by_username_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(username): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // Get the target user's profile by username
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    let users_collection = state.mongo.collection::<crate::models::User>("users");
    
    let target_profile = profiles_collection.find_one(doc! { "username": username }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))))?;
    
    let target_user_id = target_profile.user_id;
    
    // Prevent self-follow
    if target_user_id == user.user_id {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Cannot follow yourself"}))));
    }
    
    // Check if target user exists in users collection
    let target_exists = users_collection.find_one(doc! { "_id": target_user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .is_some();
    
    if !target_exists {
        return Err((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))));
    }
    
    // Use the existing follow logic from follows.rs but with the target ID we found
    let follows_collection = state.mongo.collection::<Follow>("follows");
    let profiles_collection_for_update = state.mongo.collection::<Profile>("profiles");
    
    let existing_follow = follows_collection.find_one(doc! { 
        "follower_id": user.user_id,
        "followed_id": target_user_id
    }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    if existing_follow.is_some() {
        return Err((StatusCode::CONFLICT, Json(json!({"error": "Already following this user"}))));
    }
    
    let follow = Follow {
        id: None,
        follower_id: user.user_id,
        followed_id: target_user_id,
        created_at: bson::DateTime::now(),
    };
    
    follows_collection.insert_one(follow, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    // Update follower/following counts
    let _ = profiles_collection_for_update.update_one(
        doc! { "user_id": target_user_id },
        doc! { "$inc": { "follower_count": 1 } },
        None
    ).await;
    
    let _ = profiles_collection_for_update.update_one(
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
        let followed_id = target_user_id;
        tokio::spawn(async move {
            let _ = crate::push::notify_new_follower(&state_clone, followed_id, follower_id, follower_name).await;
        });
    }
    
    Ok((StatusCode::CREATED, Json(json!({"message": "User followed successfully"}))))
}

pub async fn unfollow_user_by_username_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(username): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // Get the target user's profile by username
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    let users_collection = state.mongo.collection::<crate::models::User>("users");
    
    let target_profile = profiles_collection.find_one(doc! { "username": username }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))))?;
    
    let target_user_id = target_profile.user_id;
    
    // Check if target user exists in users collection
    let target_exists = users_collection.find_one(doc! { "_id": target_user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .is_some();
    
    if !target_exists {
        return Err((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))));
    }
    
    // Use the existing unfollow logic from follows.rs but with the target ID we found
    let follows_collection = state.mongo.collection::<Follow>("follows");
    let profiles_collection_for_update = state.mongo.collection::<Profile>("profiles");
    
    let result = follows_collection.delete_one(doc! { 
        "follower_id": user.user_id,
        "followed_id": target_user_id
    }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    if result.deleted_count == 0 {
        return Err((StatusCode::NOT_FOUND, Json(json!({"error": "Not following this user"}))));
    }
    
    // Update follower/following counts
    let _ = profiles_collection_for_update.update_one(
        doc! { "user_id": target_user_id },
        doc! { "$inc": { "follower_count": -1 } },
        None
    ).await;
    
    let _ = profiles_collection_for_update.update_one(
        doc! { "user_id": user.user_id },
        doc! { "$inc": { "following_count": -1 } },
        None
    ).await;
    
    Ok((StatusCode::OK, Json(json!({"message": "User unfollowed successfully"}))))
}

pub fn user_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/:username", get(get_profile_handler))
        .route("/:username/gamification", get(get_user_gamification_handler))
        .route("/:userId/posts", get(get_user_posts_handler))
        .route("/:userId/comments", get(get_user_comments_handler))
        .route("/:username/follow", post(follow_user_by_username_handler))
        .route("/:username/unfollow", post(unfollow_user_by_username_handler))
        .route("/update", put(update_profile_handler))
        .route("/chat/:id/mute", post(mute_chat_handler).delete(unmute_chat_handler))
        .route("/block/:id", post(block_user_handler).delete(unblock_user_handler))
}
