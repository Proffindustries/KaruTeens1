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
use crate::models::{Comment, CommentReport, CommentModeration, UserCommentStats, SpamDetectionRule, User, Profile};
use crate::auth::AuthUser;
use futures::stream::StreamExt;

// --- DTOs ---

#[derive(Deserialize)]
pub struct CreateCommentRequest {
    pub content_id: String,
    pub content_type: String,
    pub parent_id: Option<String>,
    pub content: String,
}

#[derive(Deserialize)]
pub struct UpdateCommentRequest {
    pub content: String,
    pub moderation_notes: Option<String>,
}

#[derive(Deserialize)]
pub struct ReportCommentRequest {
    pub reason: String,
    pub description: Option<String>,
}

#[derive(Deserialize)]
pub struct ModerateCommentRequest {
    pub action: String, // approve, reject, delete, edit, warn
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub after_content: Option<String>,
}

#[derive(Deserialize)]
pub struct CommentFilter {
    pub status: Option<String>,
    pub content_type: Option<String>,
    pub user_id: Option<String>,
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
pub struct CommentResponse {
    pub id: String,
    pub content_id: String,
    pub content_type: String,
    pub user_id: String,
    pub username: String,
    pub user_avatar: Option<String>,
    pub parent_id: Option<String>,
    pub content: String,
    pub status: String,
    pub spam_score: Option<f64>,
    pub sentiment_score: Option<f64>,
    pub reported_count: i32,
    pub likes: i32,
    pub replies_count: i32,
    pub edited_at: Option<String>,
    pub deleted_at: Option<String>,
    pub deleted_by: Option<String>,
    pub deleted_reason: Option<String>,
    pub moderation_notes: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub is_edited: bool,
    pub created_at: String,
    pub updated_at: String,
    pub reports: Vec<CommentReport>,
    pub moderation_history: Vec<CommentModeration>,
}

#[derive(Serialize)]
pub struct CommentModerationQueueResponse {
    pub comment_id: String,
    pub content_id: String,
    pub content_type: String,
    pub user_id: String,
    pub username: String,
    pub content: String,
    pub spam_score: f64,
    pub sentiment_score: f64,
    pub reported_count: i32,
    pub created_at: String,
    pub priority: String,
    pub assigned_to: Option<String>,
    pub assigned_at: Option<String>,
}

#[derive(Serialize)]
pub struct UserCommentStatsResponse {
    pub user_id: String,
    pub username: String,
    pub total_comments: i32,
    pub approved_comments: i32,
    pub pending_comments: i32,
    pub rejected_comments: i32,
    pub spam_comments: i32,
    pub deleted_comments: i32,
    pub total_likes_received: i32,
    pub total_replies_received: i32,
    pub avg_spam_score: Option<f64>,
    pub avg_sentiment_score: Option<f64>,
    pub last_comment_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
pub struct SpamRuleRequest {
    pub name: String,
    pub description: String,
    pub pattern: String,
    pub score: f64,
    pub category: String,
    pub is_active: bool,
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

pub async fn list_comments_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<CommentFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let comments = state.mongo.collection::<Comment>("comments");
    
    let mut query = doc! {};
    
    if let Some(status) = &params.status {
        query.insert("status", status);
    }
    
    if let Some(content_type) = &params.content_type {
        query.insert("content_type", content_type);
    }
    
    if let Some(user_id) = &params.user_id {
        let oid = ObjectId::parse_str(user_id)
            .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;
        query.insert("user_id", oid);
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

    let mut cursor = comments.find(query, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut comments_list = Vec::new();
    let mut total_count = 0;
    
    while let Some(comment) = cursor.next().await {
        if let Ok(c) = comment {
            let comment_info = build_comment_response(&c, &state).await?;
            comments_list.push(comment_info);
            total_count += 1;
        }
    }

    // Apply pagination
    let start = skip as usize;
    let end = (start + limit as usize).min(comments_list.len());
    let paginated_comments = comments_list.into_iter().skip(start).take(end - start).collect::<Vec<_>>();

    Ok((StatusCode::OK, Json(json!({
        "comments": paginated_comments,
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

pub async fn get_comment_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(comment_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&comment_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid comment ID"}))))?;

    let comments = state.mongo.collection::<Comment>("comments");
    let comment = comments.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Comment not found"}))))?;

    let comment_info = build_comment_response(&comment, &state).await?;
    Ok((StatusCode::OK, Json(comment_info)))
}

pub async fn moderate_comment_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(comment_id): Path<String>,
    Json(payload): Json<ModerateCommentRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&comment_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid comment ID"}))))?;

    let comments = state.mongo.collection::<Comment>("comments");
    let comment = comments.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Comment not found"}))))?;

    let mut update_doc = doc! {};
    let mut new_status = comment.status.clone();

    match payload.action.as_str() {
        "approve" => {
            new_status = "approved".to_string();
            update_doc.insert("status", "approved");
            update_doc.insert("moderation_notes", payload.notes.clone());
        },
        "reject" => {
            new_status = "rejected".to_string();
            update_doc.insert("status", "rejected");
            update_doc.insert("moderation_notes", payload.reason.clone());
        },
        "delete" => {
            new_status = "deleted".to_string();
            update_doc.insert("status", "deleted");
            update_doc.insert("deleted_at", DateTime::now());
            update_doc.insert("deleted_by", user.user_id);
            update_doc.insert("deleted_reason", payload.reason.clone());
            update_doc.insert("moderation_notes", payload.notes.clone());
        },
        "edit" => {
            if let Some(new_content) = &payload.after_content {
                update_doc.insert("content", new_content);
                update_doc.insert("is_edited", true);
                update_doc.insert("edited_at", DateTime::now());
            }
            update_doc.insert("moderation_notes", payload.notes.clone());
        },
        "warn" => {
            update_doc.insert("moderation_notes", format!("Warning: {}", payload.reason.clone().unwrap_or_default()));
        },
        _ => return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid moderation action"})))),
    }

    update_doc.insert("updated_at", DateTime::now());

    comments.update_one(
        doc! { "_id": oid },
        doc! { "$set": update_doc },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Create moderation record
    let moderation = state.mongo.collection::<CommentModeration>("comment_moderation");
    let moderation_record = CommentModeration {
        id: None,
        comment_id: oid,
        moderator_id: user.user_id,
        moderator_name: comment.username,
        action: payload.action,
        reason: payload.reason,
        notes: payload.notes,
        before_content: Some(comment.content),
        after_content: payload.after_content,
        created_at: DateTime::now(),
    };

    moderation.insert_one(moderation_record, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Update user stats
    update_user_comment_stats(&state, comment.user_id).await?;

    Ok((StatusCode::OK, Json(json!({"message": format!("Comment {} successfully", new_status)}))))
}

pub async fn delete_comment_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(comment_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&comment_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid comment ID"}))))?;

    let comments = state.mongo.collection::<Comment>("comments");
    
    comments.update_one(
        doc! { "_id": oid },
        doc! { 
            "$set": { 
                "status": "deleted",
                "deleted_at": DateTime::now(),
                "deleted_by": user.user_id,
                "deleted_reason": "Admin deletion",
                "updated_at": DateTime::now()
            }
        },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Update user stats
    let comment = comments.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Comment not found"}))))?;

    update_user_comment_stats(&state, comment.user_id).await?;

    Ok((StatusCode::OK, Json(json!({"message": "Comment deleted successfully"}))))
}

pub async fn get_moderation_queue_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<CommentFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let comments = state.mongo.collection::<Comment>("comments");
    
    let mut query = doc! {
        "$or": [
            doc! { "status": "pending" },
            doc! { "status": "spam" },
            doc! { "reported_count": { "$gt": 0 } }
        ]
    };
    
    if let Some(content_type) = &params.content_type {
        query.insert("content_type", content_type);
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

    let mut cursor = comments.find(query, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut queue_items = Vec::new();
    
    while let Some(comment) = cursor.next().await {
        if let Ok(c) = comment {
            let queue_item = CommentModerationQueueResponse {
                comment_id: c.id.unwrap().to_hex(),
                content_id: c.content_id.to_hex(),
                content_type: c.content_type,
                user_id: c.user_id.to_hex(),
                username: c.username,
                content: c.content,
                spam_score: c.spam_score.unwrap_or(0.0),
                sentiment_score: c.sentiment_score.unwrap_or(0.0),
                reported_count: c.reported_count,
                created_at: c.created_at.to_chrono().to_rfc3339(),
                priority: determine_priority(c.spam_score.unwrap_or(0.0), c.reported_count),
                assigned_to: None,
                assigned_at: None,
            };
            queue_items.push(queue_item);
        }
    }

    Ok((StatusCode::OK, Json(queue_items)))
}

pub async fn get_user_comment_stats_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&user_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;

    let stats = state.mongo.collection::<UserCommentStats>("user_comment_stats");
    let user_stats = stats.find_one(doc! { "user_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    if let Some(stats) = user_stats {
        let stats_response = UserCommentStatsResponse {
            user_id: stats.user_id.to_hex(),
            username: stats.username,
            total_comments: stats.total_comments,
            approved_comments: stats.approved_comments,
            pending_comments: stats.pending_comments,
            rejected_comments: stats.rejected_comments,
            spam_comments: stats.spam_comments,
            deleted_comments: stats.deleted_comments,
            total_likes_received: stats.total_likes_received,
            total_replies_received: stats.total_replies_received,
            avg_spam_score: stats.avg_spam_score,
            avg_sentiment_score: stats.avg_sentiment_score,
            last_comment_at: stats.last_comment_at.map(|dt| dt.to_chrono().to_rfc3339()),
            created_at: stats.created_at.to_chrono().to_rfc3339(),
            updated_at: stats.updated_at.to_chrono().to_rfc3339(),
        };
        Ok((StatusCode::OK, Json(serde_json::to_value(stats_response).unwrap())))
    } else {
        Ok((StatusCode::NOT_FOUND, Json(json!({"error": "User stats not found"}))))
    }
}

pub async fn list_spam_rules_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let rules = state.mongo.collection::<SpamDetectionRule>("spam_detection_rules");
    let mut cursor = rules.find(doc! {}, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut rules_list = Vec::new();
    while let Some(rule) = cursor.next().await {
        if let Ok(r) = rule {
            rules_list.push(r);
        }
    }

    Ok((StatusCode::OK, Json(rules_list)))
}

pub async fn create_spam_rule_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<SpamRuleRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let rules = state.mongo.collection::<SpamDetectionRule>("spam_detection_rules");
    
    let new_rule = SpamDetectionRule {
        id: None,
        name: payload.name,
        description: payload.description,
        pattern: payload.pattern,
        score: payload.score,
        category: payload.category,
        is_active: payload.is_active,
        created_at: DateTime::now(),
        updated_at: DateTime::now(),
    };

    rules.insert_one(new_rule, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({"message": "Spam detection rule created"}))))
}

// --- Helper Functions ---

async fn build_comment_response(
    comment: &Comment,
    state: &Arc<AppState>,
) -> Result<CommentResponse, (StatusCode, Json<serde_json::Value>)> {
    // Get reports
    let reports = state.mongo.collection::<CommentReport>("comment_reports");
    let mut reports_cursor = reports.find(doc! { "comment_id": comment.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut reports_list = Vec::new();
    while let Some(report) = reports_cursor.next().await {
        if let Ok(r) = report {
            reports_list.push(r);
        }
    }

    // Get moderation history
    let moderation = state.mongo.collection::<CommentModeration>("comment_moderation");
    let mut moderation_cursor = moderation.find(doc! { "comment_id": comment.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut moderation_list = Vec::new();
    while let Some(m) = moderation_cursor.next().await {
        if let Ok(moderation_record) = m {
            moderation_list.push(moderation_record);
        }
    }

    Ok(CommentResponse {
        id: comment.id.unwrap().to_hex(),
        content_id: comment.content_id.to_hex(),
        content_type: comment.content_type.clone(),
        user_id: comment.user_id.to_hex(),
        username: comment.username.clone(),
        user_avatar: comment.user_avatar.clone(),
        parent_id: comment.parent_id.map(|id| id.to_hex()),
        content: comment.content.clone(),
        status: comment.status.clone(),
        spam_score: comment.spam_score,
        sentiment_score: comment.sentiment_score,
        reported_count: comment.reported_count,
        likes: comment.likes,
        replies_count: comment.replies_count,
        edited_at: comment.edited_at.map(|dt| dt.to_chrono().to_rfc3339()),
        deleted_at: comment.deleted_at.map(|dt| dt.to_chrono().to_rfc3339()),
        deleted_by: comment.deleted_by.map(|id| id.to_hex()),
        deleted_reason: comment.deleted_reason.clone(),
        moderation_notes: comment.moderation_notes.clone(),
        ip_address: comment.ip_address.clone(),
        user_agent: comment.user_agent.clone(),
        is_edited: comment.is_edited,
        created_at: comment.created_at.to_chrono().to_rfc3339(),
        updated_at: comment.updated_at.to_chrono().to_rfc3339(),
        reports: reports_list,
        moderation_history: moderation_list,
    })
}

async fn update_user_comment_stats(
    state: &Arc<AppState>,
    user_id: ObjectId,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let comments = state.mongo.collection::<Comment>("comments");
    
    // Count comments by status
    let total_comments = comments.count_documents(doc! { "user_id": user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let approved_comments = comments.count_documents(doc! { "user_id": user_id, "status": "approved" }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let pending_comments = comments.count_documents(doc! { "user_id": user_id, "status": "pending" }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let rejected_comments = comments.count_documents(doc! { "user_id": user_id, "status": "rejected" }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let spam_comments = comments.count_documents(doc! { "user_id": user_id, "status": "spam" }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let deleted_comments = comments.count_documents(doc! { "user_id": user_id, "status": "deleted" }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Calculate averages
    let mut avg_spam_score = None;
    let mut avg_sentiment_score = None;
    
    let mut cursor = comments.find(doc! { "user_id": user_id, "spam_score": { "$exists": true } }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let mut total_spam_score = 0.0;
    let mut spam_count = 0;
    let mut total_sentiment_score = 0.0;
    let mut sentiment_count = 0;

    while let Some(comment) = cursor.next().await {
        if let Ok(c) = comment {
            if let Some(score) = c.spam_score {
                total_spam_score += score;
                spam_count += 1;
            }
            if let Some(score) = c.sentiment_score {
                total_sentiment_score += score;
                sentiment_count += 1;
            }
        }
    }

    if spam_count > 0 {
        avg_spam_score = Some(total_spam_score / spam_count as f64);
    }
    if sentiment_count > 0 {
        avg_sentiment_score = Some(total_sentiment_score / sentiment_count as f64);
    }

    // Get last comment date
    let last_comment = comments.find_one(
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
    let stats = state.mongo.collection::<UserCommentStats>("user_comment_stats");
    let stats_doc = UserCommentStats {
        id: None,
        user_id,
        username: user_profile.username,
        total_comments: total_comments as i32,
        approved_comments: approved_comments as i32,
        pending_comments: pending_comments as i32,
        rejected_comments: rejected_comments as i32,
        spam_comments: spam_comments as i32,
        deleted_comments: deleted_comments as i32,
        total_likes_received: 0, // Would need to count from likes collection
        total_replies_received: 0, // Would need to count replies
        avg_spam_score,
        avg_sentiment_score,
        last_comment_at: last_comment.map(|c| c.created_at),
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

pub fn comment_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_comments_handler))
        .route("/:id", get(get_comment_handler).put(moderate_comment_handler).delete(delete_comment_handler))
        .route("/:id/moderate", post(moderate_comment_handler))
        .route("/queue", get(get_moderation_queue_handler))
        .route("/stats/:user_id", get(get_user_comment_stats_handler))
        .route("/spam-rules", get(list_spam_rules_handler).post(create_spam_rule_handler))
}