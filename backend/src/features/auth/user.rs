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
use crate::features::infrastructure::db::AppState;
use crate::models::{Profile, SocialLinks, Post, Comment, Follow};
use crate::features::infrastructure::dto::{
    PostResponse, CommentResponse, ProfileResponse, UpdateProfileRequest,
    UserGamificationResponse, ProfileResponseWrapper, FeedResponse
};
use crate::features::infrastructure::error::{AppResult, AppError};
use mongodb::{bson::doc, options::FindOptions};
use crate::features::auth::auth_service::AuthUser;
use bson::oid::ObjectId;
use futures::stream::StreamExt;

// --- Handlers ---

pub async fn get_profile_handler(
    State(state): State<Arc<AppState>>,
    user_opt: Option<AuthUser>,
    Path(username): Path<String>,
) -> AppResult<impl IntoResponse> {
    let collection = state.mongo.collection::<Profile>("profiles");

    let profile = collection
        .find_one(doc! { "username": &username }, None)
        .await?
        .ok_or(AppError::NotFound("User not found".to_string()))?;

    let mut is_following = false;
    let target_user_id = profile.user_id;

    if let Some(current_user) = user_opt {
        if current_user.user_id != target_user_id {
            let follows_collection = state.mongo.collection::<Follow>("follows");
            let follow_exists = follows_collection
                .find_one(
                    doc! {
                        "follower_id": current_user.user_id,
                        "followed_id": target_user_id
                    },
                    None,
                )
                .await?;
            is_following = follow_exists.is_some();
        }
    }

    // Fetch User details for verification/premium status
    let users_collection = state.mongo.collection::<crate::models::User>("users");
    let user_doc = users_collection.find_one(doc! { "_id": target_user_id }, None).await?;

    let is_verified = user_doc.as_ref().map(|u| u.is_verified).unwrap_or(false);
    let is_premium = user_doc.as_ref().map(|u| u.is_premium).unwrap_or(false);

    // Standardize response for frontend
    let profile_resp = ProfileResponse {
        id: profile.id.map(|id| id.to_hex()),
        user_id: profile.user_id.to_hex(),
        username: profile.username,
        full_name: profile.full_name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        school: profile.school,
        year_of_study: profile.year_of_study,
        age: profile.age,
        gender: profile.gender,
        reg: profile.reg,
        quote: profile.quote,
        location: profile.location,
        social_links: profile.social_links,
        is_verified,
        is_premium,
        follower_count: profile.follower_count,
        following_count: profile.following_count,
        onboarded: profile.onboarded,
        points: profile.points,
         level: profile.level,
         created_at: profile.created_at.map(|dt| dt.to_chrono().to_rfc3339()),
         is_locked: profile.is_locked,
     };

    Ok((StatusCode::OK, Json(ProfileResponseWrapper {
        profile: profile_resp,
        is_following,
    })))
}

pub async fn get_user_gamification_handler(
    State(state): State<Arc<AppState>>,
    Path(username): Path<String>,
) -> AppResult<impl IntoResponse> {
    let collection = state.mongo.collection::<Profile>("profiles");

    let profile = collection
        .find_one(doc! { "username": username }, None)
        .await?
        .ok_or(AppError::NotFound("User not found".to_string()))?;

    // Return only the gamification fields
    Ok((StatusCode::OK, Json(UserGamificationResponse {
        points: profile.points,
        streak: profile.streak as i32,
        longest_streak: profile.longest_streak as i32,
        profile_views: profile.profile_views,
        badges: profile.badges.unwrap_or_default(),
        level: profile.level,
        next_level_points: profile.next_level_points,
    })))
}

pub async fn update_profile_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<UpdateProfileRequest>,
) -> AppResult<impl IntoResponse> {
    let collection = state.mongo.collection::<Profile>("profiles");

    let mut update_doc = doc! {};
    if let Some(f) = payload.full_name { update_doc.insert("full_name", f); }
    if let Some(b) = payload.bio { update_doc.insert("bio", b); }
    if let Some(a) = payload.avatar_url { update_doc.insert("avatar_url", a); }
    if let Some(s) = payload.school { update_doc.insert("school", s); }
    if let Some(y) = payload.year_of_study { update_doc.insert("year_of_study", y); }
    if let Some(age) = payload.age { update_doc.insert("age", age); }
    if let Some(g) = payload.gender { update_doc.insert("gender", g); }
    if let Some(reg) = payload.reg { update_doc.insert("reg", reg); }
    if let Some(q) = payload.quote { update_doc.insert("quote", q); }
    if let Some(loc) = payload.location { update_doc.insert("location", loc); }
    if let Some(l) = payload.is_locked { update_doc.insert("is_locked", l); }
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
        .await?;

    Ok((StatusCode::OK, Json(json!({"message": "Profile updated successfully"}))))
}

pub async fn mute_chat_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(chat_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let chat_oid = ObjectId::parse_str(&chat_id).map_err(|_| AppError::BadRequest("Invalid chat ID".to_string()))?;
    let collection = state.mongo.collection::<Profile>("profiles");

    collection.update_one(
        doc! { "user_id": user.user_id },
        doc! { "$addToSet": { "muted_chats": chat_oid } },
        None
    ).await?;

    Ok((StatusCode::OK, Json(json!({"message": "Chat muted"}))))
}

pub async fn unmute_chat_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(chat_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let chat_oid = ObjectId::parse_str(&chat_id).map_err(|_| AppError::BadRequest("Invalid chat ID".to_string()))?;
    let collection = state.mongo.collection::<Profile>("profiles");

    collection.update_one(
        doc! { "user_id": user.user_id },
        doc! { "$pull": { "muted_chats": chat_oid } },
        None
    ).await?;

    Ok((StatusCode::OK, Json(json!({"message": "Chat unmuted"}))))
}

pub async fn block_user_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(target_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let target_oid = ObjectId::parse_str(&target_id).map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;
    let collection = state.mongo.collection::<Profile>("profiles");

    collection.update_one(
        doc! { "user_id": user.user_id },
        doc! { "$addToSet": { "blocked_users": target_oid } },
        None
    ).await?;

    Ok((StatusCode::OK, Json(json!({"message": "User blocked"}))))
}

pub async fn unblock_user_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(target_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let target_oid = ObjectId::parse_str(&target_id).map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;
    let collection = state.mongo.collection::<Profile>("profiles");

    collection.update_one(
        doc! { "user_id": user.user_id },
        doc! { "$pull": { "blocked_users": target_oid } },
        None
    ).await?;

    Ok((StatusCode::OK, Json(json!({"message": "User unblocked"}))))
}

pub async fn get_user_posts_handler(
    State(state): State<Arc<AppState>>,
    Path(user_id_or_username): Path<String>,
) -> AppResult<impl IntoResponse> {
    let user_oid = match ObjectId::parse_str(&user_id_or_username) {
        Ok(oid) => oid,
        Err(_) => {
            // If it's not a valid ObjectId, assume it's a username
            let profiles_collection = state.mongo.collection::<Profile>("profiles");
            let profile = profiles_collection
                .find_one(doc! { "username": &user_id_or_username }, None)
                .await?
                .ok_or(AppError::NotFound("User not found".to_string()))?;
            profile.user_id
        }
    };
    
    let posts_collection = state.mongo.collection::<Post>("posts");
    
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
        .await?;
    
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
    
    // Build responses using helper
    let post_responses: Vec<crate::features::infrastructure::dto::PostResponse> = crate::features::content::posts_to_responses(&state, None, posts).await;
    
    Ok((StatusCode::OK, Json(json!({
        "posts": post_responses,
        "next_cursor": post_responses.last().map(|p| p.id.clone())
    }))))
}

pub async fn get_user_comments_handler(
    State(state): State<Arc<AppState>>,
    Path(user_id_or_username): Path<String>,
) -> AppResult<impl IntoResponse> {
    let user_oid = match ObjectId::parse_str(&user_id_or_username) {
        Ok(oid) => oid,
        Err(_) => {
            // If it's not a valid ObjectId, assume it's a username
            let profiles_collection = state.mongo.collection::<Profile>("profiles");
            let profile = profiles_collection
                .find_one(doc! { "username": &user_id_or_username }, None)
                .await?
                .ok_or(AppError::NotFound("User not found".to_string()))?;
            profile.user_id
        }
    };
    
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
        .await?;
    
    let mut comments = Vec::new();
    while let Some(result) = cursor.next().await {
        if let Ok(comment) = result {
            comments.push(comment);
        }
    }
    
    if comments.is_empty() {
        return Ok((StatusCode::OK, Json(json!({
            "comments": Vec::<CommentResponse>::new(),
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
                    if let Some(id) = post.id {
                        posts_map.insert(id, post);
                    }
                }
            }
        }
    }
    
    // Build comment responses
    let comment_responses: Vec<CommentResponse> = comments.into_iter().map(|comment| {
        let post = posts_map.get(&comment.content_id);
        let post_id_str = post.map(|p| p.id.unwrap().to_hex()).unwrap_or_else(|| "unknown".to_string());
        
        CommentResponse {
            id: comment.id.unwrap().to_hex(),
            content_id: post_id_str,
            content_type: comment.content_type,
            user_id: comment.user_id.to_hex(),
            username: comment.username,
            user_avatar: comment.user_avatar,
            parent_id: comment.parent_id.map(|oid| oid.to_hex()),
            content: comment.content,
            media_url: comment.media_url,
            media_type: comment.media_type,
            status: comment.status,
            spam_score: comment.spam_score,
            sentiment_score: comment.sentiment_score,
            reported_count: comment.reported_count,
            likes: comment.likes,
            replies_count: comment.replies_count,
            edited_at: comment.edited_at.map(|dt| dt.to_chrono().to_rfc3339()),
            deleted_at: comment.deleted_at.map(|dt| dt.to_chrono().to_rfc3339()),
            deleted_by: comment.deleted_by.map(|oid| oid.to_hex()),
            deleted_reason: comment.deleted_reason,
            moderation_notes: comment.moderation_notes,
            ip_address: comment.ip_address,
            user_agent: comment.user_agent,
            is_edited: comment.is_edited,
            created_at: comment.created_at.to_chrono().to_rfc3339(),
            updated_at: comment.updated_at.to_chrono().to_rfc3339(),
            reports: None,
            moderation_history: None,
        }
    }).collect();
    
    Ok((StatusCode::OK, Json(json!({
        "comments": comment_responses,
        "next_cursor": comment_responses.last().map(|c| c.id.clone())
    }))))
}

pub async fn follow_user_by_username_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(username): Path<String>,
) -> AppResult<impl IntoResponse> {
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    let users_collection = state.mongo.collection::<crate::models::User>("users");
    
    let target_profile = profiles_collection.find_one(doc! { "username": &username }, None).await?
        .ok_or(AppError::NotFound("User not found".to_string()))?;
    
    let target_user_id = target_profile.user_id;
    
    if target_user_id == user.user_id {
        return Err(AppError::BadRequest("Cannot follow yourself".to_string()));
    }
    
    let target_exists = users_collection.find_one(doc! { "_id": target_user_id }, None).await?
        .is_some();
    
    if !target_exists {
        return Err(AppError::NotFound("User not found".to_string()));
    }
    
    let follows_collection = state.mongo.collection::<Follow>("follows");
    
    let existing_follow = follows_collection.find_one(doc! { 
        "follower_id": user.user_id,
        "followed_id": target_user_id
    }, None).await?;
    
    if existing_follow.is_some() {
        return Err(AppError::Conflict("Already following this user".to_string()));
    }
    
    let follow = Follow {
        id: None,
        follower_id: user.user_id,
        followed_id: target_user_id,
        created_at: bson::DateTime::now(),
    };
    
    follows_collection.insert_one(follow, None).await?;
    
    // Update counts
    let _ = profiles_collection.update_one(
        doc! { "user_id": target_user_id },
        doc! { "$inc": { "follower_count": 1 } },
        None
    ).await;
    
    let _ = profiles_collection.update_one(
        doc! { "user_id": user.user_id },
        doc! { "$inc": { "following_count": 1 } },
        None
    ).await;
    
    // Notify
    let state_clone = state.clone();
    let follower_id = user.user_id;
    let followed_id = target_user_id;
    let follower_name = target_profile.username; // This is actually the target username, wait...
    
    // Get follower profile
    if let Ok(Some(follower_prof)) = profiles_collection.find_one(doc! { "user_id": follower_id }, None).await {
        let fname = follower_prof.username;
        tokio::spawn(async move {
            let _ = crate::features::infrastructure::push::notify_new_follower(&state_clone, followed_id, follower_id, fname).await;
        });
    }
    
    Ok((StatusCode::CREATED, Json(json!({"message": "User followed successfully"}))))
}

pub async fn unfollow_user_by_username_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(username): Path<String>,
) -> AppResult<impl IntoResponse> {
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    
    let target_profile = profiles_collection.find_one(doc! { "username": &username }, None).await?
        .ok_or(AppError::NotFound("User not found".to_string()))?;
    
    let target_user_id = target_profile.user_id;
    
    let follows_collection = state.mongo.collection::<Follow>("follows");
    
    let result = follows_collection.delete_one(doc! { 
        "follower_id": user.user_id,
        "followed_id": target_user_id
    }, None).await?;
    
    if result.deleted_count == 0 {
        return Err(AppError::NotFound("Not following this user".to_string()));
    }
    
    let _ = profiles_collection.update_one(
        doc! { "user_id": target_user_id },
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
