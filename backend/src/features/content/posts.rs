use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post, put, delete},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use crate::features::infrastructure::db::AppState;
use crate::models::{Post, PostRevision, PostApproval, PostView, PostLike, PostShare, PostAnalytics, ContentModeration, User, Profile};
use crate::features::infrastructure::dto::{
    PostDetailResponse, PostAnalyticsSummary, PostWorkflowResponse, 
    CreatePostRequest, UpdatePostRequest, ApprovePostRequest, PostFilter,
    PaginatedResponse, PaginationInfo, VotePollRequest
};
use crate::features::infrastructure::error::{AppResult, AppError};
use crate::features::auth::auth_service::AuthUser;
use crate::utils::check_admin;
use futures::stream::StreamExt;
use regex::Regex;

// --- Handlers ---

pub async fn list_posts_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<PostFilter>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;
    
    let cache_key = format!("posts:list:{:?}", params);
    
    if let Some(cached_result) = state.cache.get::<PaginatedResponse<PostDetailResponse>>(&cache_key).await {
        return Ok((StatusCode::OK, Json(cached_result)));
    }
    
    let posts = state.mongo.collection::<Post>("posts");
    let mut query = doc! {};
    
    if let Some(status) = &params.status { query.insert("status", status); }
    if let Some(post_type) = &params.post_type { query.insert("post_type", post_type); }
    if let Some(category) = &params.category { query.insert("category", category); }
    
    if let Some(search) = &params.search {
        let escaped_search = regex::escape(search);
        query.insert("$or", vec![
            doc! { "title": { "$regex": &escaped_search, "$options": "i" } },
            doc! { "content": { "$regex": &escaped_search, "$options": "i" } },
            doc! { "excerpt": { "$regex": &escaped_search, "$options": "i" } },
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
    
    let sort_doc = match sort_order.as_str() {
        "desc" => doc! { sort_by: -1 },
        _ => doc! { sort_by: 1 },
    };
    
    let total_count = posts.count_documents(query.clone(), None).await?;
    
    let find_options = mongodb::options::FindOptions::builder()
        .sort(sort_doc)
        .skip(Some(skip as u64))
        .limit(Some(limit))
        .build();
    
    let mut cursor = posts.find(query, find_options).await?;
    let mut paginated_posts = Vec::new();
    
    while let Some(post_res) = cursor.next().await {
        if let Ok(p) = post_res {
            let post_info = build_post_response(&p, &state).await?;
            paginated_posts.push(post_info);
        }
    }
    
    let response_data: PaginatedResponse<PostDetailResponse> = PaginatedResponse {
        items: paginated_posts,
        pagination: PaginationInfo {
            current_page: page,
            total_pages: (total_count as f64 / limit as f64).ceil() as i64,
            total_items: total_count,
            items_per_page: limit,
            has_next: (skip + limit) < (total_count as i64),
            has_prev: page > 1,
        },
    };
    
    let _ = state.cache.set(&cache_key, &response_data, 120).await;
    
    Ok((StatusCode::OK, Json(response_data)))
}

pub async fn get_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    // Anyone logged in can try to view a post, 
    // but the implementation might need more logic for drafts vs published.
    // For now, let's just remove the strict admin check.

    let oid = ObjectId::parse_str(&post_id)
        .map_err(|_| AppError::BadRequest("Invalid post ID".to_string()))?;

    let posts = state.mongo.collection::<Post>("posts");
    let post = posts.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Post not found".to_string()))?;

    let post_info: PostDetailResponse = build_post_response(&post, &state).await?;
    Ok((StatusCode::OK, Json(post_info)))
}

pub async fn update_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
    Json(payload): Json<UpdatePostRequest>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&post_id)
        .map_err(|_| AppError::BadRequest("Invalid post ID".to_string()))?;

    let posts = state.mongo.collection::<Post>("posts");
    
    let existing_post = posts.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Post not found".to_string()))?;

    // Authorization: Admin ONLY for updates
    if user.role != "admin" {
        return Err(AppError::Forbidden("Only administrators can update posts".to_string()));
    }

    let mut update_doc = doc! {};
    
    if let Some(title) = payload.title { update_doc.insert("title", title); }
    if let Some(content) = payload.content { update_doc.insert("content", content); }
    if let Some(excerpt) = payload.excerpt { update_doc.insert("excerpt", excerpt); }
    if let Some(category) = payload.category { update_doc.insert("category", category); }
    if let Some(tags) = payload.tags { update_doc.insert("tags", tags); }
    if let Some(post_type) = payload.post_type { update_doc.insert("post_type", post_type); }
    if let Some(ref scheduled_publish_date) = payload.scheduled_publish_date {
        let dt = chrono::DateTime::parse_from_rfc3339(&scheduled_publish_date)
            .map_err(|_| AppError::BadRequest("Invalid scheduled publish date format".to_string()))?;
        update_doc.insert("scheduled_publish_date", dt);
    }
    if let Some(language) = payload.language { update_doc.insert("language", language); }
    if let Some(is_featured) = payload.is_featured { update_doc.insert("is_featured", is_featured); }
    if let Some(is_premium) = payload.is_premium { update_doc.insert("is_premium", is_premium); }
    if let Some(allow_comments) = payload.allow_comments { update_doc.insert("allow_comments", allow_comments); }
    if let Some(allow_sharing) = payload.allow_sharing { update_doc.insert("allow_sharing", allow_sharing); }
    if let Some(seo_title) = payload.seo_title { update_doc.insert("seo_title", seo_title); }
    if let Some(seo_description) = payload.seo_description { update_doc.insert("seo_description", seo_description); }
    if let Some(seo_keywords) = payload.seo_keywords { update_doc.insert("seo_keywords", seo_keywords); }
    if let Some(meta_data) = payload.meta_data { 
        let bson_meta = bson::to_bson(&meta_data).map_err(|e| AppError::BadRequest(format!("Invalid meta_data: {}", e)))?;
        update_doc.insert("meta_data", bson_meta); 
    }
    if let Some(content_rating) = payload.content_rating { update_doc.insert("content_rating", content_rating); }

    if update_doc.is_empty() {
        return Ok((StatusCode::OK, Json(json!({"message": "No changes made"}))));
    }

    update_doc.insert("updated_at", DateTime::now());

    posts.update_one(doc! { "_id": oid }, doc! { "$set": update_doc }, None).await?;

    Ok((StatusCode::OK, Json(json!({"message": "Post updated successfully"}))))
}

pub async fn approve_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
    Json(payload): Json<ApprovePostRequest>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&post_id)
        .map_err(|_| AppError::BadRequest("Invalid post ID".to_string()))?;

    let posts = state.mongo.collection::<Post>("posts");
    let post = posts.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Post not found".to_string()))?;

    let mut update_doc = doc! {};
    let status = payload.status.clone();
    
    if status == "approved" {
        update_doc.insert("status", "approved");
        update_doc.insert("approved_at", DateTime::now());
        update_doc.insert("approved_by", user.user_id);
        update_doc.insert("rejected_at", mongodb::bson::Bson::Null);
        update_doc.insert("rejected_by", mongodb::bson::Bson::Null);
        update_doc.insert("rejection_reason", mongodb::bson::Bson::Null);
    } else if status == "rejected" {
        update_doc.insert("status", "rejected");
        update_doc.insert("rejected_at", DateTime::now());
        update_doc.insert("rejected_by", user.user_id);
        update_doc.insert("rejection_reason", payload.rejection_reason);
        update_doc.insert("approved_at", mongodb::bson::Bson::Null);
        update_doc.insert("approved_by", mongodb::bson::Bson::Null);
    } else {
        return Err(AppError::BadRequest("Invalid approval status".to_string()));
    }

    update_doc.insert("updated_at", DateTime::now());

    posts.update_one(doc! { "_id": oid }, doc! { "$set": update_doc }, None).await?;

    let approvals = state.mongo.collection::<PostApproval>("post_approvals");
    let approval = PostApproval {
        id: None,
        post_id: oid,
        approver_id: user.user_id,
        approver_name: post.author_name,
        status: payload.status.clone(),
        comments: payload.comments,
        reviewed_at: DateTime::now(),
        created_at: DateTime::now(),
    };

    approvals.insert_one(approval, None).await?;

    Ok((StatusCode::OK, Json(json!({"message": format!("Post {} successfully", status)}))))
}

pub async fn publish_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&post_id)
        .map_err(|_| AppError::BadRequest("Invalid post ID".to_string()))?;

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
    ).await?;

    Ok((StatusCode::OK, Json(json!({"message": "Post published successfully"}))))
}

pub async fn delete_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&post_id)
        .map_err(|_| AppError::BadRequest("Invalid post ID".to_string()))?;

    let posts = state.mongo.collection::<Post>("posts");
    
    let existing_post = posts.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Post not found".to_string()))?;

    // Authorization: Admin OR Author
    if user.role != "admin" && existing_post.author_id != user.user_id {
        return Err(AppError::Forbidden("You do not have permission to delete this post".to_string()));
    }

    posts.delete_one(doc! { "_id": oid }, None).await?;

    // Cleanup associated data
    let revisions = state.mongo.collection::<PostRevision>("post_revisions");
    let approvals = state.mongo.collection::<PostApproval>("post_approvals");
    let views = state.mongo.collection::<PostView>("post_views");
    let likes = state.mongo.collection::<PostLike>("post_likes");
    let shares = state.mongo.collection::<PostShare>("post_shares");
    let analytics = state.mongo.collection::<PostAnalytics>("post_analytics");
    let moderation = state.mongo.collection::<ContentModeration>("content_moderation");

    let _ = tokio::try_join!(
        revisions.delete_many(doc! { "post_id": oid }, None),
        approvals.delete_many(doc! { "post_id": oid }, None),
        views.delete_many(doc! { "post_id": oid }, None),
        likes.delete_many(doc! { "post_id": oid }, None),
        shares.delete_many(doc! { "post_id": oid }, None),
        analytics.delete_many(doc! { "post_id": oid }, None),
        moderation.delete_many(doc! { "content_id": oid }, None)
    )?;

    Ok((StatusCode::OK, Json(json!({"message": "Post deleted successfully"}))))
}

pub async fn get_post_workflow_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&post_id)
        .map_err(|_| AppError::BadRequest("Invalid post ID".to_string()))?;

    let posts = state.mongo.collection::<Post>("posts");
    let post = posts.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Post not found".to_string()))?;

    let mut revision_cursor = state.mongo.collection::<PostRevision>("post_revisions").find(doc! { "post_id": oid }, None).await?;
    let mut revisions_list = Vec::new();
    while let Some(Ok(r)) = revision_cursor.next().await { revisions_list.push(r); }

    let mut approval_cursor = state.mongo.collection::<PostApproval>("post_approvals").find(doc! { "post_id": oid }, None).await?;
    let mut approvals_list = Vec::new();
    while let Some(Ok(a)) = approval_cursor.next().await { approvals_list.push(a); }

    let mut moderation_cursor = state.mongo.collection::<ContentModeration>("content_moderation").find(doc! { "content_id": oid }, None).await?;
    let mut moderation_list = Vec::new();
    while let Some(Ok(m)) = moderation_cursor.next().await { moderation_list.push(m); }

    let post_info = build_post_response(&post, &state).await?;
    
    Ok((StatusCode::OK, Json(PostWorkflowResponse {
        post: post_info,
        revisions: revisions_list.iter().map(|r| serde_json::to_value(r).unwrap_or(serde_json::Value::Null)).collect(),
        approvals: approvals_list.iter().map(|a| serde_json::to_value(a).unwrap_or(serde_json::Value::Null)).collect(),
        moderation_history: moderation_list.iter().map(|m| serde_json::to_value(m).unwrap_or(serde_json::Value::Null)).collect(),
    })))
}

pub async fn get_post_analytics_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&post_id)
        .map_err(|_| AppError::BadRequest("Invalid post ID".to_string()))?;

    let posts = state.mongo.collection::<Post>("posts");
    let post = posts.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Post not found".to_string()))?;

    let views_coll = state.mongo.collection::<PostView>("post_views");
    let likes_coll = state.mongo.collection::<PostLike>("post_likes");
    let comments_coll = state.mongo.collection::<crate::models::Comment>("comments");
    let shares_coll = state.mongo.collection::<PostShare>("post_shares");

    let (total_views, unique_views_res, total_likes, total_comments, total_shares) = tokio::try_join!(
        views_coll.count_documents(doc! { "post_id": oid }, None),
        views_coll.distinct("session_id", doc! { "post_id": oid }, None),
        likes_coll.count_documents(doc! { "post_id": oid }, None),
        comments_coll.count_documents(doc! { "post_id": oid }, None),
        shares_coll.count_documents(doc! { "post_id": oid }, None)
    )?;

    let unique_views = unique_views_res.len() as i32;
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

    let post_info: PostDetailResponse = build_post_response(&post, &state).await?;
    
    Ok((StatusCode::OK, Json(json!({
        "post": post_info,
        "analytics": analytics_summary
    }))))
}

pub async fn vote_poll_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
    Json(payload): Json<VotePollRequest>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&post_id)
        .map_err(|_| AppError::BadRequest("Invalid post ID".to_string()))?;

    let posts = state.mongo.collection::<Post>("posts");
    
    let post = posts.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Post not found".to_string()))?;

    let poll = post.poll.ok_or(AppError::BadRequest("This post does not have a poll".to_string()))?;

    if poll.is_closed {
        return Err(AppError::BadRequest("This poll is closed".to_string()));
    }

    // Check if user already voted in any option
    for option in &poll.options {
        if option.voter_ids.contains(&user.user_id) {
            return Err(AppError::Conflict("You have already voted in this poll".to_string()));
        }
    }

    if payload.option_index >= poll.options.len() {
        return Err(AppError::BadRequest("Invalid poll option index".to_string()));
    }

    // Atomically push user_id to the specific option's voter_ids
    // and prevent double voting at the DB level just in case
    let update_query = doc! {
        "_id": oid,
        "poll.options.voter_ids": { "$ne": user.user_id }
    };
    
    let update_doc = doc! {
        "$push": {
            format!("poll.options.{}.voter_ids", payload.option_index): user.user_id
        }
    };

    let result = posts.update_one(update_query, update_doc, None).await?;

    if result.modified_count == 0 {
        return Err(AppError::Conflict("Vote could not be registered (possible double-vote or poll closed)".to_string()));
    }

    Ok((StatusCode::OK, Json(json!({"message": "Vote registered successfully"}))))
}

pub async fn hide_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&post_id)
        .map_err(|_| AppError::BadRequest("Invalid post ID".to_string()))?;

    let profiles = state.mongo.collection::<Profile>("profiles");
    
    profiles.update_one(
        doc! { "user_id": user.user_id },
        doc! { "$addToSet": { "hidden_posts": oid } },
        None
    ).await?;

    Ok((StatusCode::OK, Json(json!({"message": "Post hidden persistently"}))))
}

// --- Helper Functions ---

async fn build_post_response(
    post: &Post,
    state: &Arc<AppState>,
) -> AppResult<PostDetailResponse> {
    let views_coll = state.mongo.collection::<PostView>("post_views");
    let likes_coll = state.mongo.collection::<PostLike>("post_likes");
    let comments_coll = state.mongo.collection::<crate::models::Comment>("comments");
    let shares_coll = state.mongo.collection::<PostShare>("post_shares");

    let (total_views, unique_views_res, total_likes, total_comments, total_shares) = tokio::try_join!(
        views_coll.count_documents(doc! { "post_id": post.id.unwrap() }, None),
        views_coll.distinct("session_id", doc! { "post_id": post.id.unwrap() }, None),
        likes_coll.count_documents(doc! { "post_id": post.id.unwrap() }, None),
        comments_coll.count_documents(doc! { "post_id": post.id.unwrap() }, None),
        shares_coll.count_documents(doc! { "post_id": post.id.unwrap() }, None)
    )?;

    let unique_views = unique_views_res.len() as i32;
    let engagement_rate = if total_views > 0 {
        ((total_likes + total_comments + total_shares) as f64 / total_views as f64) * 100.0
    } else {
        0.0
    };

    Ok(PostDetailResponse {
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
        author_username: None,
        author_avatar: None,
        media_urls: post.media_urls.clone(),
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
        language: Some(post.language.clone()),
        is_featured: post.is_featured,
        is_premium: post.is_premium,
        allow_comments: post.allow_comments,
        allow_sharing: post.allow_sharing,
        seo_title: post.seo_title.clone(),
        seo_description: post.seo_description.clone(),
        seo_keywords: post.seo_keywords.clone(),
        is_nsfw: post.is_nsfw.unwrap_or(false),
        is_anonymous: post.is_anonymous,
        source_url: post.source_url.clone(),
        source_author: post.source_author.clone(),
        plagiarism_score: post.plagiarism_score,
        content_rating: post.content_rating.clone(),
        created_at: post.created_at.to_chrono().to_rfc3339(),
        updated_at: post.updated_at.to_chrono().to_rfc3339(),
        analytics: Some(PostAnalyticsSummary {
            total_views: total_views as i32,
            unique_views,
            total_likes: total_likes as i32,
            total_comments: total_comments as i32,
            total_shares: total_shares as i32,
            avg_reading_time: post.reading_time.map(|rt| rt as f64),
            engagement_rate,
        }),
    })
}

pub async fn create_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreatePostRequest>,
) -> AppResult<impl IntoResponse> {
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    let profile = profiles_collection.find_one(doc! { "user_id": user.user_id }, None).await?
        .ok_or(AppError::NotFound("Profile not found".to_string()))?;

    let posts_collection = state.mongo.collection::<Post>("posts");
    
    let scheduled_publish_date = if let Some(ref s) = payload.scheduled_publish_date {
        Some(chrono::DateTime::parse_from_rfc3339(&s)
            .map_err(|_| AppError::BadRequest("Invalid scheduled_publish_date format".to_string()))?
            .with_timezone(&chrono::Utc).into())
    } else {
        None
    };

    let content = payload.content.clone();
    
    // Extract Tags
    let mut tags = payload.tags.unwrap_or_default();
    let tag_re = Regex::new(r"#(\w+)").unwrap();
    for cap in tag_re.captures_iter(&content) {
        let tag = cap[1].to_lowercase();
        if !tags.contains(&tag) {
            tags.push(tag);
        }
    }

    // Extract Mentions
    let mut mentions = Vec::new();
    let mention_re = Regex::new(r"@(\w+)").unwrap();
    for cap in mention_re.captures_iter(&content) {
        let mention = cap[1].to_lowercase();
        if !mentions.contains(&mention) {
            mentions.push(mention);
        }
    }

    let new_post = Post {
        id: None,
        group_id: None,
        page_id: None,
        author_id: user.user_id,
        author_name: profile.username.clone(),
        title: payload.title.unwrap_or_else(|| "Untitled Post".to_string()),
        content: payload.content,
        excerpt: payload.excerpt,
        slug: "".to_string(),
        status: payload.status.clone().unwrap_or_else(|| "draft".to_string()),
        post_type: payload.post_type.unwrap_or_else(|| "text".to_string()),
        category: payload.category,
        tags: if tags.is_empty() { None } else { Some(tags) },
        mentions: if mentions.is_empty() { None } else { Some(mentions) },
        media_urls: payload.media_urls,
        scheduled_publish_date,
        language: payload.language.unwrap_or_else(|| "en".to_string()),
        is_featured: payload.is_featured.unwrap_or(false),
        is_premium: payload.is_premium.unwrap_or(false),
        allow_comments: payload.allow_comments.unwrap_or(true),
        allow_sharing: payload.allow_sharing.unwrap_or(true),
        seo_title: payload.seo_title,
        seo_description: payload.seo_description,
        seo_keywords: payload.seo_keywords,
        meta_data: payload.meta_data,
        content_rating: payload.content_rating,
        is_nsfw: payload.is_nsfw,
        is_anonymous: payload.is_anonymous.unwrap_or(false),
        location: None,
        poll: None,
        published_at: if payload.status.as_deref().unwrap_or("published") == "published" { Some(bson::DateTime::now()) } else { None },
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        reading_time: None,
        plagiarism_score: None,
        source_url: None,
        source_author: None,
        approved_at: None,
        approved_by: None,
        rejected_at: None,
        rejected_by: None,
        rejection_reason: None,
        created_at: bson::DateTime::now(),
        updated_at: bson::DateTime::now(),
    };

    let result = posts_collection.insert_one(new_post, None).await?;

    let _ = state.cache.invalidate_pattern("posts:list:*").await;
    let _ = state.cache.invalidate_pattern("feed:*").await;

    Ok((StatusCode::CREATED, Json(json!({
        "id": result.inserted_id.as_object_id().unwrap().to_hex(),
        "message": "Post created successfully"
    }))))
}

pub fn post_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_posts_handler).post(create_post_handler))
        .route("/:id", get(get_post_handler).put(update_post_handler).delete(delete_post_handler))
        .route("/:id/approve", post(approve_post_handler))
        .route("/:id/publish", post(publish_post_handler))
        .route("/:id/workflow", get(get_post_workflow_handler))
        .route("/:id/analytics", get(get_post_analytics_handler))
        .route("/:id/poll/vote", post(vote_poll_handler))
        .route("/:id/hide", post(hide_post_handler))
}
