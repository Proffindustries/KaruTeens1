pub mod posts;
pub mod comments;
pub mod stories;
pub mod reels;
pub mod playlist;

use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post, put, delete},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use futures::stream::StreamExt;
use crate::features::infrastructure::db::AppState;
use crate::models::{Post, Profile, Location, ContentModeration};
use crate::features::infrastructure::dto::{PostResponse, FeedResponse, CommentResponse, ReportPostRequest};
use crate::features::infrastructure::error::{AppResult, AppError};
use crate::features::auth::auth_service::AuthUser;
use mongodb::{bson::{doc, Bson}, options::FindOptions};
use chrono::Utc;
use bson::oid::ObjectId;
use crate::features::social::notifications::create_notification;

// --- DTOs ---
#[derive(Deserialize, Serialize)]
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
    pub group_id: Option<String>,
    pub page_id: Option<String>,
}

#[derive(Deserialize)]
pub struct FeedQuery {
    pub last_id: Option<String>,
    pub limit: Option<u64>,
    pub feed_type: Option<String>,
    pub group_id: Option<String>,
    pub page_id: Option<String>,
    pub search: Option<String>,
}

// --- Helper Functions ---
pub async fn posts_to_responses(
    state: &Arc<AppState>,
    user: Option<&AuthUser>,
    posts: Vec<Post>,
) -> Vec<PostResponse> {
    if posts.is_empty() {
        return vec![];
    }

    let profile_collection = state.mongo.collection::<Profile>("profiles");
    let likes_collection = state.mongo.collection::<crate::models::Like>("likes");
    let saved_posts_collection = state.mongo.collection::<crate::models::SavedPost>("saved_posts");

    // Batch fetch all author profiles in single query
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

    // Check likes and saved status in batch if user is authenticated
    let mut liked_post_ids = std::collections::HashSet::new();
    let mut saved_post_ids = std::collections::HashSet::new();

    if let Some(auth_user) = user {
        let post_ids: Vec<ObjectId> = posts.iter().filter_map(|p| p.id).collect();
        if !post_ids.is_empty() {
            // Check likes
            if let Ok(mut likes_cursor) = likes_collection.find(
                doc! { 
                    "user_id": auth_user.user_id,
                    "post_id": { "$in": &post_ids }
                },
                None
            ).await {
                while let Some(l) = likes_cursor.next().await {
                    if let Ok(like) = l {
                        liked_post_ids.insert(like.post_id);
                    }
                }
            }

            // Check saved status
            if let Ok(mut saved_cursor) = saved_posts_collection.find(
                doc! { 
                    "user_id": auth_user.user_id,
                    "post_id": { "$in": &post_ids }
                },
                None
            ).await {
                while let Some(s) = saved_cursor.next().await {
                    if let Ok(saved) = s {
                        saved_post_ids.insert(saved.post_id);
                    }
                }
            }
        }
    }

    // Fetch group information for posts that belong to a group
    let mut group_map = std::collections::HashMap::new();
    let group_ids: Vec<ObjectId> = posts.iter().filter_map(|p| p.group_id).collect();
    if !group_ids.is_empty() {
        let groups_collection = state.mongo.collection::<crate::models::Group>("groups");
        if let Ok(mut groups_cursor) = groups_collection.find(
            doc! { "_id": { "$in": &group_ids } },
            None
        ).await {
            while let Some(g) = groups_cursor.next().await {
                if let Ok(group) = g {
                    if let Some(id) = group.id {
                        group_map.insert(id, group);
                    }
                }
            }
        }
    }

    // Fetch page information
    let mut page_map = std::collections::HashMap::new();
    let p_ids: Vec<ObjectId> = posts.iter().filter_map(|p| p.page_id).collect();
    if !p_ids.is_empty() {
        let pages_collection = state.mongo.collection::<crate::models::Page>("pages");
        if let Ok(mut pages_cursor) = pages_collection.find(doc! { "_id": { "$in": &p_ids } }, None).await {
            while let Some(Ok(page)) = pages_cursor.next().await {
                 if let Some(id) = page.id {
                     page_map.insert(id, page);
                 }
            }
        }
    }

    // Build responses
    posts.into_iter().map(|p| {
        let profile = profile_map.get(&p.author_id);
        let pid = p.id.expect("Post should have an ID");
        
        PostResponse {
            id: pid.to_hex(),
            content: p.content,
            user: profile.map(|pr| pr.username.clone()).unwrap_or_else(|| "Anonymous".to_string()),
            user_avatar: profile.and_then(|pr| pr.avatar_url.clone()),
            likes: p.like_count,
            comments: p.comment_count,
            created_at: p.created_at.to_chrono().to_rfc3339(),
            media_urls: Some(p.media_urls.unwrap_or_default()),
            location: p.location.as_ref().and_then(|loc| loc.label.clone()),
            post_type: p.post_type,
            is_liked: liked_post_ids.contains(&pid),
            group_id: p.group_id.map(|id| id.to_hex()),
            group_name: p.group_id.and_then(|id| group_map.get(&id).map(|g| g.name.clone())),
            group_avatar: p.group_id.and_then(|id| group_map.get(&id).and_then(|g| g.avatar_url.clone())),
            page_id: p.page_id.map(|id| id.to_hex()),
            page_name: p.page_id.and_then(|id| page_map.get(&id).map(|g| g.name.clone())),
            page_avatar: p.page_id.and_then(|id| page_map.get(&id).and_then(|g| g.avatar_url.clone())),
            is_nsfw: p.is_nsfw.unwrap_or(false),
            is_anonymous: p.is_anonymous,
            content_rating: p.content_rating,
            is_saved: saved_post_ids.contains(&pid),
            poll: p.poll.map(|p| serde_json::to_value(p).unwrap_or(serde_json::Value::Null)),
            engagement_score: (p.like_count as f64 * 2.0) + (p.comment_count as f64 * 3.0),
        }
    }).collect()
}

// --- Handlers ---
pub async fn create_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreatePostRequest>,
) ->  AppResult<impl IntoResponse> {
    let collection = state.mongo.collection::<Post>("posts");
    
    let profiles_collection = state.mongo.collection::<crate::models::Profile>("profiles");
    let profile = profiles_collection.find_one(doc! { "user_id": user.user_id }, None).await
        .map_err(AppError::from)?;
    
    let author_name = profile.map(|p| p.username).unwrap_or_else(|| "Anonymous".to_string());

    let user_id = user.user_id; 

    let location = payload.location.map(|l| crate::models::Location {
        latitude: l.latitude,
        longitude: l.longitude,
        label: l.label,
        is_live: l.is_live,
        expires_at: l.duration_minutes.map(|m| bson::DateTime::from_millis(Utc::now().timestamp_millis() + (m as i64 * 60000))),
    });

    let group_id = if let Some(ref gid) = payload.group_id {
        ObjectId::parse_str(gid).ok()
    } else {
        None
    };

    let page_id = if let Some(ref pid) = payload.page_id {
        let oid = ObjectId::parse_str(pid).map_err(|_| AppError::BadRequest("Invalid page ID".to_string()))?;
        // Verify user is the creator of the page
        let pages = state.mongo.collection::<crate::models::Page>("pages");
        match pages.find_one(doc! { "_id": oid, "creator_id": user_id }, None).await {
            Ok(Some(_)) => Some(oid),
            _ => return Err(AppError::Forbidden("Only the page creator can post to this page".to_string())),
        }
    } else {
        None
    };

    let new_post = Post {
        id: None,
        group_id,
        page_id,
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
        .map_err(AppError::from)?;

    Ok((StatusCode::CREATED, Json(json!({"message": "Post created", "id": result.inserted_id.as_object_id().unwrap().to_hex()}))))
}

pub async fn get_feed_handler(
    State(state): State<Arc<AppState>>,
    user: Option<AuthUser>,
    axum::extract::Query(query): axum::extract::Query<FeedQuery>,
) -> AppResult<impl IntoResponse> {
    let limit = query.limit.unwrap_or(20).min(50) as i64;
    
    // Get relevant groups: public groups for everyone, and member groups for the user
    let groups_collection = state.mongo.collection::<crate::models::Group>("groups");
    let mut groups_query = doc! { "is_private": { "$ne": true } };
    if let Some(ref u) = user {
        groups_query = doc! { 
            "$or": [
                { "members": u.user_id },
                { "is_private": { "$ne": true } }
            ]
        };
    }
    
    let mut users_group_ids = Vec::new();
    if let Ok(mut c) = groups_collection.find(groups_query, None).await {
        while let Some(Ok(group)) = c.next().await {
            if let Some(id) = group.id {
                users_group_ids.push(id);
            }
        }
    }

    let mut or_parts = vec![
        // Regular posts (no group and no page)
        doc! { 
            "group_id": { "$in": [null, Bson::Null] }, 
            "page_id": { "$in": [null, Bson::Null] } 
        },
        // Page posts (public by default)
        doc! { "page_id": { "$ne": null, "$exists": true } },
    ];
    
    if !users_group_ids.is_empty() {
        // Group posts for groups the user belongs to (or public groups)
        or_parts.push(doc! { "group_id": { "$in": &users_group_ids } });
    }
    
    let mut filter = doc! { 
        "status": "published",
    };

    // --- Safety Filter for Guests/AdSense Crawler ---
    if user.is_none() {
        filter.insert("is_nsfw", doc! { "$ne": true });
    }

    if let Some(ref pid) = query.page_id {
        if let Ok(oid) = ObjectId::parse_str(pid) {
            filter.insert("page_id", oid);
        }
    } else if let Some(ref gid) = query.group_id {
        if let Ok(oid) = ObjectId::parse_str(gid) {
            filter.insert("group_id", oid);
        }
    } else {
        filter.insert("$or", or_parts);
    }

    // Add search query if provided
    if let Some(ref search_query) = query.search {
        if !search_query.trim().is_empty() {
            let search_regex = doc! { "$regex": search_query, "$options": "i" };
            let search_or = vec![
                doc! { "content": search_regex.clone() },
                doc! { "title": search_regex },
            ];
            
            if let Ok(existing_or) = filter.get_array("$or") {
                let existing_or = existing_or.clone();
                filter.remove("$or");
                filter.insert("$and", vec![
                    doc! { "$or": existing_or },
                    doc! { "$or": search_or }
                ]);
            } else {
                filter.insert("$or", search_or);
            }
        }
    }
    
    // Add last_id for pagination
    if let Some(ref last_id_str) = query.last_id {
        if let Ok(last_oid) = ObjectId::parse_str(last_id_str) {
            filter.insert("_id", doc! { "$lt": last_oid });
        }
    }

    let posts_collection = state.mongo.collection::<Post>("posts");

    let posts_cursor = posts_collection.find(
        filter,
        FindOptions::builder()
            .sort(doc! { "_id": -1 })
            .limit(limit + 1)
            .build()
    ).await?;

    // Collect posts
    let mut all_posts = Vec::new();
    let mut cursor = posts_cursor;
    while let Some(p) = cursor.next().await {
        if let Ok(post) = p {
            all_posts.push(post);
        }
    }

    // Check if has more
    let has_more = all_posts.len() > limit as usize;
    let posts: Vec<Post> = all_posts.into_iter().take(limit as usize).collect();

    if posts.is_empty() {
        return Ok((StatusCode::OK, Json(FeedResponse { 
            posts: vec![],
            next_cursor: None 
        })));
    }

    // Build responses using helper
    let post_responses = posts_to_responses(&state, user.as_ref(), posts).await;

    let next_cursor = if has_more {
        post_responses.last().map(|p| p.id.clone())
    } else {
        None
    };

    Ok((StatusCode::OK, Json(FeedResponse { 
        posts: post_responses,
        next_cursor 
    })))
}

pub async fn get_post_handler(
    State(state): State<Arc<AppState>>,
    user: Option<AuthUser>,
    Path(post_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let post_oid = ObjectId::parse_str(&post_id).map_err(|_| AppError::BadRequest("Invalid post ID".to_string()))?;
    let collection = state.mongo.collection::<Post>("posts");
    
    let p = collection.find_one(doc! { "_id": post_oid }, None).await?
        .ok_or(AppError::NotFound("Post not found".to_string()))?;

    // --- Safety Check for Guests ---
    if user.is_none() && p.is_nsfw.unwrap_or(false) {
        return Err(AppError::Forbidden("This content requires login to view".to_string()));
    }

    let post_responses = posts_to_responses(&state, user.as_ref(), vec![p]).await;
    let post_response = post_responses.into_iter().next().ok_or(AppError::InternalServerError("Failed to build response".to_string()))?;

    Ok((StatusCode::OK, Json(post_response)))
}

pub async fn save_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let post_oid = ObjectId::parse_str(&post_id).map_err(|_| AppError::BadRequest("Invalid post ID".to_string()))?;
    
    let saved_posts_collection = state.mongo.collection::<crate::models::SavedPost>("saved_posts");

    // Check if already saved
    let existing = saved_posts_collection.find_one(doc! { "post_id": post_oid, "user_id": user.user_id }, None).await?;

    if existing.is_some() {
        // Unsave
        saved_posts_collection.delete_one(doc! { "post_id": post_oid, "user_id": user.user_id }, None).await?;
        return Ok((StatusCode::OK, Json(json!({"message": "Unsaved", "is_saved": false}))));
    }

    // Save
    let new_saved_post = crate::models::SavedPost {
        id: None,
        post_id: post_oid,
        user_id: user.user_id,
        created_at: mongodb::bson::DateTime::now(),
    };

    saved_posts_collection.insert_one(new_saved_post, None).await?;

    Ok((StatusCode::OK, Json(json!({"message": "Saved", "is_saved": true}))))
}

pub async fn like_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let post_oid = ObjectId::parse_str(&post_id).map_err(|_| AppError::BadRequest("Invalid post ID".to_string()))?;
    
    let likes_collection = state.mongo.collection::<crate::models::Like>("likes");
    let posts_collection = state.mongo.collection::<Post>("posts");

    // Check if already liked
    let existing = likes_collection.find_one(doc! { "post_id": post_oid, "user_id": user.user_id }, None).await?;

    if existing.is_some() {
        return Err(AppError::Conflict("Already liked".to_string()));
    }

    let new_like = crate::models::Like {
        id: None,
        post_id: post_oid,
        user_id: user.user_id,
        created_at: mongodb::bson::DateTime::now(),
    };

    likes_collection.insert_one(new_like, None).await?;

    // Increment like count
    posts_collection.update_one(doc! { "_id": post_oid }, doc! { "$inc": { "like_count": 1 } }, None).await?;

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
) -> AppResult<impl IntoResponse> {
    let post_oid = ObjectId::parse_str(&post_id).map_err(|_| AppError::BadRequest("Invalid post ID".to_string()))?;
    
    let likes_collection = state.mongo.collection::<crate::models::Like>("likes");
    let posts_collection = state.mongo.collection::<Post>("posts");

    let result = likes_collection.delete_one(doc! { "post_id": post_oid, "user_id": user.user_id }, None).await?;

    if result.deleted_count == 0 {
        return Err(AppError::NotFound("Not liked yet".to_string()));
    }

    // Decrement like count
    posts_collection.update_one(doc! { "_id": post_oid }, doc! { "$inc": { "like_count": -1 } }, None).await?;

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
) -> AppResult<impl IntoResponse> {
    let post_oid = ObjectId::parse_str(&post_id).map_err(|_| AppError::BadRequest("Invalid post ID".to_string()))?;
    
    let comments_collection = state.mongo.collection::<crate::models::Comment>("comments");
    let profile_collection = state.mongo.collection::<Profile>("profiles");
    let posts_collection = state.mongo.collection::<Post>("posts");
    let users_collection = state.mongo.collection::<crate::models::User>("users");

    // Check verification
    let db_user = users_collection.find_one(doc! { "_id": user.user_id }, None).await?;
    if let Some(user) = db_user {
        if !user.is_verified {
            return Err(AppError::Forbidden("Account verification required to comment. Please verify your account for Ksh 20.".to_string()));
        }
    } else {
        return Err(AppError::NotFound("User not found".to_string()));
    }

    let profile = profile_collection.find_one(doc! { "user_id": user.user_id }, None).await?
        .ok_or(AppError::NotFound("Profile not found".to_string()))?;

    // Parse parent_comment_id if provided
    let parent_oid = if let Some(parent_id) = &payload.parent_comment_id {
        Some(ObjectId::parse_str(parent_id).map_err(|_| AppError::BadRequest("Invalid parent comment ID".to_string()))?)
    } else {
        None
    };

    let new_comment = crate::models::Comment {
        id: None,
        content_id: post_oid,
        content_type: "post".to_string(),
        user_id: user.user_id,
        username: profile.username,
        user_avatar: profile.avatar_url,
        parent_id: parent_oid,
        content: payload.content,
        status: "approved".to_string(),
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
        ip_address: None,
        user_agent: None,
        is_edited: false,
        created_at: mongodb::bson::DateTime::now(),
        updated_at: mongodb::bson::DateTime::now(),
    };

    comments_collection.insert_one(new_comment, None).await?;

    // Increment comment count on post
    posts_collection.update_one(doc! { "_id": post_oid }, doc! { "$inc": { "comment_count": 1 } }, None).await?;

    // If this is a reply, increment the parent comment's replies_count
    if let Some(parent_id) = parent_oid {
        comments_collection.update_one(
            doc! { "_id": parent_id },
            doc! { "$inc": { "replies_count": 1 } },
            None
        ).await?;
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

pub async fn get_comments_handler(
    State(state): State<Arc<AppState>>,
    Path(post_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let post_oid = ObjectId::parse_str(&post_id).map_err(|_| AppError::BadRequest("Invalid post ID".to_string()))?;
    
    let comments_collection = state.mongo.collection::<crate::models::Comment>("comments");

    let find_options = FindOptions::builder().sort(doc! { "created_at": 1 }).build();
    let mut cursor = comments_collection.find(doc! { "content_id": post_oid }, find_options).await?;

    let mut comments = Vec::new();
    while let Some(result) = cursor.next().await {
        if let Ok(comment) = result {
            comments.push(CommentResponse {
                id: comment.id.unwrap().to_hex(),
                content_id: comment.content_id.to_hex(),
                content_type: comment.content_type,
                user_id: comment.user_id.to_hex(),
                username: comment.username,
                user_avatar: comment.user_avatar,
                parent_id: comment.parent_id.map(|oid| oid.to_hex()),
                content: comment.content,
                status: comment.status,
                spam_score: comment.spam_score,
                sentiment_score: comment.sentiment_score,
                reported_count: comment.reported_count,
                likes: comment.likes,
                replies_count: comment.replies_count,
                edited_at: comment.edited_at.map(|d| d.to_chrono().to_rfc3339()),
                deleted_at: comment.deleted_at.map(|d| d.to_chrono().to_rfc3339()),
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
            });
        }
    }

    Ok((StatusCode::OK, Json(comments)))
}

pub async fn get_trending_topics_handler(
    State(state): State<Arc<AppState>>,
) -> AppResult<impl IntoResponse> {
    let cache_key = crate::features::infrastructure::cache::CacheKeys::trending_topics();
    
    // Check cache first
    if let Some(cached) = state.cache.get::<Vec<serde_json::Value>>(&cache_key).await {
        return Ok((StatusCode::OK, Json(cached)));
    }

    let collection = state.mongo.collection::<Post>("posts");
    
    let pipeline = vec![
        doc! { "$match": { "created_at": { "$gte": mongodb::bson::DateTime::from_millis(Utc::now().timestamp_millis() - 86400000) } } },
        doc! { "$project": { "words": { "$split": ["$content", " "] } } },
        doc! { "$unwind": "$words" },
        doc! { "$match": { "words": { "$regex": "^#" } } },
        doc! { "$group": { "_id": "$words", "count": { "$sum": 1 } } },
        doc! { "$sort": { "count": -1 } },
        doc! { "$limit": 5 }
    ];

    let mut cursor = collection.aggregate(pipeline, None).await?;

    let mut trending = Vec::new();
    while let Some(result) = cursor.next().await {
        if let Ok(doc) = result {
            let tag = doc.get_str("_id").unwrap_or_default();
            trending.push(json!({
                "id": tag,
                "tag": tag,
                "count": doc.get_i32("count").unwrap_or(0)
            }));
        }
    }

    // Set cache for 15 minutes
    state.cache.set(&cache_key, &trending, 900).await;

    Ok((StatusCode::OK, Json(trending)))
}

pub async fn get_saved_posts_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> AppResult<impl IntoResponse> {
    let saved_posts_collection = state.mongo.collection::<crate::models::SavedPost>("saved_posts");
    let posts_collection = state.mongo.collection::<Post>("posts");

    let mut cursor = saved_posts_collection.find(doc! { "user_id": user.user_id }, None).await?;

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

    let mut cursor = posts_collection.find(doc! { "_id": { "$in": &saved_post_ids } }, None).await?;

    let mut posts = Vec::new();
    while let Some(result) = cursor.next().await {
        if let Ok(post) = result {
            posts.push(post);
        }
    }

    let post_responses = posts_to_responses(&state, Some(&user), posts).await;

    Ok((StatusCode::OK, Json(json!({
        "posts": post_responses,
        "next_cursor": post_responses.last().map(|p| p.id.clone())
    }))))
}

pub async fn get_for_you_feed_handler(
    State(state): State<Arc<AppState>>,
    user: Option<AuthUser>,
    axum::extract::Query(query): axum::extract::Query<FeedQuery>,
) -> AppResult<impl IntoResponse> {
    let limit = query.limit.unwrap_or(20) as i64;
    
    if let Some(ref auth_user) = user {
        let follows_collection = state.mongo.collection::<crate::models::Follow>("follows");
        let mut followed_ids = Vec::new();
        
        if let Ok(mut cursor) = follows_collection.find(doc! { "follower_id": auth_user.user_id }, None).await {
            while let Some(result) = cursor.next().await {
                if let Ok(follow) = result {
                    followed_ids.push(follow.followed_id);
                }
            }
        }
        
        let groups_collection = state.mongo.collection::<crate::models::Group>("groups");
        let mut users_group_ids = Vec::new();
        if let Ok(mut c) = groups_collection.find(
            doc! { 
                "$or": [
                    { "members": auth_user.user_id },
                    { "is_private": { "$ne": true } }
                ]
            },
            None
        ).await {
            while let Some(Ok(group)) = c.next().await {
                if let Some(id) = group.id {
                    users_group_ids.push(id);
                }
            }
        }

        let page_follows = state.mongo.collection::<crate::models::PageFollow>("page_follows");
        let mut followed_page_ids = Vec::new();
        if let Ok(mut c) = page_follows.find(doc! { "user_id": auth_user.user_id }, None).await {
            while let Some(Ok(f)) = c.next().await {
                followed_page_ids.push(f.page_id);
            }
        }

        if !followed_ids.is_empty() || !users_group_ids.is_empty() || !followed_page_ids.is_empty() {
            let posts_collection = state.mongo.collection::<Post>("posts");
            let mut or_parts = vec![
                doc! { "author_id": { "$in": &followed_ids } },
                // Include all page posts (they are public)
                doc! { "page_id": { "$ne": null, "$exists": true } }
            ];
            
            if !users_group_ids.is_empty() {
                or_parts.push(doc! { "group_id": { "$in": &users_group_ids } });
            }

            let mut filter = doc! {
                "status": "published",
                "$or": or_parts
            };
            
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
            ).await?;
            
            let mut all_posts = Vec::new();
            let mut cursor = posts_cursor;
            while let Some(p) = cursor.next().await {
                if let Ok(post) = p {
                    all_posts.push(post);
                }
            }
            
            let posts: Vec<Post> = all_posts.iter().take(limit as usize).cloned().collect();
            
            if !posts.is_empty() {
                let post_responses = posts_to_responses(&state, user.as_ref(), posts).await;
                
                return Ok((StatusCode::OK, Json(FeedResponse {
                    posts: post_responses.clone(),
                    next_cursor: if all_posts.len() > limit as usize { post_responses.last().map(|p| p.id.clone()) } else { None }
                })).into_response());
            }
        }
    }
    
    get_trending_posts_handler(State(state), user, axum::extract::Query(query)).await.map(|r| r.into_response())
}

pub async fn get_trending_posts_handler(
    State(state): State<Arc<AppState>>,
    user: Option<AuthUser>,
    axum::extract::Query(query): axum::extract::Query<FeedQuery>,
) -> AppResult<impl IntoResponse> {
    let limit = query.limit.unwrap_or(20) as i64;
    let seventy_two_hours_ago = chrono::Utc::now() - chrono::Duration::hours(72);
    
    let mut filter = doc! {
        "status": "published",
        "created_at": { "$gte": mongodb::bson::DateTime::from_millis(seventy_two_hours_ago.timestamp_millis()) }
    };

    // --- Safety Filter for Guests/AdSense Crawler ---
    if user.is_none() {
        filter.insert("is_nsfw", doc! { "$ne": true });
    }
    
    if let Some(ref last_id_str) = query.last_id {
        if let Ok(last_oid) = ObjectId::parse_str(last_id_str) {
            filter.insert("_id", doc! { "$lt": last_oid });
        }
    }
    
    let posts_collection = state.mongo.collection::<Post>("posts");
    
    let posts_cursor = posts_collection.find(
        filter,
        FindOptions::builder()
            .sort(doc! { "like_count": -1 })
            .limit(limit + 1)
            .build()
    ).await?;
    
    let mut all_posts = Vec::new();
    let mut cursor = posts_cursor;
    while let Some(p) = cursor.next().await {
        if let Ok(post) = p {
            all_posts.push(post);
        }
    }
    
    let has_more = all_posts.len() > limit as usize;
    let posts: Vec<Post> = all_posts.into_iter().take(limit as usize).collect();
    
    let post_responses = posts_to_responses(&state, user.as_ref(), posts).await;
    
    Ok((StatusCode::OK, Json(FeedResponse {
        posts: post_responses.clone(),
        next_cursor: if has_more { post_responses.last().map(|p| p.id.clone()) } else { None }
    })))
}

pub async fn report_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
    Json(payload): Json<ReportPostRequest>,
) -> AppResult<impl IntoResponse> {
    let post_oid = ObjectId::parse_str(&post_id).map_err(|_| AppError::BadRequest("Invalid post ID".to_string()))?;
    
    let posts_collection = state.mongo.collection::<Post>("posts");
    let moderation_collection = state.mongo.collection::<ContentModeration>("content_moderation");

    // Fetch post to get its content/context
    let post = posts_collection.find_one(doc! { "_id": post_oid }, None).await?
        .ok_or(AppError::NotFound("Post not found".to_string()))?;

    let report = ContentModeration {
        id: None,
        content_id: post_oid,
        content_type: "post".to_string(),
        content_text: post.content.clone(),
        reported_by: Some(user.user_id),
        reported_reason: Some(payload.reason),
        reported_at: Some(mongodb::bson::DateTime::now()),
        status: "pending".to_string(),
        reviewed_by: None,
        reviewed_at: None,
        review_notes: None,
        action_taken: None,
        created_at: mongodb::bson::DateTime::now(),
        updated_at: mongodb::bson::DateTime::now(),
    };

    moderation_collection.insert_one(report, None).await?;

    Ok((StatusCode::OK, Json(json!({"message": "Post reported successfully"}))))
}

pub fn content_routes() -> Router<Arc<AppState>> {
    Router::new()
        // Post CRUD – nested at /api/posts -> these become /api/posts/, /api/posts/:id etc.
        .route("/", post(create_post_handler))
        .route("/:id", get(get_post_handler))
        .route("/:id/like", post(like_post_handler).delete(unlike_post_handler))
        .route("/:id/save", post(save_post_handler))
        .route("/:id/report", post(report_post_handler))
        .route("/:id/comments", post(add_comment_handler).get(get_comments_handler))
        // Feed routes – frontend calls /api/posts/feed, /api/posts/for-you, /api/posts/trending-posts
        .route("/feed", get(get_feed_handler))
        .route("/for-you", get(get_for_you_feed_handler))
        .route("/trending-posts", get(get_trending_posts_handler))
        .route("/trending", get(get_trending_posts_handler))   // alias
        .route("/trending-topics", get(get_trending_topics_handler))
        .route("/saved", get(get_saved_posts_handler))
}
