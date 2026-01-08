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
use crate::models::{
    Story, StoryView, StoryReply, UserStoryStats,
    StoryReport, StoryModeration, StorySchedule, StoryTemplate,
    User, Profile, Location
};
use crate::auth::AuthUser;
use futures::stream::StreamExt;

// --- DTOs ---

#[derive(Deserialize)]
pub struct CreateStoryRequest {
    pub media_url: String,
    pub media_type: String, // image, video, text
    pub caption: Option<String>,
    pub location: Option<Location>,
    pub hashtags: Option<Vec<String>>,
    pub mentions: Option<Vec<String>>,
    pub is_highlight: bool,
    pub highlight_category: Option<String>,
    pub story_type: Option<String>, // normal, live, poll, question, quiz
    pub story_data: Option<serde_json::Value>,
    pub is_private: bool,
    pub allowed_users: Option<Vec<String>>, // user IDs as strings
}

#[derive(Deserialize)]
pub struct UpdateStoryRequest {
    pub caption: Option<String>,
    pub location: Option<Location>,
    pub hashtags: Option<Vec<String>>,
    pub mentions: Option<Vec<String>>,
    pub is_highlight: Option<bool>,
    pub highlight_category: Option<String>,
    pub story_type: Option<String>,
    pub story_data: Option<serde_json::Value>,
    pub is_private: Option<bool>,
    pub allowed_users: Option<Vec<String>>,
    pub moderation_notes: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateStoryViewRequest {
    pub viewer_id: String,
    pub viewer_username: String,
    pub view_duration: Option<i32>,
    pub is_replay: bool,
    pub location: Option<Location>,
    pub device_info: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateStoryReplyRequest {
    pub content: String,
    pub reply_type: String, // text, emoji, sticker
}

#[derive(Deserialize)]
pub struct CreateStoryReportRequest {
    pub reason: String,
    pub description: Option<String>,
}

#[derive(Deserialize)]
pub struct ModerateStoryRequest {
    pub action: String, // approve, reject, delete, edit, warn
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub after_caption: Option<String>,
}

#[derive(Deserialize)]
pub struct StoryFilter {
    pub status: Option<String>,
    pub user_id: Option<String>,
    pub media_type: Option<String>,
    pub story_type: Option<String>,
    pub is_highlight: Option<bool>,
    pub is_private: Option<bool>,
    pub spam_score_min: Option<f64>,
    pub spam_score_max: Option<f64>,
    pub reported_count_min: Option<i32>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct StoryResponse {
    pub id: String,
    pub user_id: String,
    pub username: String,
    pub user_avatar: Option<String>,
    pub media_url: String,
    pub media_type: String,
    pub caption: Option<String>,
    pub location: Option<Location>,
    pub hashtags: Option<Vec<String>>,
    pub mentions: Option<Vec<String>>,
    pub is_highlight: bool,
    pub highlight_category: Option<String>,
    pub created_at: String,
    pub expires_at: String,
    pub is_deleted: bool,
    pub deleted_at: Option<String>,
    pub deleted_by: Option<String>,
    pub deleted_reason: Option<String>,
    pub moderation_status: String,
    pub moderation_notes: Option<String>,
    pub spam_score: Option<f64>,
    pub sentiment_score: Option<f64>,
    pub reported_count: i32,
    pub view_count: i32,
    pub reply_count: i32,
    pub engagement_score: f64,
    pub is_private: bool,
    pub allowed_users: Option<Vec<String>>,
    pub story_type: String,
    pub story_data: Option<serde_json::Value>,
    pub updated_at: String,
    pub views: Vec<StoryView>,
    pub replies: Vec<StoryReply>,
    pub reports: Vec<StoryReport>,
    pub moderation_history: Vec<StoryModeration>,
}

#[derive(Serialize)]
pub struct StoryModerationQueueResponse {
    pub story_id: String,
    pub user_id: String,
    pub username: String,
    pub media_url: String,
    pub caption: Option<String>,
    pub media_type: String,
    pub spam_score: f64,
    pub sentiment_score: f64,
    pub reported_count: i32,
    pub created_at: String,
    pub priority: String,
    pub assigned_to: Option<String>,
    pub assigned_at: Option<String>,
}

#[derive(Serialize)]
pub struct UserStoryStatsResponse {
    pub user_id: String,
    pub username: String,
    pub total_stories: i32,
    pub active_stories: i32,
    pub expired_stories: i32,
    pub highlights: i32,
    pub total_views: i32,
    pub total_replies: i32,
    pub avg_completion_rate: f64,
    pub avg_engagement_rate: f64,
    pub avg_view_duration: f64,
    pub last_story_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
pub struct CreateStoryScheduleRequest {
    pub scheduled_for: String, // ISO datetime string
    pub media_url: String,
    pub media_type: String,
    pub caption: Option<String>,
    pub hashtags: Option<Vec<String>>,
    pub mentions: Option<Vec<String>>,
    pub is_highlight: bool,
    pub highlight_category: Option<String>,
    pub story_type: Option<String>,
    pub story_data: Option<serde_json::Value>,
}

#[derive(Deserialize)]
pub struct CreateStoryTemplateRequest {
    pub name: String,
    pub description: Option<String>,
    pub background_color: Option<String>,
    pub font_style: Option<String>,
    pub text_color: Option<String>,
    pub layout: Option<serde_json::Value>,
    pub media_overlay: Option<String>,
    pub stickers: Option<Vec<String>>,
    pub is_public: bool,
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

pub async fn list_stories_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<StoryFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let stories = state.mongo.collection::<Story>("stories");
    
    let mut query = doc! {};
    
    if let Some(status) = &params.status {
        query.insert("moderation_status", status);
    }
    
    if let Some(user_id) = &params.user_id {
        let oid = ObjectId::parse_str(user_id)
            .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;
        query.insert("user_id", oid);
    }

    if let Some(media_type) = &params.media_type {
        query.insert("media_type", media_type);
    }

    if let Some(story_type) = &params.story_type {
        query.insert("story_type", story_type);
    }

    if let Some(is_highlight) = params.is_highlight {
        query.insert("is_highlight", is_highlight);
    }

    if let Some(is_private) = params.is_private {
        query.insert("is_private", is_private);
    }

    if let Some(spam_score_min) = params.spam_score_min {
        query.insert("spam_score", doc! { "$gte": spam_score_min });
    }

    if let Some(spam_score_max) = params.spam_score_max {
        query.insert("spam_score", doc! { "$lte": spam_score_max });
    }

    if let Some(reported_count_min) = params.reported_count_min {
        query.insert("reported_count", doc! { "$gte": reported_count_min });
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

    let mut cursor = stories.find(query, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut stories_list = Vec::new();
    let mut total_count = 0;
    
    while let Some(story) = cursor.next().await {
        if let Ok(s) = story {
            let story_info = build_story_response(&s, &state).await?;
            stories_list.push(story_info);
            total_count += 1;
        }
    }

    // Apply pagination
    let start = skip as usize;
    let end = (start + limit as usize).min(stories_list.len());
    let paginated_stories = stories_list.into_iter().skip(start).take(end - start).collect::<Vec<_>>();

    Ok((StatusCode::OK, Json(json!({
        "stories": paginated_stories,
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

pub async fn get_story_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(story_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&story_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid story ID"}))))?;

    let stories = state.mongo.collection::<Story>("stories");
    let story = stories.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Story not found"}))))?;

    let story_info = build_story_response(&story, &state).await?;
    Ok((StatusCode::OK, Json(story_info)))
}

pub async fn moderate_story_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(story_id): Path<String>,
    Json(payload): Json<ModerateStoryRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&story_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid story ID"}))))?;

    let stories = state.mongo.collection::<Story>("stories");
    let story = stories.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Story not found"}))))?;

    let mut update_doc = doc! {};
    let mut new_status = story.moderation_status.clone();

    match payload.action.as_str() {
        "approve" => {
            new_status = "approved".to_string();
            update_doc.insert("moderation_status", "approved");
            update_doc.insert("moderation_notes", payload.notes.clone());
        },
        "reject" => {
            new_status = "rejected".to_string();
            update_doc.insert("moderation_status", "rejected");
            update_doc.insert("moderation_notes", payload.reason.clone());
        },
        "delete" => {
            new_status = "removed".to_string();
            update_doc.insert("moderation_status", "removed");
            update_doc.insert("is_deleted", true);
            update_doc.insert("deleted_at", DateTime::now());
            update_doc.insert("deleted_by", user.user_id);
            update_doc.insert("deleted_reason", payload.reason.clone());
            update_doc.insert("moderation_notes", payload.notes.clone());
        },
        "edit" => {
            if let Some(new_caption) = &payload.after_caption {
                update_doc.insert("caption", new_caption);
            }
            update_doc.insert("moderation_notes", payload.notes.clone());
        },
        "warn" => {
            update_doc.insert("moderation_notes", format!("Warning: {}", payload.reason.clone().unwrap_or_default()));
        },
        _ => return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid moderation action"})))),
    }

    update_doc.insert("updated_at", DateTime::now());

    stories.update_one(
        doc! { "_id": oid },
        doc! { "$set": update_doc },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Create moderation record
    let moderation = state.mongo.collection::<StoryModeration>("story_moderation");
    let moderation_record = StoryModeration {
        id: None,
        story_id: oid,
        moderator_id: user.user_id,
        moderator_name: story.username,
        action: payload.action,
        reason: payload.reason,
        notes: payload.notes,
        created_at: DateTime::now(),
    };

    moderation.insert_one(moderation_record, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Update user stats
    update_user_story_stats(&state, story.user_id).await?;

    Ok((StatusCode::OK, Json(json!({"message": format!("Story {} successfully", new_status)}))))
}

pub async fn delete_story_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(story_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&story_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid story ID"}))))?;

    let stories = state.mongo.collection::<Story>("stories");
    
    stories.update_one(
        doc! { "_id": oid },
        doc! { 
            "$set": { 
                "moderation_status": "removed",
                "is_deleted": true,
                "deleted_at": DateTime::now(),
                "deleted_by": user.user_id,
                "deleted_reason": "Admin deletion",
                "updated_at": DateTime::now()
            }
        },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Update user stats
    let story = stories.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Story not found"}))))?;

    update_user_story_stats(&state, story.user_id).await?;

    Ok((StatusCode::OK, Json(json!({"message": "Story deleted successfully"}))))
}

pub async fn get_moderation_queue_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<StoryFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let stories = state.mongo.collection::<Story>("stories");
    
    let mut query = doc! {
        "$or": [
            doc! { "moderation_status": "pending" },
            doc! { "moderation_status": "rejected" },
            doc! { "reported_count": { "$gt": 0 } }
        ]
    };
    
    if let Some(media_type) = &params.media_type {
        query.insert("media_type", media_type);
    }

    if let Some(spam_score_min) = params.spam_score_min {
        query.insert("spam_score", doc! { "$gte": spam_score_min });
    }

    if let Some(date_from) = &params.date_from {
        if let Ok(date) = chrono::DateTime::parse_from_rfc3339(date_from) {
            query.insert("created_at", doc! { "$gte": date });
        }
    }

    let _sort_doc = doc! { "spam_score": -1, "reported_count": -1, "created_at": 1 };

    let mut cursor = stories.find(query, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut queue_items = Vec::new();
    
    while let Some(story) = cursor.next().await {
        if let Ok(s) = story {
            let queue_item = StoryModerationQueueResponse {
                story_id: s.id.unwrap().to_hex(),
                user_id: s.user_id.to_hex(),
                username: s.username,
                media_url: s.media_url,
                caption: s.caption,
                media_type: s.media_type,
                spam_score: s.spam_score.unwrap_or(0.0),
                sentiment_score: s.sentiment_score.unwrap_or(0.0),
                reported_count: s.reported_count,
                created_at: s.created_at.to_chrono().to_rfc3339(),
                priority: determine_priority(s.spam_score.unwrap_or(0.0), s.reported_count),
                assigned_to: None,
                assigned_at: None,
            };
            queue_items.push(queue_item);
        }
    }

    Ok((StatusCode::OK, Json(queue_items)))
}

pub async fn get_user_story_stats_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&user_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;

    let stats = state.mongo.collection::<UserStoryStats>("user_story_stats");
    let user_stats = stats.find_one(doc! { "user_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    if let Some(stats) = user_stats {
        let stats_response = UserStoryStatsResponse {
            user_id: stats.user_id.to_hex(),
            username: stats.username,
            total_stories: stats.total_stories,
            active_stories: stats.active_stories,
            expired_stories: stats.expired_stories,
            highlights: stats.highlights,
            total_views: stats.total_views,
            total_replies: stats.total_replies,
            avg_completion_rate: stats.avg_completion_rate,
            avg_engagement_rate: stats.avg_engagement_rate,
            avg_view_duration: stats.avg_view_duration,
            last_story_at: stats.last_story_at.map(|dt| dt.to_chrono().to_rfc3339()),
            created_at: stats.created_at.to_chrono().to_rfc3339(),
            updated_at: stats.updated_at.to_chrono().to_rfc3339(),
        };
        Ok((StatusCode::OK, Json(stats_response)))
    } else {
        Err((StatusCode::NOT_FOUND, Json(json!({"error": "User stats not found"}))))
    }
}

pub async fn list_story_schedules_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let schedules = state.mongo.collection::<StorySchedule>("story_schedules");
    let mut cursor = schedules.find(doc! {}, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut schedules_list = Vec::new();
    while let Some(schedule) = cursor.next().await {
        if let Ok(s) = schedule {
            schedules_list.push(s);
        }
    }

    Ok((StatusCode::OK, Json(schedules_list)))
}

pub async fn list_story_templates_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let templates = state.mongo.collection::<StoryTemplate>("story_templates");
    let mut cursor = templates.find(doc! {}, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut templates_list = Vec::new();
    while let Some(template) = cursor.next().await {
        if let Ok(t) = template {
            templates_list.push(t);
        }
    }

    Ok((StatusCode::OK, Json(templates_list)))
}

// --- Helper Functions ---

async fn build_story_response(
    story: &Story,
    state: &Arc<AppState>,
) -> Result<StoryResponse, (StatusCode, Json<serde_json::Value>)> {
    // Get views
    let views = state.mongo.collection::<StoryView>("story_views");
    let mut views_cursor = views.find(doc! { "story_id": story.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut views_list = Vec::new();
    while let Some(view) = views_cursor.next().await {
        if let Ok(v) = view {
            views_list.push(v);
        }
    }

    // Get replies
    let replies = state.mongo.collection::<StoryReply>("story_replies");
    let mut replies_cursor = replies.find(doc! { "story_id": story.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut replies_list = Vec::new();
    while let Some(reply) = replies_cursor.next().await {
        if let Ok(r) = reply {
            replies_list.push(r);
        }
    }

    // Get reports
    let reports = state.mongo.collection::<StoryReport>("story_reports");
    let mut reports_cursor = reports.find(doc! { "story_id": story.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut reports_list = Vec::new();
    while let Some(report) = reports_cursor.next().await {
        if let Ok(r) = report {
            reports_list.push(r);
        }
    }

    // Get moderation history
    let moderation = state.mongo.collection::<StoryModeration>("story_moderation");
    let mut moderation_cursor = moderation.find(doc! { "story_id": story.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut moderation_list = Vec::new();
    while let Some(m) = moderation_cursor.next().await {
        if let Ok(moderation_record) = m {
            moderation_list.push(moderation_record);
        }
    }

    Ok(StoryResponse {
        id: story.id.unwrap().to_hex(),
        user_id: story.user_id.to_hex(),
        username: story.username.clone(),
        user_avatar: story.user_avatar.clone(),
        media_url: story.media_url.clone(),
        media_type: story.media_type.clone(),
        caption: story.caption.clone(),
        location: story.location.clone(),
        hashtags: story.hashtags.clone(),
        mentions: story.mentions.clone(),
        is_highlight: story.is_highlight,
        highlight_category: story.highlight_category.clone(),
        created_at: story.created_at.to_chrono().to_rfc3339(),
        expires_at: story.expires_at.to_chrono().to_rfc3339(),
        is_deleted: story.is_deleted,
        deleted_at: story.deleted_at.map(|dt| dt.to_chrono().to_rfc3339()),
        deleted_by: story.deleted_by.map(|id| id.to_hex()),
        deleted_reason: story.deleted_reason.clone(),
        moderation_status: story.moderation_status.clone(),
        moderation_notes: story.moderation_notes.clone(),
        spam_score: story.spam_score,
        sentiment_score: story.sentiment_score,
        reported_count: story.reported_count,
        view_count: story.view_count,
        reply_count: story.reply_count,
        engagement_score: story.engagement_score,
        is_private: story.is_private,
        allowed_users: story.allowed_users.clone().map(|ids| ids.iter().map(|id| id.to_hex()).collect()),
        story_type: story.story_type.clone(),
        story_data: story.story_data.clone(),
        updated_at: story.updated_at.to_chrono().to_rfc3339(),
        views: views_list,
        replies: replies_list,
        reports: reports_list,
        moderation_history: moderation_list,
    })
}

async fn update_user_story_stats(
    state: &Arc<AppState>,
    user_id: ObjectId,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let stories = state.mongo.collection::<Story>("stories");
    
    // Count stories by status
    let total_stories = stories.count_documents(doc! { "user_id": user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let active_stories = stories.count_documents(doc! { 
        "user_id": user_id, 
        "is_deleted": false, 
        "expires_at": { "$gt": DateTime::now() } 
    }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let expired_stories = stories.count_documents(doc! { 
        "user_id": user_id, 
        "is_deleted": false, 
        "expires_at": { "$lt": DateTime::now() } 
    }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let highlights = stories.count_documents(doc! { "user_id": user_id, "is_highlight": true }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Calculate averages
    let mut avg_completion_rate = 0.0;
    let mut avg_engagement_rate = 0.0;
    let mut avg_view_duration = 0.0;
    let mut total_views = 0;
    let mut total_replies = 0;

    let mut cursor = stories.find(doc! { "user_id": user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let mut story_count = 0;
    while let Some(story) = cursor.next().await {
        if let Ok(s) = story {
            total_views += s.view_count;
            total_replies += s.reply_count;
            story_count += 1;
        }
    }

    if story_count > 0 {
        avg_completion_rate = 0.0; // Would need analytics data
        avg_engagement_rate = (total_replies as f64 / total_views as f64) * 100.0;
        avg_view_duration = 0.0; // Would need view duration data
    }

    // Get last story date
    let last_story = stories.find_one(
        doc! { "user_id": user_id },
        Some(mongodb::options::FindOneOptions::builder().sort(doc! { "created_at": -1 }).build())
    ).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Get user info
    let profiles = state.mongo.collection::<Profile>("profiles");
    let user_profile = profiles.find_one(doc! { "user_id": user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "User profile not found"}))))?;

    // Update or create stats
    let stats = state.mongo.collection::<UserStoryStats>("user_story_stats");
    let stats_doc = UserStoryStats {
        id: None,
        user_id,
        username: user_profile.username,
        total_stories: total_stories as i32,
        active_stories: active_stories as i32,
        expired_stories: expired_stories as i32,
        highlights: highlights as i32,
        total_views,
        total_replies,
        avg_completion_rate,
        avg_engagement_rate,
        avg_view_duration,
        last_story_at: last_story.map(|s| s.created_at),
        created_at: DateTime::now(),
        updated_at: DateTime::now(),
    };

    stats.update_one(
        doc! { "user_id": user_id },
        doc! { "$set": mongodb::bson::to_document(&stats_doc).unwrap() },
        Some(mongodb::options::UpdateOptions::builder().upsert(true).build())
    ).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(())
}

fn determine_priority(spam_score: f64, reported_count: i32) -> String {
    if spam_score > 0.8 || reported_count > 5 {
        "high".to_string()
    } else if spam_score > 0.5 || reported_count > 2 {
        "medium".to_string()
    } else {
        "low".to_string()
    }
}

pub fn story_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_stories_handler))
        .route("/:id", get(get_story_handler).put(moderate_story_handler).delete(delete_story_handler))
        .route("/:id/moderate", post(moderate_story_handler))
        .route("/queue", get(get_moderation_queue_handler))
        .route("/stats/:user_id", get(get_user_story_stats_handler))
        .route("/schedules", get(list_story_schedules_handler))
        .route("/templates", get(list_story_templates_handler))
}
