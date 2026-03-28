use axum::{
    extract::{State, Path, Json},
    http::StatusCode,
    response::{IntoResponse},
    routing::{get, put},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use crate::db::AppState;
use crate::auth::AuthUser;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use futures::stream::StreamExt;

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

#[derive(Deserialize)]
pub struct CreateConfessionRequest {
    pub content: String,
    pub is_anonymous: bool,
    pub author_id: Option<ObjectId>, // Required if not anonymous
    pub author_name: Option<String>, // Required if not anonymous
}

#[derive(Deserialize)]
pub struct UpdateConfessionRequest {
    pub content: Option<String>,
    pub is_anonymous: Option<bool>,
}

// --- Handlers ---

pub async fn list_confessions_handler(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let confessions = state.mongo.collection::<Confession>("confessions");
    
    let mut cursor = confessions.find(doc! {}, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() }))))?;
    
    let mut confessions_list = Vec::new();
    while let Some(confession) = cursor.next().await {
        if let Ok(confession) = confession {
            confessions_list.push(confession);
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
    
    Ok((StatusCode::CREATED, Json(json!({ "id": result.inserted_id }))))
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

// --- Routes ---

pub fn confessions_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_confessions_handler).post(create_confession_handler))
        .route("/:id", put(update_confession_handler).delete(delete_confession_handler))
}