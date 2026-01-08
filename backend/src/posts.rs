use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use crate::db::AppState;
use crate::models::{Post, PostRevision, PostApproval, PostView, PostLike, PostShare, PostAnalytics, ContentModeration, User, Profile};
use crate::auth::AuthUser;
use futures::stream::StreamExt;

// --- DTOs ---

#[derive(Deserialize)]
pub struct CreatePostRequest {
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub category: String,
    pub tags: Option<Vec<String>>,
    pub post_type: String,
    pub featured_image: Option<String>,
    pub gallery_images: Option<Vec<String>>,
    pub video_url: Option<String>,
    pub audio_url: Option<String>,
    pub scheduled_publish_date: Option<String>,
    pub language: String,
    pub is_featured: bool,
    pub is_premium: bool,
    pub allow_comments: bool,
    pub allow_sharing: bool,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub seo_keywords: Option<Vec<String>>,
    pub meta_data: Option<serde_json::Value>,
    pub content_rating: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdatePostRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub excerpt: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub post_type: Option<String>,
    pub featured_image: Option<String>,
    pub gallery_images: Option<Vec<String>>,
    pub video_url: Option<String>,
    pub audio_url: Option<String>,
    pub scheduled_publish_date: Option<String>,
    pub language: Option<String>,
    pub is_featured: Option<bool>,
    pub is_premium: Option<bool>,
    pub allow_comments: Option<bool>,
    pub allow_sharing: Option<bool>,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub seo_keywords: Option<Vec<String>>,
    pub meta_data: Option<serde_json::Value>,
    pub content_rating: Option<String>,
}

#[derive(Deserialize)]
pub struct ApprovePostRequest {
    pub status: String, // approved, rejected
    pub comments: Option<String>,
    pub rejection_reason: Option<String>,
}

#[derive(Deserialize)]
pub struct PostFilter {
    pub status: Option<String>,
    pub post_type: Option<String>,
    pub category: Option<String>,
    pub author: Option<String>,
    pub search: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct PostResponse {
    pub id: String,
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub slug: String,
    pub status: String,
    pub post_type: String,
    pub category: String,
    pub tags: Option<Vec<String>>,
    pub author_id: String,
    pub author_name: String,
    pub featured_image: Option<String>,
    pub gallery_images: Option<Vec<String>>,
    pub video_url: Option<String>,
    pub audio_url: Option<String>,
    pub scheduled_publish_date: Option<String>,
    pub published_at: Option<String>,
    pub approved_at: Option<String>,
    pub approved_by: Option<String>,
    pub rejected_at: Option<String>,
    pub rejected_by: Option<String>,
    pub rejection_reason: Option<String>,
    pub view_count: i32,
    pub like_count: i32,
    pub comment_count: i32,
    pub share_count: i32,
    pub reading_time: Option<i32>,
    pub language: String,
    pub is_featured: bool,
    pub is_premium: bool,
    pub allow_comments: bool,
    pub allow_sharing: bool,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub seo_keywords: Option<Vec<String>>,
    pub source_url: Option<String>,
    pub source_author: Option<String>,
    pub plagiarism_score: Option<f64>,
    pub content_rating: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub analytics: PostAnalyticsSummary,
}

#[derive(Serialize)]
pub struct PostAnalyticsSummary {
    pub total_views: i32,
    pub unique_views: i32,
    pub total_likes: i32,
    pub total_comments: i32,
    pub total_shares: i32,
    pub avg_reading_time: Option<f64>,
    pub engagement_rate: f64,
}

#[derive(Serialize)]
pub struct PostWorkflowResponse {
    pub post: PostResponse,
    pub revisions: Vec<PostRevision>,
    pub approvals: Vec<PostApproval>,
    pub moderation_history: Vec<ContentModeration>,
}

// --- Middleware: Check Admin ---

async fn check_admin(
    user_id: ObjectId,
    state: &Arc<AppState>,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let users = state.mongo.collection::<User>("users");
    let user_doc = users.find_one(doc! { "_id": user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    match user_doc {
        Some(u) if u.role == "admin" || u.role == "superadmin" => Ok(()),
        _ => Err((StatusCode::FORBIDDEN, Json(json!({"error": "Admin access required"})))),
    }
}

// --- Handlers ---

pub async fn list_posts_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<PostFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let posts = state.mongo.collection::<Post>("posts");
    
    let mut query = doc! {};
    
    if let Some(status) = &params.status {
        query.insert("status", status);
    }
    
    if let Some(post_type) = &params.post_type {
        query.insert("post_type", post_type);
    }
    
    if let Some(category) = &params.category {
        query.insert("category", category);
    }
    
    if let Some(search) = &params.search {
        query.insert("$or", vec![
            doc! { "title": { "$regex": search, "$options": "i" } },
            doc! { "content": { "$regex": search, "$options": "i" } },
            doc! { "excerpt": { "$regex": search, "$options": "i" } },
        ]);
    }

    if let Some(date_from) = &params.date_from {
        if let Ok(date) = chrono::DateTime::parse_from_rfc3339(date_from) {
            query.insert("created_at", doc! { "$gte": date });
        }
    }

    if let Some(date_to) = &params.date_to {
        if let Ok(date) = chrono::DateTime::parse_from_rfc3339(date_to) {
            query.insert("created_at", doc! { "$lte": date });
        }
    }

    let sort_by = params.sort_by.unwrap_or_else(|| "created_at".to_string());
    let sort_order = params.sort_order.unwrap_or_else(|| "desc".to_string());
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(20);
    let skip = (page - 1) * limit;

    let _sort_doc = match sort_order.as_str() {
        "desc" => doc! { sort_by: -1 },
        _ => doc! { sort_by: 1 },
    };

    let mut cursor = posts.find(query, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut posts_list = Vec::new();
    let mut total_count = 0;
    
    while let Some(post) = cursor.next().await {
        if let Ok(p) = post {
            let post_info = build_post_response(&p, &state).await?;
            posts_list.push(post_info);
            total_count += 1;
        }
    }

    // Apply pagination
    let start = skip as usize;
    let end = (start + limit as usize).min(posts_list.len());
    let paginated_posts = posts_list.into_iter().skip(start).take(end - start).collect::<Vec<_>>();

    Ok((StatusCode::OK, Json(json!({
        "posts": paginated_posts,
        "pagination": {
            "current_page": page,
            "total_pages": (total_count as f64 / limit as f64).ceil() as i64,
            "total_items": total_count,
            "items_per_page": limit,
            "has_next": end < total_count,
            "has_prev": page > 1
        }
    }))))
}

pub async fn get_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&post_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid post ID"}))))?;

    let posts = state.mongo.collection::<Post>("posts");
    let post = posts.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Post not found"}))))?;

    let post_info = build_post_response(&post, &state).await?;
    Ok((StatusCode::OK, Json(post_info)))
}

pub async fn create_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreatePostRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let posts = state.mongo.collection::<Post>("posts");
    
    // Generate slug from title
    let slug = generate_slug(&payload.title);
    
    // Calculate reading time
    let reading_time = calculate_reading_time(&payload.content);

    // Get author info
    let profiles = state.mongo.collection::<Profile>("profiles");
    let author_profile = profiles.find_one(doc! { "user_id": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Author profile not found"}))))?;

    let new_post = Post {
        id: None,
        title: payload.title,
        content: payload.content,
        excerpt: payload.excerpt,
        slug,
        status: "draft".to_string(),
        post_type: payload.post_type,
        category: payload.category,
        tags: payload.tags,
        author_id: user.user_id,
        author_name: author_profile.username,
        featured_image: payload.featured_image,
        gallery_images: payload.gallery_images,
        video_url: payload.video_url,
        audio_url: payload.audio_url,
        scheduled_publish_date: payload.scheduled_publish_date.map(|s| chrono::DateTime::parse_from_rfc3339(&s).unwrap().into()),
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
        reading_time: Some(reading_time),
        language: payload.language,
        is_featured: payload.is_featured,
        is_premium: payload.is_premium,
        allow_comments: payload.allow_comments,
        allow_sharing: payload.allow_sharing,
        seo_title: payload.seo_title,
        seo_description: payload.seo_description,
        seo_keywords: payload.seo_keywords,
        meta_data: payload.meta_data,
        source_url: None,
        source_author: None,
        plagiarism_score: None,
        content_rating: payload.content_rating,
        created_at: DateTime::now(),
        updated_at: DateTime::now(),
    };

    let result = posts.insert_one(new_post, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Create initial revision
    create_post_revision(&state, result.inserted_id.as_object_id().unwrap(), &user, "Initial draft").await?;

    Ok((StatusCode::CREATED, Json(json!({
        "message": "Post created successfully",
        "post_id": result.inserted_id.as_object_id().unwrap().to_hex()
    }))))
}

pub async fn update_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
    Json(payload): Json<UpdatePostRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&post_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid post ID"}))))?;

    let posts = state.mongo.collection::<Post>("posts");
    
    // Get current post to create revision
    let _current_post = posts.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Post not found"}))))?;

    let mut update_doc = doc! {};
    
    if let Some(title) = payload.title {
        update_doc.insert("title", title);
    }
    if let Some(content) = payload.content {
        update_doc.insert("content", content);
    }
    if let Some(excerpt) = payload.excerpt {
        update_doc.insert("excerpt", excerpt);
    }
    if let Some(category) = payload.category {
        update_doc.insert("category", category);
    }
    if let Some(tags) = payload.tags {
        update_doc.insert("tags", tags);
    }
    if let Some(post_type) = payload.post_type {
        update_doc.insert("post_type", post_type);
    }
    if let Some(featured_image) = payload.featured_image {
        update_doc.insert("featured_image", featured_image);
    }
    if let Some(gallery_images) = payload.gallery_images {
        update_doc.insert("gallery_images", gallery_images);
    }
    if let Some(video_url) = payload.video_url {
        update_doc.insert("video_url", video_url);
    }
    if let Some(audio_url) = payload.audio_url {
        update_doc.insert("audio_url", audio_url);
    }
    if let Some(scheduled_publish_date) = payload.scheduled_publish_date {
        let dt = chrono::DateTime::parse_from_rfc3339(&scheduled_publish_date)
            .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid scheduled publish date format"}))))?;
        update_doc.insert("scheduled_publish_date", dt);
    }
    if let Some(language) = payload.language {
        update_doc.insert("language", language);
    }
    if let Some(is_featured) = payload.is_featured {
        update_doc.insert("is_featured", is_featured);
    }
    if let Some(is_premium) = payload.is_premium {
        update_doc.insert("is_premium", is_premium);
    }
    if let Some(allow_comments) = payload.allow_comments {
        update_doc.insert("allow_comments", allow_comments);
    }
    if let Some(allow_sharing) = payload.allow_sharing {
        update_doc.insert("allow_sharing", allow_sharing);
    }
    if let Some(seo_title) = payload.seo_title {
        update_doc.insert("seo_title", seo_title);
    }
    if let Some(seo_description) = payload.seo_description {
        update_doc.insert("seo_description", seo_description);
    }
    if let Some(seo_keywords) = payload.seo_keywords {
        update_doc.insert("seo_keywords", seo_keywords);
    }
    if let Some(meta_data) = payload.meta_data {
        update_doc.insert("meta_data", meta_data.to_string());
    }
    if let Some(content_rating) = payload.content_rating {
        update_doc.insert("content_rating", content_rating);
    }

    update_doc.insert("updated_at", DateTime::now());

    posts.update_one(
        doc! { "_id": oid },
        doc! { "$set": update_doc.clone() },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Create revision
    let changes = format!("Updated post: {}", update_doc.keys().map(|k| k.as_str()).collect::<Vec<_>>().join(", "));
    create_post_revision(&state, oid, &user, &changes).await?;

    Ok((StatusCode::OK, Json(json!({"message": "Post updated successfully"}))))
}

pub async fn approve_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
    Json(payload): Json<ApprovePostRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&post_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid post ID"}))))?;

    let posts = state.mongo.collection::<Post>("posts");
    let post = posts.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Post not found"}))))?;

    let mut update_doc = doc! {};
    let status = payload.status.clone();
    
    if status == "approved" {
        update_doc.insert("status", "approved");
        update_doc.insert("approved_at", DateTime::now());
        update_doc.insert("approved_by", user.user_id);
        update_doc.insert("rejected_at", None::<DateTime>);
        update_doc.insert("rejected_by", None::<ObjectId>);
        update_doc.insert("rejection_reason", None::<String>);
    } else if status == "rejected" {
        update_doc.insert("status", "rejected");
        update_doc.insert("rejected_at", DateTime::now());
        update_doc.insert("rejected_by", user.user_id);
        update_doc.insert("rejection_reason", payload.rejection_reason);
        update_doc.insert("approved_at", None::<DateTime>);
        update_doc.insert("approved_by", None::<ObjectId>);
    } else {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid approval status"}))));
    }

    update_doc.insert("updated_at", DateTime::now());

    posts.update_one(
        doc! { "_id": oid },
        doc! { "$set": update_doc },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Create approval record
    let approvals = state.mongo.collection::<PostApproval>("post_approvals");
    let approval = PostApproval {
        id: None,
        post_id: oid,
        approver_id: user.user_id,
        approver_name: post.author_name,
        status: payload.status,
        comments: payload.comments,
        reviewed_at: DateTime::now(),
        created_at: DateTime::now(),
    };

    approvals.insert_one(approval, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": format!("Post {} successfully", status)}))))
}

pub async fn publish_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&post_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid post ID"}))))?;

    let posts = state.mongo.collection::<Post>("posts");
    
    posts.update_one(
        doc! { "_id": oid },
        doc! { 
            "$set": { 
                "status": "published",
                "published_at": DateTime::now(),
                "updated_at": DateTime::now()
            }
        },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Post published successfully"}))))
}

pub async fn delete_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&post_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid post ID"}))))?;

    let posts = state.mongo.collection::<Post>("posts");
    
    posts.delete_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Also delete associated data
    let revisions = state.mongo.collection::<PostRevision>("post_revisions");
    revisions.delete_many(doc! { "post_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let approvals = state.mongo.collection::<PostApproval>("post_approvals");
    approvals.delete_many(doc! { "post_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let views = state.mongo.collection::<PostView>("post_views");
    views.delete_many(doc! { "post_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let likes = state.mongo.collection::<PostLike>("post_likes");
    likes.delete_many(doc! { "post_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let shares = state.mongo.collection::<PostShare>("post_shares");
    shares.delete_many(doc! { "post_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let analytics = state.mongo.collection::<PostAnalytics>("post_analytics");
    analytics.delete_many(doc! { "post_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let moderation = state.mongo.collection::<ContentModeration>("content_moderation");
    moderation.delete_many(doc! { "content_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Post deleted successfully"}))))
}

pub async fn get_post_workflow_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&post_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid post ID"}))))?;

    // Get post
    let posts = state.mongo.collection::<Post>("posts");
    let post = posts.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Post not found"}))))?;

    // Get revisions
    let revisions = state.mongo.collection::<PostRevision>("post_revisions");
    let mut revision_cursor = revisions.find(doc! { "post_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut revisions_list = Vec::new();
    while let Some(revision) = revision_cursor.next().await {
        if let Ok(r) = revision {
            revisions_list.push(r);
        }
    }

    // Get approvals
    let approvals = state.mongo.collection::<PostApproval>("post_approvals");
    let mut approval_cursor = approvals.find(doc! { "post_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut approvals_list = Vec::new();
    while let Some(approval) = approval_cursor.next().await {
        if let Ok(a) = approval {
            approvals_list.push(a);
        }
    }

    // Get moderation history
    let moderation = state.mongo.collection::<ContentModeration>("content_moderation");
    let mut moderation_cursor = moderation.find(doc! { "content_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut moderation_list = Vec::new();
    while let Some(moderation_item) = moderation_cursor.next().await {
        if let Ok(m) = moderation_item {
            moderation_list.push(m);
        }
    }

    let post_info = build_post_response(&post, &state).await?;
    
    let workflow_response = PostWorkflowResponse {
        post: post_info,
        revisions: revisions_list,
        approvals: approvals_list,
        moderation_history: moderation_list,
    };

    Ok((StatusCode::OK, Json(workflow_response)))
}

pub async fn get_post_analytics_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&post_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid post ID"}))))?;

    // Get post info
    let posts = state.mongo.collection::<Post>("posts");
    let post = posts.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Post not found"}))))?;

    // Get analytics summary
    let views = state.mongo.collection::<PostView>("post_views");
    let total_views = views.count_documents(doc! { "post_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let unique_views = views.distinct("session_id", doc! { "post_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .len() as i32;

    let likes = state.mongo.collection::<PostLike>("post_likes");
    let total_likes = likes.count_documents(doc! { "post_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let comments = state.mongo.collection::<crate::models::Comment>("comments");
    let total_comments = comments.count_documents(doc! { "post_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let shares = state.mongo.collection::<PostShare>("post_shares");
    let total_shares = shares.count_documents(doc! { "post_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let engagement_rate = if total_views > 0 {
        ((total_likes + total_comments + total_shares) as f64 / total_views as f64) * 100.0
    } else {
        0.0
    };

    let analytics_summary = PostAnalyticsSummary {
        total_views: total_views as i32,
        unique_views,
        total_likes: total_likes as i32,
        total_comments: total_comments as i32,
        total_shares: total_shares as i32,
        avg_reading_time: post.reading_time.map(|rt| rt as f64),
        engagement_rate,
    };

    let post_info = build_post_response(&post, &state).await?;
    
    Ok((StatusCode::OK, Json(json!({
        "post": post_info,
        "analytics": analytics_summary
    }))))
}

// --- Helper Functions ---

async fn build_post_response(
    post: &Post,
    state: &Arc<AppState>,
) -> Result<PostResponse, (StatusCode, Json<serde_json::Value>)> {
    // Get analytics summary
    let views = state.mongo.collection::<PostView>("post_views");
    let total_views = views.count_documents(doc! { "post_id": post.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let unique_views = views.distinct("session_id", doc! { "post_id": post.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .len() as i32;

    let likes = state.mongo.collection::<PostLike>("post_likes");
    let total_likes = likes.count_documents(doc! { "post_id": post.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let comments = state.mongo.collection::<crate::models::Comment>("comments");
    let total_comments = comments.count_documents(doc! { "post_id": post.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let shares = state.mongo.collection::<PostShare>("post_shares");
    let total_shares = shares.count_documents(doc! { "post_id": post.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let engagement_rate = if total_views > 0 {
        ((total_likes + total_comments + total_shares) as f64 / total_views as f64) * 100.0
    } else {
        0.0
    };

    Ok(PostResponse {
        id: post.id.unwrap().to_hex(),
        title: post.title.clone(),
        content: post.content.clone(),
        excerpt: post.excerpt.clone(),
        slug: post.slug.clone(),
        status: post.status.clone(),
        post_type: post.post_type.clone(),
        category: post.category.clone(),
        tags: post.tags.clone(),
        author_id: post.author_id.to_hex(),
        author_name: post.author_name.clone(),
        featured_image: post.featured_image.clone(),
        gallery_images: post.gallery_images.clone(),
        video_url: post.video_url.clone(),
        audio_url: post.audio_url.clone(),
        scheduled_publish_date: post.scheduled_publish_date.map(|dt| dt.to_chrono().to_rfc3339()),
        published_at: post.published_at.map(|dt| dt.to_chrono().to_rfc3339()),
        approved_at: post.approved_at.map(|dt| dt.to_chrono().to_rfc3339()),
        approved_by: post.approved_by.map(|id| id.to_hex()),
        rejected_at: post.rejected_at.map(|dt| dt.to_chrono().to_rfc3339()),
        rejected_by: post.rejected_by.map(|id| id.to_hex()),
        rejection_reason: post.rejection_reason.clone(),
        view_count: post.view_count,
        like_count: post.like_count,
        comment_count: post.comment_count,
        share_count: post.share_count,
        reading_time: post.reading_time,
        language: post.language.clone(),
        is_featured: post.is_featured,
        is_premium: post.is_premium,
        allow_comments: post.allow_comments,
        allow_sharing: post.allow_sharing,
        seo_title: post.seo_title.clone(),
        seo_description: post.seo_description.clone(),
        seo_keywords: post.seo_keywords.clone(),
        source_url: post.source_url.clone(),
        source_author: post.source_author.clone(),
        plagiarism_score: post.plagiarism_score,
        content_rating: post.content_rating.clone(),
        created_at: post.created_at.to_chrono().to_rfc3339(),
        updated_at: post.updated_at.to_chrono().to_rfc3339(),
        analytics: PostAnalyticsSummary {
            total_views: total_views as i32,
            unique_views,
            total_likes: total_likes as i32,
            total_comments: total_comments as i32,
            total_shares: total_shares as i32,
            avg_reading_time: post.reading_time.map(|rt| rt as f64),
            engagement_rate,
        },
    })
}

async fn create_post_revision(
    state: &Arc<AppState>,
    post_id: ObjectId,
    user: &AuthUser,
    changes: &str,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let profiles = state.mongo.collection::<Profile>("profiles");
    let author_profile = profiles.find_one(doc! { "user_id": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Author profile not found"}))))?;

    let revisions = state.mongo.collection::<PostRevision>("post_revisions");
    let revision = PostRevision {
        id: None,
        post_id,
        title: "".to_string(), // Would need to get current title
        content: "".to_string(), // Would need to get current content
        excerpt: None,
        author_id: user.user_id,
        author_name: author_profile.username,
        changes: Some(changes.to_string()),
        created_at: DateTime::now(),
    };

    revisions.insert_one(revision, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(())
}

fn generate_slug(title: &str) -> String {
    title.to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join("-")
}

fn calculate_reading_time(content: &str) -> i32 {
    let word_count = content.split_whitespace().count();
    let words_per_minute = 200;
    (word_count / words_per_minute) as i32 + 1
}

pub fn post_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_posts_handler))
        .route("/:id", get(get_post_handler).put(update_post_handler).delete(delete_post_handler))
        .route("/:id/approve", post(approve_post_handler))
        .route("/:id/publish", post(publish_post_handler))
        .route("/:id/workflow", get(get_post_workflow_handler))
        .route("/:id/analytics", get(get_post_analytics_handler))
}