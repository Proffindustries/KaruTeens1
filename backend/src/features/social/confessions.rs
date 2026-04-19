use axum::{
    extract::{State, Path, Json, Query},
    http::StatusCode,
    response::{IntoResponse},
    routing::{get, post, put, delete},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use crate::features::infrastructure::db::AppState;
use crate::features::auth::auth_service::AuthUser;
use crate::features::infrastructure::dto::{
    ConfessionResponse, ConfessionCommentResponse, CreateConfessionRequest, 
    CreateConfessionCommentRequest, ReportConfessionRequest, 
    UpdateConfessionRequest, ConfessionFilter, IdResponse, MessageResponse
};
use crate::features::infrastructure::error::{AppResult, AppError};
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use futures::stream::StreamExt;
use crate::models::ContentModeration;

// --- Models (keeping internal models here for simplicity, or move to models.rs if preferred) ---

#[derive(Deserialize, Serialize, Clone)]
pub struct Confession {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub content: String,
    pub is_anonymous: bool,
    pub author_id: Option<ObjectId>,
    pub author_name: Option<String>,
    pub likes: u64,
    pub comments: u64,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct ConfessionComment {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub confession_id: ObjectId,
    pub author_id: ObjectId,
    pub author_username: String,
    pub content: String,
    pub created_at: DateTime,
}

// --- Handlers ---

pub async fn list_confessions_handler(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Query(params): Query<ConfessionFilter>,
) -> AppResult<impl IntoResponse> {
    let confessions = state.mongo.collection::<Confession>("confessions");
    
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(50).min(100);
    let skip = (page - 1) * limit;

    let find_options = mongodb::options::FindOptions::builder()
        .sort(doc! { "created_at": -1 })
        .skip(Some(skip as u64))
        .limit(Some(limit))
        .build();
    
    let mut cursor = confessions.find(doc! {}, find_options).await?;
    
    let mut confessions_list = Vec::new();
    while let Some(confession_res) = cursor.next().await {
        if let Ok(c) = confession_res {
            confessions_list.push(ConfessionResponse {
                id: c.id.unwrap().to_hex(),
                content: c.content,
                is_anonymous: c.is_anonymous,
                author_id: c.author_id.map(|oid| oid.to_hex()).unwrap_or_else(|| "anonymous".to_string()),
                author_name: c.author_name.unwrap_or_else(|| "Anonymous".to_string()),
                likes: c.likes as i32,
                comments: c.comments as i32,
                created_at: c.created_at.to_chrono().to_rfc3339(),
                updated_at: c.updated_at.to_chrono().to_rfc3339(),
            });
        }
    }
    
    Ok((StatusCode::OK, Json(confessions_list)))
}

pub async fn create_confession_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateConfessionRequest>,
) -> AppResult<impl IntoResponse> {
    let now = DateTime::now();
    
    let author_id = if !payload.is_anonymous.unwrap_or(false) {
        payload.author_id.and_then(|id| ObjectId::parse_str(id).ok()).unwrap_or(user.user_id)
    } else {
        ObjectId::new()
    };

    let confession = Confession {
        id: None,
        content: payload.content,
        is_anonymous: payload.is_anonymous.unwrap_or(false),
        author_id: Some(author_id),
        author_name: if !payload.is_anonymous.unwrap_or(false) { payload.author_name } else { None },
        likes: 0,
        comments: 0,
        created_at: now,
        updated_at: now,
    };
    
    let result = state.mongo.collection::<Confession>("confessions")
        .insert_one(confession, None)
        .await?;
    
    Ok((StatusCode::CREATED, Json(IdResponse { 
        id: result.inserted_id.as_object_id().unwrap().to_hex(),
        message: Some("Confession created successfully".to_string())
    })))
}

pub async fn update_confession_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateConfessionRequest>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid confession ID".to_string()))?;
    
    let confessions = state.mongo.collection::<Confession>("confessions");
    let confession = confessions.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Confession not found".to_string()))?;

    // Check ownership if not anonymous
    if let Some(author_id) = confession.author_id {
        if author_id != user.user_id {
            // Also check if admin
            if crate::utils::check_admin(user.user_id, &state).await.is_err() {
                return Err(AppError::Forbidden("Not authorized to update this confession".to_string()));
            }
        }
    } else {
        // Anonymous confession, only admins can update
        crate::utils::check_admin(user.user_id, &state).await?;
    }

    let mut update_doc = doc! {};
    if let Some(content) = payload.content {
        update_doc.insert("content", content);
    }
    if let Some(is_anonymous) = payload.is_anonymous {
        update_doc.insert("is_anonymous", is_anonymous);
    }

    if update_doc.is_empty() {
        return Ok((StatusCode::OK, Json(MessageResponse { message: "No changes made".to_string() })));
    }

    update_doc.insert("updated_at", DateTime::now());
    
    confessions.update_one(doc! { "_id": oid }, doc! { "$set": update_doc }, None).await?;
    
    Ok((StatusCode::OK, Json(MessageResponse { message: "Confession updated successfully".to_string() })))
}

pub async fn delete_confession_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid confession ID".to_string()))?;
    
    let confessions = state.mongo.collection::<Confession>("confessions");
    let confession = confessions.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Confession not found".to_string()))?;

    // Check ownership or admin
    if let Some(author_id) = confession.author_id {
        if author_id != user.user_id {
            crate::utils::check_admin(user.user_id, &state).await?;
        }
    } else {
        crate::utils::check_admin(user.user_id, &state).await?;
    }

    confessions.delete_one(doc! { "_id": oid }, None).await?;
    
    Ok((StatusCode::OK, Json(MessageResponse { message: "Confession deleted successfully".to_string() })))
}

pub async fn like_confession_handler(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid confession ID".to_string()))?;
    
    state.mongo.collection::<Confession>("confessions")
        .update_one(doc! { "_id": oid }, doc! { "$inc": { "likes": 1 } }, None)
        .await?;
    
    Ok(StatusCode::OK)
}

pub async fn list_confession_comments_handler(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid confession ID".to_string()))?;
    
    let comments_coll = state.mongo.collection::<ConfessionComment>("confession_comments");
    let mut cursor = comments_coll.find(doc! { "confession_id": oid }, None).await?;
    
    let mut comments = Vec::new();
    while let Some(comment_res) = cursor.next().await {
        if let Ok(c) = comment_res {
            comments.push(ConfessionCommentResponse {
                id: c.id.unwrap().to_hex(),
                confession_id: c.confession_id.to_hex(),
                author_id: c.author_id.to_hex(),
                author_username: c.author_username,
                content: c.content,
                created_at: c.created_at.to_chrono().to_rfc3339(),
            });
        }
    }
    
    Ok((StatusCode::OK, Json(comments)))
}

pub async fn add_confession_comment_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<CreateConfessionCommentRequest>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid confession ID".to_string()))?;
    
    let profiles = state.mongo.collection::<crate::models::Profile>("profiles");
    let profile = profiles.find_one(doc! { "user_id": user.user_id }, None).await?
        .ok_or(AppError::NotFound("Profile not found".to_string()))?;

    let comment = ConfessionComment {
        id: None,
        confession_id: oid,
        author_id: user.user_id,
        author_username: profile.username,
        content: payload.content,
        created_at: DateTime::now(),
    };
    
    state.mongo.collection::<ConfessionComment>("confession_comments")
        .insert_one(comment, None)
        .await?;

    state.mongo.collection::<Confession>("confessions")
        .update_one(doc! { "_id": oid }, doc! { "$inc": { "comments": 1 } }, None)
        .await?;
    
    Ok(StatusCode::CREATED)
}

pub async fn report_confession_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<ReportConfessionRequest>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid confession ID".to_string()))?;
    
    let confessions = state.mongo.collection::<Confession>("confessions");
    let confession = confessions.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Confession not found".to_string()))?;

    let moderation = ContentModeration {
        id: None,
        content_id: oid,
        content_type: "confession".to_string(),
        content_text: confession.content,
        reported_by: Some(user.user_id),
        reported_reason: Some(payload.reason),
        reported_at: Some(DateTime::now()),
        status: "pending".to_string(),
        reviewed_by: None,
        reviewed_at: None,
        review_notes: None,
        action_taken: None,
        created_at: DateTime::now(),
        updated_at: DateTime::now(),
    };
    
    state.mongo.collection::<ContentModeration>("content_moderation")
        .insert_one(moderation, None)
        .await?;
    
    Ok(StatusCode::OK)
}

// --- Routes ---

pub fn confessions_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_confessions_handler).post(create_confession_handler))
        .route("/:id", put(update_confession_handler).delete(delete_confession_handler))
        .route("/:id/like", post(like_confession_handler))
        .route("/:id/comments", get(list_confession_comments_handler).post(add_confession_comment_handler))
        .route("/:id/report", post(report_confession_handler))
}
