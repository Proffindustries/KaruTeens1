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
use crate::db::AppState;
use crate::auth::AuthUser;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use futures::stream::StreamExt;
use crate::models::ContentModeration;

// --- DTOs ---

#[derive(Deserialize, Serialize, Clone)]
pub struct Confession {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub content: String,
    pub is_anonymous: bool,
    pub author_id: Option<ObjectId>, // Only set if not anonymous
    pub author_name: Option<String>, // Only set if not anonymous
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

#[derive(Deserialize)]
pub struct CreateConfessionRequest {
    pub content: String,
    pub is_anonymous: bool,
    pub author_id: Option<ObjectId>, // Required if not anonymous
    pub author_name: Option<String>, // Required if not anonymous
}

#[derive(Deserialize)]
pub struct CreateCommentRequest {
    pub content: String,
}

#[derive(Deserialize)]
pub struct ReportConfessionRequest {
    pub reason: String,
}

#[derive(Deserialize)]
pub struct UpdateConfessionRequest {
    pub content: Option<String>,
    pub is_anonymous: Option<bool>,
}

#[derive(Deserialize)]
pub struct ConfessionFilter {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

// --- Handlers ---

pub async fn list_confessions_handler(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Query(params): Query<ConfessionFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let confessions = state.mongo.collection::<Confession>("confessions");
    
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(50).min(100); // Max 100 confessions per page
    let skip = (page - 1) * limit;

    let find_options = mongodb::options::FindOptions::builder()
        .sort(doc! { "created_at": -1 })
        .skip(skip as u64)
        .limit(limit)
        .build();
    
    let mut cursor = confessions.find(doc! {}, find_options).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() }))))?;
    
    let mut confessions_list = Vec::new();
    while let Some(confession) = cursor.next().await {
        if let Ok(c) = confession {
            confessions_list.push(json!({
                "id": c.id.unwrap().to_hex(),
                "content": c.content,
                "is_anonymous": c.is_anonymous,
                "author_id": c.author_id.map(|oid| oid.to_hex()),
                "author_name": c.author_name,
                "likes": c.likes,
                "comments": c.comments,
                "created_at": c.created_at.to_chrono().to_rfc3339(),
                "updated_at": c.updated_at.to_chrono().to_rfc3339(),
            }));
        }
    }
    
    Ok((StatusCode::OK, Json(confessions_list)))
}

pub async fn create_confession_handler(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    request: Json<CreateConfessionRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let now = DateTime::now();
    
    let confession = Confession {
        id: None,
        content: request.content.clone(),
        is_anonymous: request.is_anonymous,
        author_id: if !request.is_anonymous { request.author_id } else { None },
        author_name: if !request.is_anonymous { request.author_name.clone() } else { None },
        likes: 0,
        comments: 0,
        created_at: now,
        updated_at: now,
    };
    
    let result = state.mongo.collection::<Confession>("confessions")
        .insert_one(confession, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() }))))?;
    
    Ok((StatusCode::CREATED, Json(json!({ "id": result.inserted_id.as_object_id().unwrap().to_hex() }))))
}

pub async fn update_confession_handler(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(id): Path<String>,
    request: Json<UpdateConfessionRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({ "error": "Invalid confession ID" }))))?;
    
    let mut update_doc = doc! {};
    if let Some(content) = &request.content {
        update_doc.insert("content", content.clone());
    }
    if let Some(is_anonymous) = request.is_anonymous {
        update_doc.insert("is_anonymous", is_anonymous);
    }
    update_doc.insert("updated_at", DateTime::now());
    
    let _ = state.mongo.collection::<Confession>("confessions")
        .update_one(doc! { "_id": oid }, doc! { "$set": update_doc }, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() }))))?;
    
    Ok((StatusCode::OK, Json(json!({ "message": "Confession updated successfully" }))))
}

pub async fn delete_confession_handler(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({ "error": "Invalid confession ID" }))))?;
    
    let _ = state.mongo.collection::<Confession>("confessions")
        .delete_one(doc! { "_id": oid }, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() }))))?;
    
    Ok((StatusCode::OK, Json(json!({ "message": "Confession deleted successfully" }))))
}

pub async fn like_confession_handler(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({ "error": "Invalid confession ID" }))))?;
    
    state.mongo.collection::<Confession>("confessions")
        .update_one(doc! { "_id": oid }, doc! { "$inc": { "likes": 1 } }, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() }))))?;
    
    Ok(StatusCode::OK)
}

pub async fn list_confession_comments_handler(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({ "error": "Invalid confession ID" }))))?;
    
    let comments_coll = state.mongo.collection::<ConfessionComment>("confession_comments");
    let mut cursor = comments_coll.find(doc! { "confession_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() }))))?;
    
    let mut comments = Vec::new();
    while let Some(comment) = cursor.next().await {
        if let Ok(c) = comment {
            comments.push(json!({
                "id": c.id.unwrap().to_hex(),
                "confession_id": c.confession_id.to_hex(),
                "author_id": c.author_id.to_hex(),
                "author_username": c.author_username,
                "content": c.content,
                "created_at": c.created_at.to_chrono().to_rfc3339(),
            }));
        }
    }
    
    Ok((StatusCode::OK, Json(comments)))
}

pub async fn add_confession_comment_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<CreateCommentRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({ "error": "Invalid confession ID" }))))?;
    
    // Get username
    let profiles = state.mongo.collection::<crate::models::Profile>("profiles");
    let profile = profiles.find_one(doc! { "user_id": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() }))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({ "error": "Profile not found" }))))?;

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
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() }))))?;

    // Increment comment count
    state.mongo.collection::<Confession>("confessions")
        .update_one(doc! { "_id": oid }, doc! { "$inc": { "comments": 1 } }, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() }))))?;
    
    Ok(StatusCode::CREATED)
}

pub async fn report_confession_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<ReportConfessionRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({ "error": "Invalid confession ID" }))))?;
    
    // Fetch confession to get content
    let confession = state.mongo.collection::<Confession>("confessions")
        .find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() }))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({ "error": "Confession not found" }))))?;

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
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() }))))?;
    
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