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
use crate::models::{Post, Profile, Location};
use crate::auth::AuthUser;
use mongodb::{bson::doc, options::FindOptions};
use chrono::Utc;
use bson::oid::ObjectId;
use futures::stream::StreamExt;
use crate::notifications::create_notification;

// --- DTOs ---
#[derive(Deserialize)]
pub struct LocationRequest {
    pub latitude: f64,
    pub longitude: f64,
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub is_live: Option<bool>,
    #[serde(default)]
    pub duration_minutes: Option<i32>,
}

#[derive(Deserialize)]
pub struct CreatePostRequest {
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub media_urls: Vec<String>,
    #[serde(default)]
    pub post_type: String, 
    #[serde(default)]
    pub location: Option<LocationRequest>,
}

#[derive(Deserialize)]
pub struct FeedQuery {
    pub last_id: Option<String>,
    pub limit: Option<u64>,
}

#[derive(Serialize)]
pub struct FeedResponse {
    pub posts: Vec<PostResponse>,
    pub next_cursor: Option<String>,
}

#[derive(Serialize)]
pub struct PostResponse {
    pub id: String,
    pub content: String,
    pub user: String, 
    pub user_avatar: Option<String>,
    pub likes: i32,
    pub comments: i32,
    pub created_at: String,
    pub media_urls: Vec<String>,
    pub location: Option<Location>,
    pub post_type: String,
    pub is_liked: bool,
    pub group_id: Option<String>,
    pub group_name: Option<String>,
    pub group_avatar: Option<String>,
}

// --- Handlers ---
pub async fn create_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreatePostRequest>,
) ->  Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<Post>("posts");
    let users_collection = state.mongo.collection::<crate::models::User>("users");
    
    // Check verification
    let db_user = users_collection.find_one(doc! { "_id": user.user_id }, None).await.unwrap_or(None);
    if db_user.map_or(true, |u| !u.is_verified) {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Account verification required to post. Please verify your account for Ksh 20."}))));
    }

    let user_id = user.user_id; 

    let new_post = Post {
        id: None,
        user_id,
        content: Some(payload.content),
        media_urls: payload.media_urls,
        post_type: payload.post_type,
        location: payload.location.map(|l| {
            let expires_at = l.duration_minutes.map(|mins| {
                let chrono_dt = chrono::Utc::now() + chrono::Duration::minutes(mins as i64);
                mongodb::bson::DateTime::from_chrono(chrono_dt)
            });
            Location {
                latitude: l.latitude,
                longitude: l.longitude,
                label: l.label,
                is_live: l.is_live,
                expires_at,
            }
        }),
        created_at: mongodb::bson::DateTime::now(),
        likes_count: 0,
        comments_count: 0,
    };

    let result = collection
        .insert_one(new_post, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({"message": "Post created", "id": result.inserted_id.as_object_id().unwrap().to_hex()}))))
}

pub async fn get_feed_handler(
    State(state): State<Arc<AppState>>,
    user: Option<AuthUser>,
    axum::extract::Query(query): axum::extract::Query<FeedQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let limit = query.limit.unwrap_or(20) as i64;
    
    let users_groups_ids = if let Some(ref u) = user {
        let groups_collection = state.mongo.collection::<crate::models::Group>("groups");
        let cursor = groups_collection.find(
            doc! { "members": u.user_id },
            FindOptions::builder().projection(doc! { "_id": 1 }).build()
        ).await;
        
        match cursor {
            Ok(mut c) => {
                let mut ids = Vec::new();
                while let Some(Ok(doc)) = c.next().await {
                   ids.push(doc.id.unwrap()); 
                }
                ids
            },
            Err(_) => Vec::new(),
        }
    } else {
        Vec::new()
    };

    let mut posts_filter = doc! {};
    let mut gp_filter = doc! { "group_id": { "$in": &users_groups_ids } };

    if let Some(last_id_str) = query.last_id {
        if let Ok(last_oid) = ObjectId::parse_str(&last_id_str) {
             posts_filter.insert("_id", doc! { "$lt": last_oid });
             gp_filter.insert("_id", doc! { "$lt": last_oid });
        }
    }

    // 1. Fetch Global Posts
    let posts_collection = state.mongo.collection::<Post>("posts");
    let posts_cursor_result = posts_collection.find(
        posts_filter, 
        FindOptions::builder().sort(doc! { "_id": -1 }).limit(limit).build()
    ).await;

    // 2. Fetch Group Posts
    let group_posts_collection = state.mongo.collection::<crate::models::GroupPost>("group_posts");
    let gp_cursor_result = if !users_groups_ids.is_empty() {
        group_posts_collection.find(
            gp_filter,
            FindOptions::builder().sort(doc! { "_id": -1 }).limit(limit).build()
        ).await.ok()
    } else {
        None
    };

    // Collect results
    let mut all_items: Vec<(bson::DateTime, PostResponse)> = Vec::new();

    // Process Posts
    let profile_collection = state.mongo.collection::<Profile>("profiles");
    let likes_collection = state.mongo.collection::<crate::models::Like>("likes");

    if let Ok(mut cursor) = posts_cursor_result {
        while let Some(Ok(p)) = cursor.next().await {
             let profile = profile_collection.find_one(doc! { "user_id": p.user_id }, None).await.unwrap_or(None);
             let username = profile.as_ref().map(|pr| pr.username.clone()).unwrap_or_else(|| "Anonymous".to_string());
             
             let is_liked = if let Some(ref u) = user {
                likes_collection.count_documents(doc! { "post_id": p.id, "user_id": u.user_id }, None).await.unwrap_or(0) > 0
             } else { false };

             all_items.push((p.created_at, PostResponse {
                 id: p.id.unwrap().to_hex(),
                 content: p.content.unwrap_or_default(),
                 user: username,
                 user_avatar: profile.and_then(|pr| pr.avatar_url),
                 likes: p.likes_count,
                 comments: p.comments_count,
                 created_at: p.created_at.to_chrono().to_rfc3339(),
                 media_urls: p.media_urls,
                 location: p.location,
                 post_type: p.post_type,
                 is_liked,
                 group_id: None,
                 group_name: None,
                 group_avatar: None,
             }));
        }
    }

    // Process Group Posts
    if let Some(mut cursor) = gp_cursor_result {
        let groups_collection = state.mongo.collection::<crate::models::Group>("groups");
        
        while let Some(Ok(gp)) = cursor.next().await {
             let profile = profile_collection.find_one(doc! { "user_id": gp.user_id }, None).await.unwrap_or(None);
             let username = profile.as_ref().map(|pr| pr.username.clone()).unwrap_or_else(|| "Anonymous".to_string());
             
             let group = groups_collection.find_one(doc! { "_id": gp.group_id }, None).await.unwrap_or(None);
             let (g_name, g_avatar) = match group {
                 Some(g) => (Some(g.name), g.avatar_url),
                 None => (Some("Unknown Group".to_string()), None)
             };

             // Note: Likes for group posts might need a check if they share the 'likes' collection or have their own. 
             // Using 'likes' collection assuming post_id is unique across collections or we handle it. 
             // Ideally we should have a 'target_type' in likes but for now we check by ID.
             let is_liked = if let Some(ref u) = user {
                likes_collection.count_documents(doc! { "post_id": gp.id, "user_id": u.user_id }, None).await.unwrap_or(0) > 0
             } else { false };

             all_items.push((gp.created_at, PostResponse {
                 id: gp.id.unwrap().to_hex(),
                 content: gp.content,
                 user: username,
                 user_avatar: profile.and_then(|pr| pr.avatar_url),
                 likes: gp.likes_count,
                 comments: gp.comments_count,
                 created_at: gp.created_at.to_chrono().to_rfc3339(),
                 media_urls: gp.media_urls,
                 location: gp.location,
                 post_type: gp.post_type,
                 is_liked,
                 group_id: Some(gp.group_id.to_hex()),
                 group_name: g_name,
                 group_avatar: g_avatar,
             }));
        }
    }

    // Sort Descending by Date
    all_items.sort_by(|a, b| b.0.cmp(&a.0));

    // Take Limit
    let posts: Vec<PostResponse> = all_items.into_iter().take(limit as usize).map(|(_, p)| p).collect();
    let next_cursor = posts.last().map(|p| p.id.clone());

    Ok((StatusCode::OK, Json(FeedResponse { posts, next_cursor })))
}

pub async fn get_post_handler(
    State(state): State<Arc<AppState>>,
    user: Option<AuthUser>,
    Path(post_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    tracing::info!("Fetching post by ID: {}", post_id);
    let post_oid = ObjectId::parse_str(&post_id).map_err(|_| {
        tracing::error!("Invalid ObjectId format: {}", post_id);
        (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid post ID"})))
    })?;
    let collection = state.mongo.collection::<Post>("posts");
    
    let p = collection.find_one(doc! { "_id": post_oid }, None).await
        .map_err(|e| {
            tracing::error!("MongoDB Error fetching post {}: {}", post_id, e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()})))
        })?
        .ok_or_else(|| {
            tracing::warn!("Post not found in DB: {}", post_id);
            (StatusCode::NOT_FOUND, Json(json!({"error": "Post not found"})))
        })?;

    let profile_collection = state.mongo.collection::<Profile>("profiles");
    let likes_collection = state.mongo.collection::<crate::models::Like>("likes");
    
    let profile = profile_collection.find_one(doc! { "user_id": p.user_id }, None).await.unwrap_or(None);
    let username = profile.as_ref().map(|pr| pr.username.clone()).unwrap_or_else(|| "Anonymous".to_string());

    let mut is_liked = false;
    if let Some(ref u) = user {
        if let Ok(Some(_)) = likes_collection.find_one(doc! { "post_id": post_oid, "user_id": u.user_id }, None).await {
            is_liked = true;
        }
    }

    Ok((StatusCode::OK, Json(PostResponse {
        id: p.id.unwrap().to_hex(),
        content: p.content.unwrap_or_default(),
        user: username,
        user_avatar: profile.and_then(|pr| pr.avatar_url),
        likes: p.likes_count,
        comments: p.comments_count,
        created_at: p.created_at.to_chrono().to_rfc3339(),
        media_urls: p.media_urls,
        location: p.location,
        post_type: p.post_type,
        is_liked,
        group_id: None,
        group_name: None,
        group_avatar: None,
    })))
}

pub async fn like_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) ->  Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let post_oid = ObjectId::parse_str(&post_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid post ID"}))))?;
    
    let likes_collection = state.mongo.collection::<crate::models::Like>("likes");
    let posts_collection = state.mongo.collection::<Post>("posts");

    // Check if already liked
    let existing = likes_collection.find_one(doc! { "post_id": post_oid, "user_id": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    if existing.is_some() {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Already liked"}))));
    }

    let new_like = crate::models::Like {
        id: None,
        post_id: post_oid,
        user_id: user.user_id,
        created_at: mongodb::bson::DateTime::now(),
    };

    likes_collection.insert_one(new_like, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Increment like count
    posts_collection.update_one(doc! { "_id": post_oid }, doc! { "$inc": { "likes_count": 1 } }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Fetch post to find author
    if let Ok(Some(post)) = posts_collection.find_one(doc! { "_id": post_oid }, None).await {
        let _ = create_notification(
            &state,
            post.user_id,
            user.user_id,
            "like",
            Some(post_oid),
            "liked your post",
            true
        ).await;
    }

    Ok((StatusCode::OK, Json(json!({"message": "Liked"}))))
}

pub async fn unlike_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) ->  Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let post_oid = ObjectId::parse_str(&post_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid post ID"}))))?;
    
    let likes_collection = state.mongo.collection::<crate::models::Like>("likes");
    let posts_collection = state.mongo.collection::<Post>("posts");

    let result = likes_collection.delete_one(doc! { "post_id": post_oid, "user_id": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    if result.deleted_count == 0 {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Not liked yet"}))));
    }

    // Decrement like count
    posts_collection.update_one(doc! { "_id": post_oid }, doc! { "$inc": { "likes_count": -1 } }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Unliked"}))))
}

#[derive(Deserialize)]
pub struct CommentRequest {
    pub content: String,
    pub parent_comment_id: Option<String>, // Optional parent for replies
}

pub async fn add_comment_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
    Json(payload): Json<CommentRequest>,
) ->  Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let post_oid = ObjectId::parse_str(&post_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid post ID"}))))?;
    
    let comments_collection = state.mongo.collection::<crate::models::Comment>("comments");
    let profile_collection = state.mongo.collection::<Profile>("profiles");
    let posts_collection = state.mongo.collection::<Post>("posts");
    let users_collection = state.mongo.collection::<crate::models::User>("users");

    // Check verification
    let db_user = users_collection.find_one(doc! { "_id": user.user_id }, None).await.unwrap_or(None);
    if db_user.map_or(true, |u| !u.is_verified) {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Account verification required to comment. Please verify your account for Ksh 20."}))));
    }

    let profile = profile_collection.find_one(doc! { "user_id": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Profile not found"}))))?;

    // Parse parent_comment_id if provided
    let parent_oid = if let Some(parent_id) = &payload.parent_comment_id {
        Some(ObjectId::parse_str(parent_id)
            .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid parent comment ID"}))))?)
    } else {
        None
    };

    let new_comment = crate::models::Comment {
        id: None,
        post_id: post_oid,
        user_id: user.user_id,
        username: profile.username,
        content: payload.content,
        parent_comment_id: parent_oid,
        replies_count: 0,
        created_at: mongodb::bson::DateTime::now(),
    };

    comments_collection.insert_one(new_comment, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Increment comment count on post
    posts_collection.update_one(doc! { "_id": post_oid }, doc! { "$inc": { "comments_count": 1 } }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // If this is a reply, increment the parent comment's replies_count
    if let Some(parent_id) = parent_oid {
        comments_collection.update_one(
            doc! { "_id": parent_id },
            doc! { "$inc": { "replies_count": 1 } },
            None
        ).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    }

    // Trigger Notification for the post author
    if let Ok(Some(post)) = posts_collection.find_one(doc! { "_id": post_oid }, None).await {
        let _ = create_notification(
            &state,
            post.user_id,
            user.user_id,
            "comment",
            Some(post_oid),
            "commented on your post",
            true
        ).await;
    }

    Ok((StatusCode::CREATED, Json(json!({"message": "Comment added"}))))
}

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

pub async fn get_comments_handler(
    State(state): State<Arc<AppState>>,
    Path(post_id): Path<String>,
) ->  Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let post_oid = ObjectId::parse_str(&post_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid post ID"}))))?;
    
    let comments_collection = state.mongo.collection::<crate::models::Comment>("comments");

    let find_options = FindOptions::builder().sort(doc! { "created_at": 1 }).build();
    let mut cursor = comments_collection.find(doc! { "post_id": post_oid }, find_options).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut comments = Vec::new();
    while let Some(result) = cursor.next().await {
        match result {
            Ok(comment) => {
                comments.push(CommentResponse {
                    _id: comment.id.unwrap().to_hex(),
                    post_id: comment.post_id.to_hex(),
                    user_id: comment.user_id.to_hex(),
                    username: comment.username,
                    content: comment.content,
                    parent_comment_id: comment.parent_comment_id.map(|oid| oid.to_hex()),
                    replies_count: comment.replies_count,
                    created_at: comment.created_at.to_chrono().to_rfc3339(),
                });
            }
            Err(e) => return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()})))),
        }
    }

    Ok((StatusCode::OK, Json(comments)))
}

pub async fn get_trending_topics_handler(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<Post>("posts");
    
    // Aggregation to find hashtags in recent posts
    let pipeline = vec![
        doc! { "$match": { "created_at": { "$gte": mongodb::bson::DateTime::from_millis(Utc::now().timestamp_millis() - 86400000) } } }, // Last 24h
        doc! { "$project": { "words": { "$split": ["$content", " "] } } },
        doc! { "$unwind": "$words" },
        doc! { "$match": { "words": { "$regex": "^#" } } }, // Only hashtags
        doc! { "$group": { "_id": "$words", "count": { "$sum": 1 } } },
        doc! { "$sort": { "count": -1 } },
        doc! { "$limit": 5 }
    ];

    let mut cursor = collection.aggregate(pipeline, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut trending = Vec::new();
    while let Some(result) = cursor.next().await {
        if let Ok(doc) = result {
            trending.push(json!({
                "tag": doc.get_str("_id").unwrap_or_default(),
                "count": doc.get_i32("count").unwrap_or(0)
            }));
        }
    }

    Ok((StatusCode::OK, Json(trending)))
}

pub fn content_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(create_post_handler))
        .route("/feed", get(get_feed_handler))
        .route("/trending", get(get_trending_topics_handler))
        .route("/:id", get(get_post_handler))
        .route("/:id/like", post(like_post_handler).delete(unlike_post_handler))
        .route("/:id/comment", post(add_comment_handler).get(get_comments_handler))
}
