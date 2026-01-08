use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post, put},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use crate::db::AppState;
use crate::models::{
    Reel, ReelView, ReelLike, ReelComment, ReelShare, ReelDuet, ReelStitch, ReelSave,
    ReelAnalytics, UserReelStats, ReelReport, ReelModeration, ReelTranscodingJob,
    Location, Subtitle, Caption, User, Profile
};
use crate::auth::AuthUser;
use futures::stream::StreamExt;

// --- DTOs ---

#[derive(Deserialize)]
pub struct CreateReelRequest {
    pub video_url: String,
    pub thumbnail_url: String,
    pub title: Option<String>,
    pub description: String,
    pub duration: f64,
    pub video_size: i64,
    pub video_format: String,
    pub resolution: String,
    pub bitrate: Option<i32>,
    pub audio_bitrate: Option<i32>,
    pub location: Option<Location>,
    pub hashtags: Option<Vec<String>>,
    pub mentions: Option<Vec<String>>,
    pub music_track: Option<String>,
    pub effects: Option<Vec<String>>,
    pub filters: Option<Vec<String>>,
    pub duet_enabled: bool,
    pub stitch_enabled: bool,
    pub comments_enabled: bool,
    pub shares_enabled: bool,
    pub downloads_enabled: bool,
    pub is_private: bool,
    pub allowed_users: Option<Vec<String>>,
    pub age_restriction: Option<String>,
    pub content_warning: Option<String>,
    pub available_qualities: Option<Vec<String>>,
    pub subtitles: Option<Vec<Subtitle>>,
    pub captions: Option<Vec<Caption>>,
}

#[derive(Deserialize)]
pub struct UpdateReelRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub location: Option<Location>,
    pub hashtags: Option<Vec<String>>,
    pub mentions: Option<Vec<String>>,
    pub music_track: Option<String>,
    pub effects: Option<Vec<String>>,
    pub filters: Option<Vec<String>>,
    pub duet_enabled: Option<bool>,
    pub stitch_enabled: Option<bool>,
    pub comments_enabled: Option<bool>,
    pub shares_enabled: Option<bool>,
    pub downloads_enabled: Option<bool>,
    pub is_private: Option<bool>,
    pub allowed_users: Option<Vec<String>>,
    pub age_restriction: Option<String>,
    pub content_warning: Option<String>,
    pub moderation_notes: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateReelViewRequest {
    pub viewer_id: String,
    pub viewer_username: String,
    pub view_duration: f64,
    pub completion_rate: f64,
    pub is_replay: bool,
    pub location: Option<Location>,
    pub device_info: Option<String>,
    pub referrer: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateReelCommentRequest {
    pub content: String,
    pub parent_comment_id: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateReelShareRequest {
    pub platform: String,
    pub share_type: String,
}

#[derive(Deserialize)]
pub struct CreateReelDuetRequest {
    pub original_reel_id: String,
    pub duet_type: String,
}

#[derive(Deserialize)]
pub struct CreateReelStitchRequest {
    pub original_reel_id: String,
    pub stitch_duration: f64,
}

#[derive(Deserialize)]
pub struct ModerateReelRequest {
    pub action: String, // approve, reject, delete, edit, warn
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub after_description: Option<String>,
}

#[derive(Deserialize)]
pub struct ReelFilter {
    pub status: Option<String>,
    pub user_id: Option<String>,
    pub resolution: Option<String>,
    pub duration_min: Option<f64>,
    pub duration_max: Option<f64>,
    pub size_min: Option<i64>,
    pub size_max: Option<i64>,
    pub duet_enabled: Option<bool>,
    pub stitch_enabled: Option<bool>,
    pub comments_enabled: Option<bool>,
    pub spam_score_min: Option<f64>,
    pub spam_score_max: Option<f64>,
    pub reported_count_min: Option<i32>,
    pub trending_score_min: Option<f64>,
    pub transcoding_status: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct ReelResponse {
    pub id: String,
    pub user_id: String,
    pub username: String,
    pub user_avatar: Option<String>,
    pub video_url: String,
    pub thumbnail_url: String,
    pub title: Option<String>,
    pub description: String,
    pub duration: f64,
    pub video_size: i64,
    pub video_format: String,
    pub resolution: String,
    pub bitrate: Option<i32>,
    pub audio_bitrate: Option<i32>,
    pub location: Option<Location>,
    pub hashtags: Option<Vec<String>>,
    pub mentions: Option<Vec<String>>,
    pub music_track: Option<String>,
    pub effects: Option<Vec<String>>,
    pub filters: Option<Vec<String>>,
    pub duet_enabled: bool,
    pub stitch_enabled: bool,
    pub comments_enabled: bool,
    pub shares_enabled: bool,
    pub downloads_enabled: bool,
    pub is_private: bool,
    pub allowed_users: Option<Vec<String>>,
    pub age_restriction: Option<String>,
    pub content_warning: Option<String>,
    pub created_at: String,
    pub published_at: Option<String>,
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
    pub like_count: i32,
    pub comment_count: i32,
    pub share_count: i32,
    pub duet_count: i32,
    pub stitch_count: i32,
    pub save_count: i32,
    pub engagement_score: f64,
    pub trending_score: f64,
    pub virality_score: f64,
    pub updated_at: String,
    pub transcoding_status: String,
    pub transcoding_progress: Option<f64>,
    pub transcoding_error: Option<String>,
    pub available_qualities: Option<Vec<String>>,
    pub subtitles: Option<Vec<Subtitle>>,
    pub captions: Option<Vec<Caption>>,
    pub views: Vec<ReelView>,
    pub likes: Vec<ReelLike>,
    pub comments: Vec<ReelComment>,
    pub shares: Vec<ReelShare>,
    pub duets: Vec<ReelDuet>,
    pub stitches: Vec<ReelStitch>,
    pub saves: Vec<ReelSave>,
    pub reports: Vec<ReelReport>,
    pub moderation_history: Vec<ReelModeration>,
    pub analytics: Vec<ReelAnalytics>,
}

#[derive(Serialize)]
pub struct ReelModerationQueueResponse {
    pub reel_id: String,
    pub user_id: String,
    pub username: String,
    pub video_url: String,
    pub thumbnail_url: String,
    pub title: Option<String>,
    pub description: String,
    pub resolution: String,
    pub duration: f64,
    pub spam_score: f64,
    pub sentiment_score: f64,
    pub reported_count: i32,
    pub transcoding_status: String,
    pub created_at: String,
    pub priority: String,
    pub assigned_to: Option<String>,
    pub assigned_at: Option<String>,
}

#[derive(Serialize)]
pub struct UserReelStatsResponse {
    pub user_id: String,
    pub username: String,
    pub total_reels: i32,
    pub active_reels: i32,
    pub deleted_reels: i32,
    pub total_views: i64,
    pub total_likes: i64,
    pub total_comments: i64,
    pub total_shares: i64,
    pub total_duets: i64,
    pub total_stitches: i64,
    pub total_saves: i64,
    pub avg_completion_rate: f64,
    pub avg_engagement_rate: f64,
    pub avg_trending_score: f64,
    pub avg_virality_score: f64,
    pub avg_view_duration: f64,
    pub top_reel_id: Option<String>,
    pub follower_growth: i32,
    pub last_reel_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
pub struct CreateReelTranscodingJobRequest {
    pub reel_id: String,
    pub target_qualities: Vec<String>,
}

#[derive(Deserialize)]
pub struct UpdateTranscodingProgressRequest {
    pub progress: f64,
    pub current_quality: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
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

pub async fn list_reels_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<ReelFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let reels = state.mongo.collection::<Reel>("reels");
    
    let mut query = doc! {};
    
    if let Some(status) = &params.status {
        query.insert("moderation_status", status);
    }
    
    if let Some(user_id) = &params.user_id {
        let oid = ObjectId::parse_str(user_id)
            .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;
        query.insert("user_id", oid);
    }

    if let Some(resolution) = &params.resolution {
        query.insert("resolution", resolution);
    }

    if let Some(duration_min) = params.duration_min {
        query.insert("duration", doc! { "$gte": duration_min });
    }

    if let Some(duration_max) = params.duration_max {
        query.insert("duration", doc! { "$lte": duration_max });
    }

    if let Some(size_min) = params.size_min {
        query.insert("video_size", doc! { "$gte": size_min });
    }

    if let Some(size_max) = params.size_max {
        query.insert("video_size", doc! { "$lte": size_max });
    }

    if let Some(duet_enabled) = params.duet_enabled {
        query.insert("duet_enabled", duet_enabled);
    }

    if let Some(stitch_enabled) = params.stitch_enabled {
        query.insert("stitch_enabled", stitch_enabled);
    }

    if let Some(comments_enabled) = params.comments_enabled {
        query.insert("comments_enabled", comments_enabled);
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

    if let Some(trending_score_min) = params.trending_score_min {
        query.insert("trending_score", doc! { "$gte": trending_score_min });
    }

    if let Some(transcoding_status) = &params.transcoding_status {
        query.insert("transcoding_status", transcoding_status);
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

    let mut cursor = reels.find(query, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut reels_list = Vec::new();
    let mut total_count = 0;
    
    while let Some(reel) = cursor.next().await {
        if let Ok(r) = reel {
            let reel_info = build_reel_response(&r, &state).await?;
            reels_list.push(reel_info);
            total_count += 1;
        }
    }

    // Apply pagination
    let start = skip as usize;
    let end = (start + limit as usize).min(reels_list.len());
    let paginated_reels = reels_list.into_iter().skip(start).take(end - start).collect::<Vec<_>>();

    Ok((StatusCode::OK, Json(json!({
        "reels": paginated_reels,
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

pub async fn get_reel_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(reel_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&reel_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid reel ID"}))))?;

    let reels = state.mongo.collection::<Reel>("reels");
    let reel = reels.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Reel not found"}))))?;

    let reel_info = build_reel_response(&reel, &state).await?;
    Ok((StatusCode::OK, Json(reel_info)))
}

pub async fn moderate_reel_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(reel_id): Path<String>,
    Json(payload): Json<ModerateReelRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&reel_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid reel ID"}))))?;

    let reels = state.mongo.collection::<Reel>("reels");
    let reel = reels.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Reel not found"}))))?;

    let mut update_doc = doc! {};
    let mut new_status = reel.moderation_status.clone();

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
            if let Some(new_description) = &payload.after_description {
                update_doc.insert("description", new_description);
            }
            update_doc.insert("moderation_notes", payload.notes.clone());
        },
        "warn" => {
            update_doc.insert("moderation_notes", format!("Warning: {}", payload.reason.clone().unwrap_or_default()));
        },
        _ => return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid moderation action"})))),
    }

    update_doc.insert("updated_at", DateTime::now());

    reels.update_one(
        doc! { "_id": oid },
        doc! { "$set": update_doc },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Create moderation record
    let moderation = state.mongo.collection::<ReelModeration>("reel_moderation");
    let moderation_record = ReelModeration {
        id: None,
        reel_id: oid,
        moderator_id: user.user_id,
        moderator_name: reel.username,
        action: payload.action,
        reason: payload.reason,
        notes: payload.notes,
        created_at: DateTime::now(),
    };

    moderation.insert_one(moderation_record, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Update user stats
    update_user_reel_stats(&state, reel.user_id).await?;

    Ok((StatusCode::OK, Json(json!({"message": format!("Reel {} successfully", new_status)}))))
}

pub async fn delete_reel_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(reel_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&reel_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid reel ID"}))))?;

    let reels = state.mongo.collection::<Reel>("reels");
    
    reels.update_one(
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
    let reel = reels.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Reel not found"}))))?;

    update_user_reel_stats(&state, reel.user_id).await?;

    Ok((StatusCode::OK, Json(json!({"message": "Reel deleted successfully"}))))
}

pub async fn get_moderation_queue_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<ReelFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let reels = state.mongo.collection::<Reel>("reels");
    
    let mut query = doc! {
        "$or": [
            doc! { "moderation_status": "pending" },
            doc! { "moderation_status": "rejected" },
            doc! { "reported_count": { "$gt": 0 } }
        ]
    };
    
    if let Some(resolution) = &params.resolution {
        query.insert("resolution", resolution);
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

    let mut cursor = reels.find(query, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut queue_items = Vec::new();
    
    while let Some(reel) = cursor.next().await {
        if let Ok(r) = reel {
            let queue_item = ReelModerationQueueResponse {
                reel_id: r.id.unwrap().to_hex(),
                user_id: r.user_id.to_hex(),
                username: r.username,
                video_url: r.video_url,
                thumbnail_url: r.thumbnail_url,
                title: r.title,
                description: r.description,
                resolution: r.resolution,
                duration: r.duration,
                spam_score: r.spam_score.unwrap_or(0.0),
                sentiment_score: r.sentiment_score.unwrap_or(0.0),
                reported_count: r.reported_count,
                transcoding_status: r.transcoding_status.clone(),
                created_at: r.created_at.to_chrono().to_rfc3339(),
                priority: determine_reel_priority(r.spam_score.unwrap_or(0.0), r.reported_count, &r.transcoding_status),
                assigned_to: None,
                assigned_at: None,
            };
            queue_items.push(queue_item);
        }
    }

    Ok((StatusCode::OK, Json(queue_items)))
}

pub async fn get_user_reel_stats_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&user_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;

    let stats = state.mongo.collection::<UserReelStats>("user_reel_stats");
    let user_stats = stats.find_one(doc! { "user_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    if let Some(stats) = user_stats {
        let stats_response = UserReelStatsResponse {
            user_id: stats.user_id.to_hex(),
            username: stats.username,
            total_reels: stats.total_reels,
            active_reels: stats.active_reels,
            deleted_reels: stats.deleted_reels,
            total_views: stats.total_views,
            total_likes: stats.total_likes,
            total_comments: stats.total_comments,
            total_shares: stats.total_shares,
            total_duets: stats.total_duets,
            total_stitches: stats.total_stitches,
            total_saves: stats.total_saves,
            avg_completion_rate: stats.avg_completion_rate,
            avg_engagement_rate: stats.avg_engagement_rate,
            avg_trending_score: stats.avg_trending_score,
            avg_virality_score: stats.avg_virality_score,
            avg_view_duration: stats.avg_view_duration,
            top_reel_id: stats.top_reel_id.map(|id| id.to_hex()),
            follower_growth: stats.follower_growth,
            last_reel_at: stats.last_reel_at.map(|dt| dt.to_chrono().to_rfc3339()),
            created_at: stats.created_at.to_chrono().to_rfc3339(),
            updated_at: stats.updated_at.to_chrono().to_rfc3339(),
        };
        Ok((StatusCode::OK, Json(stats_response)))
    } else {
        Err((StatusCode::NOT_FOUND, Json(json!({"error": "User stats not found"}))))
    }
}

pub async fn list_transcoding_jobs_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let jobs = state.mongo.collection::<ReelTranscodingJob>("reel_transcoding_jobs");
    let mut cursor = jobs.find(doc! {}, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut jobs_list = Vec::new();
    while let Some(job) = cursor.next().await {
        if let Ok(j) = job {
            jobs_list.push(j);
        }
    }

    Ok((StatusCode::OK, Json(jobs_list)))
}

pub async fn update_transcoding_progress_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(job_id): Path<String>,
    Json(payload): Json<UpdateTranscodingProgressRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&job_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid job ID"}))))?;

    let jobs = state.mongo.collection::<ReelTranscodingJob>("reel_transcoding_jobs");
    
    let mut update_doc = doc! {
        "progress": payload.progress,
        "status": payload.status.clone(),
        "updated_at": DateTime::now()
    };

    if let Some(current_quality) = payload.current_quality {
        update_doc.insert("current_quality", current_quality);
    }

    if let Some(error_message) = payload.error_message {
        update_doc.insert("error_message", error_message);
    }

    if payload.status == "completed" {
        update_doc.insert("completed_at", DateTime::now());
    }

    jobs.update_one(
        doc! { "_id": oid },
        doc! { "$set": update_doc },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Transcoding progress updated"}))))
}

// --- Helper Functions ---

async fn build_reel_response(
    reel: &Reel,
    state: &Arc<AppState>,
) -> Result<ReelResponse, (StatusCode, Json<serde_json::Value>)> {
    // Get views
    let views = state.mongo.collection::<ReelView>("reel_views");
    let mut views_cursor = views.find(doc! { "reel_id": reel.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut views_list = Vec::new();
    while let Some(view) = views_cursor.next().await {
        if let Ok(v) = view {
            views_list.push(v);
        }
    }

    // Get likes
    let likes = state.mongo.collection::<ReelLike>("reel_likes");
    let mut likes_cursor = likes.find(doc! { "reel_id": reel.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut likes_list = Vec::new();
    while let Some(like) = likes_cursor.next().await {
        if let Ok(l) = like {
            likes_list.push(l);
        }
    }

    // Get comments
    let comments = state.mongo.collection::<ReelComment>("reel_comments");
    let mut comments_cursor = comments.find(doc! { "reel_id": reel.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut comments_list = Vec::new();
    while let Some(comment) = comments_cursor.next().await {
        if let Ok(c) = comment {
            comments_list.push(c);
        }
    }

    // Get shares
    let shares = state.mongo.collection::<ReelShare>("reel_shares");
    let mut shares_cursor = shares.find(doc! { "reel_id": reel.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut shares_list = Vec::new();
    while let Some(share) = shares_cursor.next().await {
        if let Ok(s) = share {
            shares_list.push(s);
        }
    }

    // Get duets
    let duets = state.mongo.collection::<ReelDuet>("reel_duets");
    let mut duets_cursor = duets.find(doc! { "reel_id": reel.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut duets_list = Vec::new();
    while let Some(duet) = duets_cursor.next().await {
        if let Ok(d) = duet {
            duets_list.push(d);
        }
    }

    // Get stitches
    let stitches = state.mongo.collection::<ReelStitch>("reel_stitches");
    let mut stitches_cursor = stitches.find(doc! { "reel_id": reel.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut stitches_list = Vec::new();
    while let Some(stitch) = stitches_cursor.next().await {
        if let Ok(s) = stitch {
            stitches_list.push(s);
        }
    }

    // Get saves
    let saves = state.mongo.collection::<ReelSave>("reel_saves");
    let mut saves_cursor = saves.find(doc! { "reel_id": reel.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut saves_list = Vec::new();
    while let Some(save) = saves_cursor.next().await {
        if let Ok(s) = save {
            saves_list.push(s);
        }
    }

    // Get reports
    let reports = state.mongo.collection::<ReelReport>("reel_reports");
    let mut reports_cursor = reports.find(doc! { "reel_id": reel.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut reports_list = Vec::new();
    while let Some(report) = reports_cursor.next().await {
        if let Ok(r) = report {
            reports_list.push(r);
        }
    }

    // Get moderation history
    let moderation = state.mongo.collection::<ReelModeration>("reel_moderation");
    let mut moderation_cursor = moderation.find(doc! { "reel_id": reel.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut moderation_list = Vec::new();
    while let Some(m) = moderation_cursor.next().await {
        if let Ok(moderation_record) = m {
            moderation_list.push(moderation_record);
        }
    }

    // Get analytics
    let analytics = state.mongo.collection::<ReelAnalytics>("reel_analytics");
    let mut analytics_cursor = analytics.find(doc! { "reel_id": reel.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut analytics_list = Vec::new();
    while let Some(analytics_record) = analytics_cursor.next().await {
        if let Ok(a) = analytics_record {
            analytics_list.push(a);
        }
    }

    Ok(ReelResponse {
        id: reel.id.unwrap().to_hex(),
        user_id: reel.user_id.to_hex(),
        username: reel.username.clone(),
        user_avatar: reel.user_avatar.clone(),
        video_url: reel.video_url.clone(),
        thumbnail_url: reel.thumbnail_url.clone(),
        title: reel.title.clone(),
        description: reel.description.clone(),
        duration: reel.duration,
        video_size: reel.video_size,
        video_format: reel.video_format.clone(),
        resolution: reel.resolution.clone(),
        bitrate: reel.bitrate,
        audio_bitrate: reel.audio_bitrate,
        location: reel.location.clone(),
        hashtags: reel.hashtags.clone(),
        mentions: reel.mentions.clone(),
        music_track: reel.music_track.clone(),
        effects: reel.effects.clone(),
        filters: reel.filters.clone(),
        duet_enabled: reel.duet_enabled,
        stitch_enabled: reel.stitch_enabled,
        comments_enabled: reel.comments_enabled,
        shares_enabled: reel.shares_enabled,
        downloads_enabled: reel.downloads_enabled,
        is_private: reel.is_private,
        allowed_users: reel.allowed_users.clone().map(|ids| ids.iter().map(|id| id.to_hex()).collect()),
        age_restriction: reel.age_restriction.clone(),
        content_warning: reel.content_warning.clone(),
        created_at: reel.created_at.to_chrono().to_rfc3339(),
        published_at: reel.published_at.map(|dt| dt.to_chrono().to_rfc3339()),
        is_deleted: reel.is_deleted,
        deleted_at: reel.deleted_at.map(|dt| dt.to_chrono().to_rfc3339()),
        deleted_by: reel.deleted_by.map(|id| id.to_hex()),
        deleted_reason: reel.deleted_reason.clone(),
        moderation_status: reel.moderation_status.clone(),
        moderation_notes: reel.moderation_notes.clone(),
        spam_score: reel.spam_score,
        sentiment_score: reel.sentiment_score,
        reported_count: reel.reported_count,
        view_count: reel.view_count,
        like_count: reel.like_count,
        comment_count: reel.comment_count,
        share_count: reel.share_count,
        duet_count: reel.duet_count,
        stitch_count: reel.stitch_count,
        save_count: reel.save_count,
        engagement_score: reel.engagement_score,
        trending_score: reel.trending_score,
        virality_score: reel.virality_score,
        updated_at: reel.updated_at.to_chrono().to_rfc3339(),
        transcoding_status: reel.transcoding_status.clone(),
        transcoding_progress: reel.transcoding_progress,
        transcoding_error: reel.transcoding_error.clone(),
        available_qualities: reel.available_qualities.clone(),
        subtitles: reel.subtitles.clone(),
        captions: reel.captions.clone(),
        views: views_list,
        likes: likes_list,
        comments: comments_list,
        shares: shares_list,
        duets: duets_list,
        stitches: stitches_list,
        saves: saves_list,
        reports: reports_list,
        moderation_history: moderation_list,
        analytics: analytics_list,
    })
}

async fn update_user_reel_stats(
    state: &Arc<AppState>,
    user_id: ObjectId,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let reels = state.mongo.collection::<Reel>("reels");
    
    // Count reels by status
    let total_reels = reels.count_documents(doc! { "user_id": user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let active_reels = reels.count_documents(doc! { 
        "user_id": user_id, 
        "is_deleted": false, 
        "moderation_status": "approved" 
    }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let deleted_reels = reels.count_documents(doc! { 
        "user_id": user_id, 
        "is_deleted": true 
    }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Calculate totals
    let mut total_views = 0i64;
    let mut total_likes = 0i64;
    let mut total_comments = 0i64;
    let mut total_shares = 0i64;
    let mut total_duets = 0i64;
    let mut total_stitches = 0i64;
    let mut total_saves = 0i64;
    let mut avg_completion_rate = 0.0;
    let mut avg_engagement_rate = 0.0;
    let mut avg_trending_score = 0.0;
    let mut avg_virality_score = 0.0;
    let mut avg_view_duration = 0.0;

    let mut cursor = reels.find(doc! { "user_id": user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let mut reel_count = 0;
    let mut top_reel_id = None;
    let mut max_views = 0;
    
    while let Some(reel) = cursor.next().await {
        if let Ok(r) = reel {
            total_views += r.view_count as i64;
            total_likes += r.like_count as i64;
            total_comments += r.comment_count as i64;
            total_shares += r.share_count as i64;
            total_duets += r.duet_count as i64;
            total_stitches += r.stitch_count as i64;
            total_saves += r.save_count as i64;
            
            if r.view_count > max_views {
                max_views = r.view_count;
                top_reel_id = r.id;
            }
            
            reel_count += 1;
        }
    }

    if reel_count > 0 {
        avg_completion_rate = 0.0; // Would need view analytics data
        avg_engagement_rate = (total_comments as f64 / total_views as f64) * 100.0;
        avg_trending_score = 0.0; // Would need trending analytics
        avg_virality_score = 0.0; // Would need virality analytics
        avg_view_duration = 0.0; // Would need view duration analytics
    }

    // Get user info
    let profiles = state.mongo.collection::<Profile>("profiles");
    let user_profile = profiles.find_one(doc! { "user_id": user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "User profile not found"}))))?;

    // Update or create stats
    let stats = state.mongo.collection::<UserReelStats>("user_reel_stats");
    let stats_doc = UserReelStats {
        id: None,
        user_id,
        username: user_profile.username,
        total_reels: total_reels as i32,
        active_reels: active_reels as i32,
        deleted_reels: deleted_reels as i32,
        total_views,
        total_likes,
        total_comments,
        total_shares,
        total_duets,
        total_stitches,
        total_saves,
        avg_completion_rate,
        avg_engagement_rate,
        avg_trending_score,
        avg_virality_score,
        avg_view_duration,
        top_reel_id,
        follower_growth: 0, // Would need follower tracking
        last_reel_at: None, // Would need to find latest reel
        created_at: DateTime::now(),
        updated_at: DateTime::now(),
    };

    stats.update_one(
        doc! { "user_id": user_id },
        doc! { "$set": mongodb::bson::to_document(&stats_doc).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))? },
        Some(mongodb::options::UpdateOptions::builder().upsert(true).build())
    ).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(())
}

fn determine_reel_priority(spam_score: f64, reported_count: i32, transcoding_status: &str) -> String {
    if spam_score > 0.8 || reported_count > 5 || transcoding_status == "failed" {
        "high".to_string()
    } else if spam_score > 0.5 || reported_count > 2 || transcoding_status == "processing" {
        "medium".to_string()
    } else {
        "low".to_string()
    }
}

pub fn reel_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_reels_handler))
        .route("/:id", get(get_reel_handler).put(moderate_reel_handler).delete(delete_reel_handler))
        .route("/:id/moderate", post(moderate_reel_handler))
        .route("/queue", get(get_moderation_queue_handler))
        .route("/stats/:user_id", get(get_user_reel_stats_handler))
        .route("/transcoding", get(list_transcoding_jobs_handler))
        .route("/transcoding/:job_id", put(update_transcoding_progress_handler))
}