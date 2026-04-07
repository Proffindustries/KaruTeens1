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
use crate::dto::{
    CommentResponse, CommentModerationQueueResponse, UserCommentStatsResponse,
    UpdateCommentRequest, ReportCommentRequest, ModerateCommentRequest, 
    CommentFilter, SpamRuleRequest, PaginatedResponse, PaginationInfo,
    MessageResponse, IdResponse
};
use crate::error::{AppResult, AppError};
use crate::auth::AuthUser;
use crate::utils::check_admin;
use futures::stream::StreamExt;

// --- Handlers ---

pub async fn list_comments_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<CommentFilter>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let comments = state.mongo.collection::<Comment>("comments");
    
    let mut query = doc! {};
    
    if let Some(status) = &params.status {
        query.insert("status", status);
    }
    
    if let Some(content_type) = &params.content_type {
        query.insert("content_type", content_type);
    }
    
    if let Some(user_id_str) = &params.user_id {
        let oid = ObjectId::parse_str(user_id_str)
            .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;
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

    let sort_doc = match sort_order.as_str() {
        "desc" => doc! { sort_by: -1 },
        _ => doc! { sort_by: 1 },
    };

    let total_count = comments.count_documents(query.clone(), None).await?;

    let find_options = mongodb::options::FindOptions::builder()
        .sort(sort_doc)
        .skip(Some(skip as u64))
        .limit(Some(limit))
        .build();

    let mut cursor = comments.find(query, find_options).await?;

    let mut paginated_comments = Vec::new();
    
    while let Some(comment_res) = cursor.next().await {
        if let Ok(c) = comment_res {
            let comment_info = build_comment_response(&c, &state).await?;
            paginated_comments.push(comment_info);
        }
    }

    Ok((StatusCode::OK, Json(PaginatedResponse {
        items: paginated_comments,
        pagination: PaginationInfo {
            current_page: page,
            total_pages: (total_count as f64 / limit as f64).ceil() as i64,
            total_items: total_count,
            items_per_page: limit,
            has_next: (skip + limit) < total_count as i64,
            has_prev: page > 1,
        },
    })))
}

pub async fn get_comment_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(comment_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&comment_id)
        .map_err(|_| AppError::BadRequest("Invalid comment ID".to_string()))?;

    let comments = state.mongo.collection::<Comment>("comments");
    let comment = comments.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Comment not found".to_string()))?;

    let comment_info = build_comment_response(&comment, &state).await?;
    Ok((StatusCode::OK, Json(comment_info)))
}

pub async fn moderate_comment_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(comment_id): Path<String>,
    Json(payload): Json<ModerateCommentRequest>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&comment_id)
        .map_err(|_| AppError::BadRequest("Invalid comment ID".to_string()))?;

    let comments = state.mongo.collection::<Comment>("comments");
    let comment = comments.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Comment not found".to_string()))?;

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
        _ => return Err(AppError::BadRequest("Invalid moderation action".to_string())),
    }

    update_doc.insert("updated_at", DateTime::now());

    comments.update_one(
        doc! { "_id": oid },
        doc! { "$set": update_doc },
        None
    ).await?;

    // Create moderation record
    let moderation_coll = state.mongo.collection::<CommentModeration>("comment_moderation");
    let moderation_record = CommentModeration {
        id: None,
        comment_id: oid,
        moderator_id: user.user_id,
        moderator_name: "Admin".to_string(), // In a real app, you'd fetch the moderator's name
        action: payload.action,
        reason: payload.reason,
        notes: payload.notes,
        before_content: Some(comment.content),
        after_content: payload.after_content,
        created_at: DateTime::now(),
    };

    moderation_coll.insert_one(moderation_record, None).await?;

    // Update user stats
    let state_clone = state.clone();
    let comment_user_id = comment.user_id;
    tokio::spawn(async move {
        let _ = update_user_comment_stats(&state_clone, comment_user_id).await;
    });

    Ok((StatusCode::OK, Json(json!({"message": format!("Comment {} successfully", new_status)}))))
}

pub async fn delete_comment_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(comment_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&comment_id)
        .map_err(|_| AppError::BadRequest("Invalid comment ID".to_string()))?;

    let comments = state.mongo.collection::<Comment>("comments");
    
    let comment = comments.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Comment not found".to_string()))?;

    // Check if user is author or admin
    let is_admin = check_admin(user.user_id, &state).await.is_ok();
    
    if !is_admin && comment.user_id != user.user_id {
        return Err(AppError::Forbidden("Not authorized to delete this comment".to_string()));
    }

    comments.update_one(
        doc! { "_id": oid },
        doc! { 
            "$set": { 
                "status": "deleted",
                "deleted_at": DateTime::now(),
                "deleted_by": user.user_id,
                "deleted_reason": "User/Admin deletion",
                "updated_at": DateTime::now()
            }
        },
        None
    ).await?;

    // Update user stats
    let state_clone = state.clone();
    let comment_user_id = comment.user_id;
    tokio::spawn(async move {
        let _ = update_user_comment_stats(&state_clone, comment_user_id).await;
    });

    Ok((StatusCode::OK, Json(json!({"message": "Comment deleted successfully"}))))
}

pub async fn get_moderation_queue_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<CommentFilter>,
) -> AppResult<impl IntoResponse> {
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

    let mut cursor = comments.find(query, None).await?;

    let mut queue_items = Vec::new();
    
    while let Some(comment_res) = cursor.next().await {
        if let Ok(c) = comment_res {
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
    Path(user_id_str): Path<String>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&user_id_str)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let stats_coll = state.mongo.collection::<UserCommentStats>("user_comment_stats");
    let user_stats = stats_coll.find_one(doc! { "user_id": oid }, None).await?;

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
        Ok((StatusCode::OK, Json(stats_response)))
    } else {
        Err(AppError::NotFound("User stats not found".to_string()))
    }
}

pub async fn list_spam_rules_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let rules_coll = state.mongo.collection::<SpamDetectionRule>("spam_detection_rules");
    let mut cursor = rules_coll.find(doc! {}, None).await?;

    let mut rules_list = Vec::new();
    while let Some(rule_res) = cursor.next().await {
        if let Ok(r) = rule_res {
            rules_list.push(r);
        }
    }

    Ok((StatusCode::OK, Json(rules_list)))
}

pub async fn create_spam_rule_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<SpamRuleRequest>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let rules_coll = state.mongo.collection::<SpamDetectionRule>("spam_detection_rules");
    
    let new_rule = SpamDetectionRule {
        id: None,
        name: payload.name,
        description: payload.description.unwrap_or_default(),
        pattern: payload.pattern,
        score: payload.score.unwrap_or(0.0),
        category: payload.category.unwrap_or_default(),
        is_active: payload.is_active.unwrap_or(true),
        created_at: DateTime::now(),
        updated_at: DateTime::now(),
    };

    rules_coll.insert_one(new_rule, None).await?;

    Ok((StatusCode::CREATED, Json(json!({"message": "Spam detection rule created"}))))
}

// --- Helper Functions ---

async fn build_comment_response(
    comment: &Comment,
    state: &Arc<AppState>,
) -> AppResult<CommentResponse> {
    // Get reports
    let reports_coll = state.mongo.collection::<CommentReport>("comment_reports");
    let mut reports_cursor = reports_coll.find(doc! { "comment_id": comment.id.unwrap() }, None).await?;

    let mut reports_list = Vec::new();
    while let Some(report_res) = reports_cursor.next().await {
        if let Ok(r) = report_res {
            reports_list.push(r);
        }
    }

    // Get moderation history
    let moderation_coll = state.mongo.collection::<CommentModeration>("comment_moderation");
    let mut moderation_cursor = moderation_coll.find(doc! { "comment_id": comment.id.unwrap() }, None).await?;

    let mut moderation_list = Vec::new();
    while let Some(m_res) = moderation_cursor.next().await {
        if let Ok(m) = m_res {
            moderation_list.push(m);
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
        reports: Some(reports_list.into_iter().map(|r| serde_json::to_value(r).unwrap_or(serde_json::Value::Null)).collect()),
        moderation_history: Some(moderation_list.into_iter().map(|m| serde_json::to_value(m).unwrap_or(serde_json::Value::Null)).collect()),
    })
}

async fn update_user_comment_stats(
    state: &Arc<AppState>,
    user_id: ObjectId,
) -> AppResult<()> {
    let comments = state.mongo.collection::<Comment>("comments");
    
    // Count comments by status
    let total_comments: u64 = comments.count_documents(doc! { "user_id": user_id }, None).await?;
    let approved_comments: u64 = comments.count_documents(doc! { "user_id": user_id, "status": "approved" }, None).await?;
    let pending_comments: u64 = comments.count_documents(doc! { "user_id": user_id, "status": "pending" }, None).await?;
    let rejected_comments: u64 = comments.count_documents(doc! { "user_id": user_id, "status": "rejected" }, None).await?;
    let spam_comments: u64 = comments.count_documents(doc! { "user_id": user_id, "status": "spam" }, None).await?;
    let deleted_comments: u64 = comments.count_documents(doc! { "user_id": user_id, "status": "deleted" }, None).await?;

    // Calculate averages
    let mut avg_spam_score = None;
    let mut avg_sentiment_score = None;
    
    let mut cursor = comments.find(doc! { "user_id": user_id, "spam_score": { "$exists": true } }, None).await?;
    
    let mut total_spam_score = 0.0;
    let mut spam_count = 0;
    let mut total_sentiment_score = 0.0;
    let mut sentiment_count = 0;

    while let Some(comment_res) = cursor.next().await {
        if let Ok(c) = comment_res {
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
    ).await?;

    // Get user info
    let profiles = state.mongo.collection::<Profile>("profiles");
    let user_profile = profiles.find_one(doc! { "user_id": user_id }, None).await?
        .ok_or(AppError::NotFound("User profile not found".to_string()))?;

    // Update or create stats
    let stats_coll = state.mongo.collection::<UserCommentStats>("user_comment_stats");
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
        total_likes_received: 0, 
        total_replies_received: 0, 
        avg_spam_score,
        avg_sentiment_score,
        last_comment_at: last_comment.map(|c| c.created_at),
        created_at: DateTime::now(),
        updated_at: DateTime::now(),
    };

    stats_coll.update_one(
        doc! { "user_id": user_id },
        doc! { "$set": mongodb::bson::to_document(&stats_doc).unwrap() },
        Some(mongodb::options::UpdateOptions::builder().upsert(true).build())
    ).await?;

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
