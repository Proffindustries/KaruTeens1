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
use futures::stream::StreamExt;
use crate::db::AppState;
use crate::models::{Post, Profile, Location};
use crate::auth::AuthUser;
use mongodb::{bson::doc, options::FindOptions};
use chrono::Utc;
use bson::oid::ObjectId;
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
    #[serde(default)]
    pub is_nsfw: Option<bool>,
    #[serde(default)]
    pub is_anonymous: bool,
    pub poll: Option<crate::models::Poll>,
}

#[derive(Deserialize)]
pub struct FeedQuery {
    pub last_id: Option<String>,
    pub limit: Option<u64>,
    pub feed_type: Option<String>,
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
    pub is_nsfw: Option<bool>,
    pub content_rating: Option<String>,
    pub is_saved: bool,
    pub poll: Option<crate::models::Poll>,
    pub is_anonymous: bool,
    pub algorithmic_score: f64,
}

// --- Handlers ---
pub async fn create_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreatePostRequest>,
) ->  Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<Post>("posts");
    let _users_collection = state.mongo.collection::<crate::models::User>("users");
    
    /*
    let db_user = users_collection.find_one(doc! { "_id": user.user_id }, None).await.unwrap_or(None);
    if db_user.map_or(true, |u| !u.is_verified) {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Account verification required to post. Please verify your account for Ksh 20."}))));
    }
    */
    let profiles_collection = state.mongo.collection::<crate::models::Profile>("profiles");
    let profile = profiles_collection.find_one(doc! { "user_id": user.user_id }, None).await.unwrap_or(None);
    let author_name = profile.map(|p| p.username).unwrap_or_else(|| "Anonymous".to_string());

    let user_id = user.user_id; 

    let location = payload.location.map(|l| crate::models::Location {
        latitude: l.latitude,
        longitude: l.longitude,
        label: l.label,
        is_live: l.is_live,
        expires_at: l.duration_minutes.map(|m| bson::DateTime::from_millis(Utc::now().timestamp_millis() + (m as i64 * 60000))),
    });

    let new_post = Post {
        id: None,
        title: "".to_string(),
        content: payload.content,
        excerpt: None,
        slug: "".to_string(),
        status: "published".to_string(),
        post_type: payload.post_type,
        category: "general".to_string(),
        tags: None,
        author_id: user_id,
        author_name,
        media_urls: if payload.media_urls.is_empty() { None } else { Some(payload.media_urls) },
        location,
        scheduled_publish_date: None,
        published_at: Some(mongodb::bson::DateTime::now()),
        approved_at: None,
        approved_by: None,
        rejected_at: None,
        rejected_by: None,
        rejection_reason: None,
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        reading_time: None,
        language: "en".to_string(),
        is_featured: false,
        is_premium: false,
        allow_comments: true,
        allow_sharing: true,
        seo_title: None,
        seo_description: None,
        seo_keywords: None,
        meta_data: None,
        source_url: None,
        source_author: None,
        plagiarism_score: None,
        content_rating: None,
        is_nsfw: payload.is_nsfw,
        is_anonymous: payload.is_anonymous,
        poll: payload.poll,
        created_at: mongodb::bson::DateTime::now(),
        updated_at: mongodb::bson::DateTime::now(),
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
    let _page = query.last_id.is_none().then(|| 1).unwrap_or(1);
    
    // Get user's groups in single query
    let _users_group_ids: Vec<ObjectId> = if let Some(ref u) = user {
        let groups_collection = state.mongo.collection::<crate::models::Group>("groups");
        let cursor = groups_collection.find(
            doc! { "members": u.user_id },
            FindOptions::builder()
                .projection(doc! { "_id": 1 })
                .build()
        ).await;
        
        match cursor {
            Ok(mut c) => {
                let mut ids = Vec::new();
                while let Some(Ok(group)) = c.next().await {
                    if let Some(id) = group.id {
                        ids.push(id);
                    }
                }
                ids
            },
            Err(_) => Vec::new(),
        }
    } else {
        Vec::new()
    };

    let mut filter = doc! { "status": "published" };
    
    // Add last_id for pagination
    if let Some(ref last_id_str) = query.last_id {
        if let Ok(last_oid) = ObjectId::parse_str(last_id_str) {
            filter.insert("_id", doc! { "$lt": last_oid });
        }
    }

    let posts_collection = state.mongo.collection::<Post>("posts");
    let profile_collection = state.mongo.collection::<Profile>("profiles");
    let likes_collection = state.mongo.collection::<crate::models::Like>("likes");

    // OPTIMIZED: Fetch posts
    let posts_cursor = posts_collection.find(
        filter,
        FindOptions::builder()
            .sort(doc! { "_id": -1 })
            .limit(limit + 1)
            .build()
    ).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Collect posts
    let mut all_posts = Vec::new();
    let mut cursor = posts_cursor;
    while let Some(p) = cursor.next().await {
        if let Ok(post) = p {
            all_posts.push(post);
        }
    }

    // Check if has more
    let _has_more = all_posts.len() > limit as usize;
    let posts: Vec<Post> = all_posts.into_iter().take(limit as usize).collect();

    if posts.is_empty() {
        return Ok((StatusCode::OK, Json(FeedResponse { 
            posts: vec![],
            next_cursor: None 
        })));
    }

    // OPTIMIZED: Batch fetch all author profiles in single query
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

    // Build profile lookup map
    let profile_map: std::collections::HashMap<_, _> = all_profiles
        .into_iter()
        .map(|p| (p.user_id, p))
        .collect();

    // OPTIMIZED: Batch check likes in single query
    let liked_post_ids: std::collections::HashSet<_> = if let Some(ref u) = user {
        let post_ids: Vec<ObjectId> = posts.iter().filter_map(|p| p.id).collect();
        if !post_ids.is_empty() {
            let mut all_likes = Vec::new();
            if let Ok(mut likes_cursor) = likes_collection.find(
                doc! { 
                    "user_id": u.user_id,
                    "post_id": { "$in": &post_ids }
                },
                None
            ).await {
                while let Some(l) = likes_cursor.next().await {
                    if let Ok(like) = l {
                        all_likes.push(like.post_id);
                    }
                }
            }
            all_likes.into_iter().collect()
        } else {
            std::collections::HashSet::new()
        }
    } else {
        std::collections::HashSet::new()
    };

    // Build responses
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
            is_liked: liked_post_ids.contains(&pid),
            group_id: None,
            group_name: None,
            group_avatar: None,
            is_nsfw: p.is_nsfw,
            is_anonymous: p.is_anonymous,
            content_rating: p.content_rating,
            is_saved: false, // Default to false for now, implement checking later
            poll: p.poll,
            algorithmic_score: (p.like_count as f64 * 2.0) + (p.comment_count as f64 * 3.0),
        }
    }).collect();

    let next_cursor = post_responses.last().map(|p| p.id.clone());

    Ok((StatusCode::OK, Json(FeedResponse { 
        posts: post_responses,
        next_cursor 
    })))
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
    
    let profile = profile_collection.find_one(doc! { "user_id": p.author_id }, None).await.unwrap_or(None);
    let username = profile.as_ref().map(|pr| pr.username.clone()).unwrap_or_else(|| "Anonymous".to_string());

    let mut is_liked = false;
    if let Some(ref u) = user {
        if let Ok(Some(_)) = likes_collection.find_one(doc! { "post_id": post_oid, "user_id": u.user_id }, None).await {
            is_liked = true;
        }
    }

    Ok((StatusCode::OK, Json(PostResponse {
        id: p.id.unwrap().to_hex(),
        content: p.content,
        user: username,
        user_avatar: profile.and_then(|pr| pr.avatar_url),
        likes: p.like_count,
        comments: p.comment_count,
        created_at: p.created_at.to_chrono().to_rfc3339(),
        media_urls: p.media_urls.clone().unwrap_or_default(),
        location: p.location,
        post_type: p.post_type,
        is_liked,
        group_id: None,
        group_name: None,
        group_avatar: None,
        is_nsfw: p.is_nsfw,
        is_anonymous: p.is_anonymous,
        content_rating: p.content_rating,
        is_saved: false,
        poll: p.poll,
        algorithmic_score: (p.like_count as f64 * 2.0) + (p.comment_count as f64 * 3.0),
    })))
}

pub async fn save_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) ->  Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let post_oid = ObjectId::parse_str(&post_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid post ID"}))))?;
    
    let saved_posts_collection = state.mongo.collection::<crate::models::SavedPost>("saved_posts");

    // Check if already saved
    let existing = saved_posts_collection.find_one(doc! { "post_id": post_oid, "user_id": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    if existing.is_some() {
        // Unsave
        saved_posts_collection.delete_one(doc! { "post_id": post_oid, "user_id": user.user_id }, None).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
        return Ok((StatusCode::OK, Json(json!({"message": "Unsaved", "is_saved": false}))));
    }

    // Save
    let new_saved_post = crate::models::SavedPost {
        id: None,
        post_id: post_oid,
        user_id: user.user_id,
        created_at: mongodb::bson::DateTime::now(),
    };

    saved_posts_collection.insert_one(new_saved_post, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Saved", "is_saved": true}))))
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
    posts_collection.update_one(doc! { "_id": post_oid }, doc! { "$inc": { "like_count": 1 } }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Fetch post to find author
    if let Ok(Some(post)) = posts_collection.find_one(doc! { "_id": post_oid }, None).await {
        let _ = create_notification(
            &state,
            post.author_id,
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
    posts_collection.update_one(doc! { "_id": post_oid }, doc! { "$inc": { "like_count": -1 } }, None).await
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
        content_id: post_oid,
        content_type: "post".to_string(), // Defaulting to post
        user_id: user.user_id,
        username: profile.username,
        user_avatar: profile.avatar_url,
        parent_id: parent_oid,
        content: payload.content,
        status: "approved".to_string(), // Default approved for now, or "pending" depending on logic
        spam_score: None,
        sentiment_score: None,
        reported_count: 0,
        likes: 0,
        replies_count: 0,
        edited_at: None,
        deleted_at: None,
        deleted_by: None,
        deleted_reason: None,
        moderation_notes: None,
        ip_address: None, // Could capture from request parts if available
        user_agent: None,
        is_edited: false,
        created_at: mongodb::bson::DateTime::now(),
        updated_at: mongodb::bson::DateTime::now(),
    };

    comments_collection.insert_one(new_comment, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Increment comment count on post
    posts_collection.update_one(doc! { "_id": post_oid }, doc! { "$inc": { "comment_count": 1 } }, None).await
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
            post.author_id,
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
    let mut cursor = comments_collection.find(doc! { "content_id": post_oid }, find_options).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut comments = Vec::new();
    while let Some(result) = cursor.next().await {
        match result {
            Ok(comment) => {
                comments.push(CommentResponse {
                    _id: comment.id.unwrap().to_hex(),
                    post_id: comment.content_id.to_hex(),
                    user_id: comment.user_id.to_hex(),
                    username: comment.username,
                    content: comment.content,
                    parent_comment_id: comment.parent_id.map(|oid| oid.to_hex()),
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

// --- New Handler Functions ---

pub async fn get_saved_posts_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let saved_posts_collection = state.mongo.collection::<crate::models::SavedPost>("saved_posts");
    let posts_collection = state.mongo.collection::<Post>("posts");
    let profile_collection = state.mongo.collection::<Profile>("profiles");
    let likes_collection = state.mongo.collection::<crate::models::Like>("likes");

    // Get saved posts for the user
    let mut cursor = saved_posts_collection
        .find(doc! { "user_id": user.user_id }, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut saved_post_ids = Vec::new();
    while let Some(result) = cursor.next().await {
        if let Ok(saved_post) = result {
            saved_post_ids.push(saved_post.post_id);
        }
    }

    if saved_post_ids.is_empty() {
        return Ok((StatusCode::OK, Json(json!({
            "posts": Vec::<PostResponse>::new(),
            "next_cursor": Option::<String>::None
        }))));
    }

    // Get the actual posts
    let mut cursor = posts_collection
        .find(doc! { "_id": { "$in": &saved_post_ids } }, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut posts = Vec::new();
    while let Some(result) = cursor.next().await {
        if let Ok(post) = result {
            posts.push(post);
        }
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

    let liked_post_ids: std::collections::HashSet<_> = {
        let post_ids: Vec<ObjectId> = posts.iter().filter_map(|p| p.id).collect();
        if !post_ids.is_empty() {
            let mut all_likes = Vec::new();
            if let Ok(mut likes_cursor) = likes_collection.find(
                doc! { 
                    "user_id": user.user_id,
                    "post_id": { "$in": &post_ids }
                },
                None
            ).await {
                while let Some(l) = likes_cursor.next().await {
                    if let Ok(like) = l {
                        all_likes.push(like.post_id);
                    }
                }
            }
            all_likes.into_iter().collect()
        } else {
            std::collections::HashSet::new()
        }
    };

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
            is_liked: liked_post_ids.contains(&pid),
            group_id: None,
            group_name: None,
            group_avatar: None,
            is_nsfw: p.is_nsfw,
            is_anonymous: p.is_anonymous,
            content_rating: p.content_rating,
            is_saved: true, // Since these are saved posts
            poll: p.poll,
            algorithmic_score: (p.like_count as f64 * 2.0) + (p.comment_count as f64 * 3.0),
        }
    }).collect();

    Ok((StatusCode::OK, Json(json!({
        "posts": post_responses,
        "next_cursor": post_responses.last().map(|p| p.id.clone())
    }))))
}

pub async fn get_for_you_feed_handler(
    State(state): State<Arc<AppState>>,
    user: Option<AuthUser>,
    axum::extract::Query(query): axum::extract::Query<FeedQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // For now, we'll implement a simplified version that falls back to trending
    // In a full implementation, this would prioritize followed users' posts
    
    let limit = query.limit.unwrap_or(20) as i64;
    
    // Try to get followed users' posts first if user is authenticated
    if let Some(ref auth_user) = user {
        // Get users that the current user follows
        let follows_collection = state.mongo.collection::<crate::models::Follow>("follows");
        let mut followed_ids = Vec::new();
        
        if let Ok(mut cursor) = follows_collection.find(
            doc! { "follower_id": auth_user.user_id },
            None
        ).await {
            while let Some(result) = cursor.next().await {
                if let Ok(follow) = result {
                    followed_ids.push(follow.followed_id);
                }
            }
        }
        
        if !followed_ids.is_empty() {
            // Get posts from followed users
            let posts_collection = state.mongo.collection::<Post>("posts");
            let mut filter = doc! {
                "status": "published",
                "author_id": { "$in": &followed_ids }
            };
            
            // Add last_id for pagination
            if let Some(ref last_id_str) = query.last_id {
                if let Ok(last_oid) = ObjectId::parse_str(last_id_str) {
                    filter.insert("_id", doc! { "$lt": last_oid });
                }
            }
            
            let posts_cursor = posts_collection.find(
                filter,
                FindOptions::builder()
                    .sort(doc! { "_id": -1 })
                    .limit(limit + 1)
                    .build()
            ).await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
            
            // Process posts similar to get_feed_handler
            let mut all_posts = Vec::new();
            let mut cursor = posts_cursor;
            while let Some(p) = cursor.next().await {
                if let Ok(post) = p {
                    all_posts.push(post);
                }
            }
            
            let _has_more = all_posts.len() > limit as usize;
            let posts: Vec<Post> = all_posts.into_iter().take(limit as usize).collect();
            
            if !posts.is_empty() {
                // Build responses (similar to get_feed_handler)
                let author_ids: Vec<ObjectId> = posts.iter().map(|p| p.author_id).collect();
                
                let mut all_profiles = Vec::new();
                if !author_ids.is_empty() {
                    if let Ok(mut profiles_cursor) = state.mongo.collection::<Profile>("profiles").find(
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
                
                let liked_post_ids: std::collections::HashSet<_> = {
                    let post_ids: Vec<ObjectId> = posts.iter().filter_map(|p| p.id).collect();
                    if !post_ids.is_empty() {
                        let mut all_likes = Vec::new();
                        if let Ok(mut likes_cursor) = state.mongo.collection::<crate::models::Like>("likes").find(
                            doc! { 
                                "user_id": auth_user.user_id,
                                "post_id": { "$in": &post_ids }
                            },
                            None
                        ).await {
                            while let Some(l) = likes_cursor.next().await {
                                if let Ok(like) = l {
                                    all_likes.push(like.post_id);
                                }
                            }
                        }
                        all_likes.into_iter().collect()
                    } else {
                        std::collections::HashSet::new()
                    }
                };
                
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
                        is_liked: liked_post_ids.contains(&pid),
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
                
                return Ok((StatusCode::OK, Json(json!({
                    "posts": post_responses,
                    "next_cursor": post_responses.last().map(|p| p.id.clone())
                })));
            }
        }
    }
    
    // Fall back to trending posts if no followed posts or user not authenticated
    get_trending_posts_handler(State(state), user, axum::extract::Query(query)).await
}

pub async fn get_trending_posts_handler(
    State(state): State<Arc<AppState>>,
    user: Option<AuthUser>,
    axum::extract::Query(query): axum::extract::Query<FeedQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let limit = query.limit.unwrap_or(20) as i64;
    
    // Calculate timestamp for 72 hours ago
    let seventy_two_hours_ago = chrono::Utc::now() - chrono::Duration::hours(72);
    
    let mut filter = doc! {
        "status": "published",
        "created_at": { "$gte": mongodb::bson::DateTime::from_millis(seventy_two_hours_ago.timestamp_millis()) }
    };
    
    // Add last_id for pagination
    if let Some(ref last_id_str) = query.last_id {
        if let Ok(last_oid) = ObjectId::parse_str(last_id_str) {
            filter.insert("_id", doc! { "$lt": last_oid });
        }
    }
    
    let posts_collection = state.mongo.collection::<Post>("posts");
    let profile_collection = state.mongo.collection::<Profile>("profiles");
    let likes_collection = state.mongo.collection::<crate::models::Like>("likes");
    
    // Sort by engagement (likes + comments) descending
    let posts_cursor = posts_collection.find(
        filter,
        FindOptions::builder()
            .sort(doc! { 
                "$add": ["$like_count", "$comment_count"] 
            })
            .limit(limit + 1)
            .build()
    ).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    // Collect posts
    let mut all_posts = Vec::new();
    let mut cursor = posts_cursor;
    while let Some(p) = cursor.next().await {
        if let Ok(post) = p {
            all_posts.push(post);
        }
    }
    
    // Check if has more
    let _has_more = all_posts.len() > limit as usize;
    let posts: Vec<Post> = all_posts.into_iter().take(limit as usize).collect();
    
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
    
    let liked_post_ids: std::collections::HashSet<_> = if let Some(ref u) = user {
        let post_ids: Vec<ObjectId> = posts.iter().filter_map(|p| p.id).collect();
        if !post_ids.is_empty() {
            let mut all_likes = Vec::new();
            if let Ok(mut likes_cursor) = likes_collection.find(
                doc! { 
                    "user_id": u.user_id,
                    "post_id": { "$in": &post_ids }
                },
                None
            ).await {
                while let Some(l) = likes_cursor.next().await {
                    if let Ok(like) = l {
                        all_likes.push(like.post_id);
                    }
                }
            }
            all_likes.into_iter().collect()
        } else {
            std::collections::HashSet::new()
        }
    } else {
        std::collections::HashSet::new()
    };
    
    // Build responses
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
            is_liked: liked_post_ids.contains(&pid),
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
    
    let next_cursor = post_responses.last().map(|p| p.id.clone());
    
    Ok((StatusCode::OK, Json(json!({
        "posts": post_responses,
        "next_cursor"
    }))))
}

pub async fn get_user_drafts_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let posts_collection = state.mongo.collection::<Post>("posts");
    let profile_collection = state.mongo.collection::<Profile>("profiles");
    
    // Get drafts for the user
    let mut cursor = posts_collection
        .find(
            doc! { 
                "author_id": user.user_id,
                "status": "draft"
            },
            FindOptions::builder()
                .sort(doc! { "updated_at": -1 })
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
    
    // Build responses
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
            is_liked: false, // Drafts can't be liked
            group_id: None,
            group_name: None,
            group_avatar: None,
            is_nsfw: p.is_nsfw,
            is_anonymous: p.is_anonymous,
            content_rating: p.content_rating,
            is_saved: false,
            poll: p.poll,
            algorithmic_score: 0.0, // Drafts don't have engagement yet
        }
    }).collect();
    
    Ok((StatusCode::OK, Json(json!({
        "posts": post_responses,
        "next_cursor": post_responses.last().map(|p| p.id.clone())
    }))))
}

#[derive(Deserialize)]
pub struct DraftRequest {
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub media_urls: Vec<String>,
    #[serde(default)]
    pub post_type: String, 
    #[serde(default)]
    pub location: Option<crate::content::LocationRequest>,
    #[serde(default)]
    pub is_nsfw: Option<bool>,
    #[serde(default)]
    pub is_anonymous: bool,
    pub poll: Option<crate::models::Poll>,
}

pub async fn create_draft_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<DraftRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    let posts_collection = state.mongo.collection::<Post>("posts");
    
    let profile = profiles_collection.find_one(doc! { "user_id": user.user_id }, None).await.unwrap_or(None);
    let author_name = profile.map(|p| p.username).unwrap_or_else(|| "Anonymous".to_string());
    
    let user_id = user.user_id; 
    
    let location = payload.location.map(|l| crate::models::Location {
        latitude: l.latitude,
        longitude: l.longitude,
        label: l.label,
        is_live: l.is_live,
        expires_at: l.duration_minutes.map(|m| bson::DateTime::from_millis(chrono::Utc::now().timestamp_millis() + (m as i64 * 60000))),
    });
    
    let new_post = Post {
        id: None,
        title: "".to_string(),
        content: payload.content,
        excerpt: None,
        slug: "".to_string(),
        status: "draft".to_string(),
        post_type: payload.post_type,
        category: "general".to_string(),
        tags: None,
        author_id: user_id,
        author_name,
        media_urls: if payload.media_urls.is_empty() { None } else { Some(payload.media_urls) },
        location,
        scheduled_publish_date: None,
        published_at: None,
        approved_at: None,
        approved_by: None,
        rejected_at: None,
        rejected_by: None,
        rejection_reason: None,
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        reading_time: None,
        language: "en".to_string(),
        is_featured: false,
        is_premium: false,
        allow_comments: true,
        allow_sharing: true,
        seo_title: None,
        seo_description: None,
        seo_keywords: None,
        meta_data: None,
        source_url: None,
        source_author: None,
        plagiarism_score: None,
        content_rating: None,
        is_nsfw: payload.is_nsfw,
        is_anonymous: payload.is_anonymous,
        poll: payload.poll,
        created_at: mongodb::bson::DateTime::now(),
        updated_at: mongodb::bson::DateTime::now(),
    };
    
    let result = posts_collection
        .insert_one(new_post, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    Ok((StatusCode::CREATED, Json(json!({"message": "Draft created", "id": result.inserted_id.as_object_id().unwrap().to_hex()}))))
}

pub async fn update_draft_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(draft_id): Path<String>,
    Json(payload): Json<DraftRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let draft_oid = ObjectId::parse_str(&draft_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid draft ID"}))))?;
    
    let posts_collection = state.mongo.collection::<Post>("posts");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    
    // Verify the draft belongs to the user
    let existing_draft = posts_collection.find_one(doc! { 
        "_id": draft_oid,
        "author_id": user.user_id,
        "status": "draft"
    }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Draft not found or access denied"}))))?;
    
    let profile = profiles_collection.find_one(doc! { "user_id": user.user_id }, None).await.unwrap_or(None);
    let author_name = profile.map(|p| p.username).unwrap_or_else(|| "Anonymous".to_string());
    
    let location = payload.location.map(|l| crate::models::Location {
        latitude: l.latitude,
        longitude: l.longitude,
        label: l.label,
        is_live: l.is_live,
        expires_at: l.duration_minutes.map(|m| bson::DateTime::from_millis(chrono::Utc::now().timestamp_millis() + (m as i64 * 60000))),
    });
    
    let update_doc = doc! {
        "content": payload.content,
        "media_urls": if payload.media_urls.is_empty() { None } else { Some(payload.media_urls) },
        "post_type": payload.post_type,
        "location": location,
        "is_nsfw": payload.is_nsfw,
        "is_anonymous": payload.is_anonymous,
        "poll": payload.poll,
        "updated_at": mongodb::bson::DateTime::now(),
        "author_name": author_name
    };
    
    posts_collection.update_one(
        doc! { "_id": draft_oid },
        doc! { "$set": update_doc },
        None
    ).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    Ok((StatusCode::OK, Json(json!({"message": "Draft updated"}))))
}

pub async fn delete_draft_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(draft_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let draft_oid = ObjectId::parse_str(&draft_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid draft ID"}))))?;
    
    let posts_collection = state.mongo.collection::<Post>("posts");
    
    // Verify the draft belongs to the user before deleting
    let result = posts_collection.delete_one(doc! { 
        "_id": draft_oid,
        "author_id": user.user_id,
        "status": "draft"
    }).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    if result.deleted_count == 0 {
        return Err((StatusCode::NOT_FOUND, Json(json!({"error": "Draft not found or access denied"}))));
    }
    
    Ok((StatusCode::OK, Json(json!({"message": "Draft deleted"}))))
}

pub async fn publish_draft_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(draft_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let draft_oid = ObjectId::parse_str(&draft_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid draft ID"}))))?;
    
    let posts_collection = state.mongo.collection::<Post>("posts");
    
    // Verify the draft belongs to the user
    let mut draft = posts_collection.find_one(doc! { 
        "_id": draft_oid,
        "author_id": user.user_id,
        "status": "draft"
    }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Draft not found or access denied"}))))?;
    
    // Update the draft to published
    let update_doc = doc! {
        "status": "published",
        "published_at": Some(mongodb::bson::DateTime::now()),
        "updated_at": mongodb::bson::DateTime::now()
    };
    
    posts_collection.update_one(
        doc! { "_id": draft_oid },
        doc! { "$set": update_doc },
        None
    ).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    Ok((StatusCode::OK, Json(json!({"message": "Draft published"}))))
}

pub async fn preview_draft_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(draft_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let draft_oid = ObjectId::parse_str(&draft_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid draft ID"}))))?;
    
    let posts_collection = state.mongo.collection::<Post>("posts");
    let profile_collection = state.mongo.collection::<Profile>("profiles");
    let likes_collection = state.mongo.collection::<crate::models::Like>("likes");
    
    // Verify the draft belongs to the user
    let draft = posts_collection.find_one(doc! { 
        "_id": draft_oid,
        "author_id": user.user_id,
        "status": "draft"
    }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Draft not found or access denied"}))))?;
    
    let profile = profile_collection.find_one(doc! { "user_id": draft.author_id }, None).await.unwrap_or(None);
    let username = profile.as_ref().map(|pr| pr.username.clone()).unwrap_or_else(|| "Anonymous".to_string());
    
    let mut is_liked = false;
    if let Some(_) = user {
        if let Ok(Some(_)) = likes_collection.find_one(doc! { "post_id": draft_oid, "user_id": user.user_id }, None).await {
            is_liked = true;
        }
    }
    
    Ok((StatusCode::OK, Json(PostResponse {
        id: draft.id.unwrap().to_hex(),
        content: draft.content,
        user: username,
        user_avatar: profile.and_then(|pr| pr.avatar_url),
        likes: draft.like_count,
        comments: draft.comment_count,
        created_at: draft.created_at.to_chrono().to_rfc3339(),
        media_urls: draft.media_urls.clone().unwrap_or_default(),
        location: draft.location,
        post_type: draft.post_type,
        is_liked,
        group_id: None,
        group_name: None,
        group_avatar: None,
        is_nsfw: draft.is_nsfw,
        is_anonymous: draft.is_anonymous,
        content_rating: draft.content_rating,
        is_saved: false,
        poll: draft.poll,
        algorithmic_score: (draft.like_count as f64 * 2.0) + (draft.comment_count as f64 * 3.0),
    })))
}

pub async fn delete_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let post_oid = ObjectId::parse_str(&post_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid post ID"}))))?;
    
    let posts_collection = state.mongo.collection::<Post>("posts");
    
    // Verify the post belongs to the user before deleting
    let result = posts_collection.delete_one(doc! { 
        "_id": post_oid,
        "author_id": user.user_id
    }).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    if result.deleted_count == 0 {
        return Err((StatusCode::NOT_FOUND, Json(json!({"error": "Post not found or access denied"}))));
    }
    
    // Also delete associated data (comments, likes, etc.)
    let comments_collection = state.mongo.collection::<crate::models::Comment>("comments");
    comments_collection.delete_many(doc! { "content_id": post_oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let likes_collection = state.mongo.collection::<crate::models::Like>("likes");
    likes_collection.delete_many(doc! { "post_id": post_oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    Ok((StatusCode::OK, Json(json!({"message": "Post deleted"}))))
}

pub async fn report_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let post_oid = ObjectId::parse_str(&post_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid post ID"}))))?;
    
    let posts_collection = state.mongo.collection::<Post>("posts");
    let moderation_collection = state.mongo.collection::<crate::models::ContentModeration>("content_moderation");
    
    // Verify the post exists
    let post = posts_collection.find_one(doc! { "_id": post_oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Post not found"}))))?;
    
    // Create a moderation report
    let new_report = crate::models::ContentModeration {
        id: None,
        content_id: post_oid,
        content_type: "post".to_string(),
        content_text: post.content.clone(),
        reported_by: Some(user.user_id),
        reported_reason: None, // Could be extended to accept a reason
        reported_at: Some(mongodb::bson::DateTime::now()),
        status: "reported".to_string(),
        reviewed_by: None,
        reviewed_at: None,
        review_notes: None,
        action_taken: None,
        created_at: mongodb::bson::DateTime::now(),
        updated_at: mongodb::bson::DateTime::now(),
    };
    
    moderation_collection.insert_one(new_report, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    Ok((StatusCode::OK, Json(json!({"message": "Post reported"}))))
}

pub fn content_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(create_post_handler))
        .route("/feed", get(get_feed_handler))
        .route("/for-you", get(get_for_you_feed_handler))
        .route("/trending-posts", get(get_trending_posts_handler))
        .route("/:id", get(get_post_handler))
        .route("/:id/like", post(like_post_handler).delete(unlike_post_handler))
        .route("/:id/save", post(save_post_handler))
        .route("/:id/comments", post(add_comment_handler).get(get_comments_handler))
        .route("/saved", get(get_saved_posts_handler))
        .route("/drafts", get(get_user_drafts_handler))
        .route("/drafts", post(create_draft_handler))
        .route("/drafts/:id", put(update_draft_handler))
        .route("/drafts/:id", delete(delete_draft_handler))
        .route("/drafts/:id/publish", post(publish_draft_handler))
        .route("/drafts/:id/preview", get(preview_draft_handler))
        .route("/:id", delete(delete_post_handler))
        .route("/:id/report", post(report_post_handler))
}
