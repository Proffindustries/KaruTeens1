use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post, put, delete},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use crate::features::infrastructure::db::AppState;
use crate::features::auth::auth_service::AuthUser;
use crate::models::{Timetable, TimetableClass};
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use futures::stream::StreamExt;

// --- DTOs ---

#[derive(Deserialize, Serialize)]
pub struct CreateTimetableRequest {
    pub name: String,
    pub is_template: bool,
    pub classes: Vec<TimetableClass>,
}

#[derive(Deserialize, Serialize)]
pub struct UpdateTimetableRequest {
    pub name: Option<String>,
    pub is_template: Option<bool>,
    pub classes: Option<Vec<TimetableClass>>,
}

// --- Handlers ---

pub async fn list_timetables_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<Timetable>("timetables");

    // Fetch user's timetables OR templates
    let mut cursor = collection.find(
        doc! { 
            "$or": [
                { "user_id": user.user_id },
                { "is_template": true }
            ]
        }, 
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut timetables = Vec::new();
    while let Some(result) = cursor.next().await {
        if let Ok(t) = result {
            timetables.push(t);
        }
    }

    Ok(Json(timetables))
}

pub async fn get_timetable_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let collection = state.mongo.collection::<Timetable>("timetables");

    let timetable = collection.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Timetable not found"}))))?;

    Ok(Json(timetable))
}

pub async fn create_timetable_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateTimetableRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<Timetable>("timetables");

    let new_timetable = Timetable {
        id: None,
        user_id: user.user_id,
        name: payload.name,
        is_template: payload.is_template,
        classes: payload.classes,
        created_at: DateTime::now(),
    };

    let result = collection.insert_one(new_timetable, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({
        "message": "Timetable created",
        "id": result.inserted_id.as_object_id().unwrap().to_hex()
    }))))
}

pub async fn copy_template_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let template_oid = ObjectId::parse_str(&id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let collection = state.mongo.collection::<Timetable>("timetables");

    let template = collection.find_one(doc! { "_id": template_oid, "is_template": true }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Template not found"}))))?;

    // Create a copy for the user
    let user_timetable = Timetable {
        id: None,
        user_id: user.user_id,
        name: format!("{} (Copy)", template.name),
        is_template: false,
        classes: template.classes,
        created_at: DateTime::now(),
    };

    let result = collection.insert_one(user_timetable, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({
        "message": "Template copied to your timetable",
        "id": result.inserted_id.as_object_id().unwrap().to_hex()
    }))))
}

pub async fn update_timetable_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateTimetableRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let collection = state.mongo.collection::<Timetable>("timetables");

    // Only owner can update
    let existing = collection.find_one(doc! { "_id": oid, "user_id": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Timetable not found or unauthorized"}))))?;

    let mut update_doc = doc! {};
    if let Some(name) = payload.name { update_doc.insert("name", name); }
    if let Some(is_template) = payload.is_template { update_doc.insert("is_template", is_template); }
    if let Some(classes) = payload.classes { 
        let classes_bson = mongodb::bson::to_bson(&classes).unwrap();
        update_doc.insert("classes", classes_bson); 
    }

    collection.update_one(doc! { "_id": oid }, doc! { "$set": update_doc }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(StatusCode::OK)
}

pub async fn delete_timetable_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let collection = state.mongo.collection::<Timetable>("timetables");

    collection.delete_one(doc! { "_id": oid, "user_id": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(StatusCode::OK)
}

pub fn timetable_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_timetables_handler).post(create_timetable_handler))
        .route("/:id", get(get_timetable_handler).put(update_timetable_handler).delete(delete_timetable_handler))
        .route("/:id/copy", post(copy_template_handler))
}
