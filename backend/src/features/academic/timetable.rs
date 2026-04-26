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
use crate::models::{Timetable, TimetableClass, AttendanceLog, CrowdReport};
use mongodb::bson::{doc, oid::ObjectId, DateTime, Bson};
use futures::stream::StreamExt;

// --- DTOs ---

#[derive(Deserialize, Serialize)]
pub struct CreateTimetableRequest {
    pub name: String,
    pub is_template: bool,
    pub is_public: Option<bool>,
    pub school: Option<String>,
    pub programme: Option<String>,
    pub classes: Vec<TimetableClass>,
}

#[derive(Deserialize, Serialize)]
pub struct UpdateTimetableRequest {
    pub name: Option<String>,
    pub is_template: Option<bool>,
    pub is_public: Option<bool>,
    pub school: Option<String>,
    pub programme: Option<String>,
    pub classes: Option<Vec<TimetableClass>>,
}

#[derive(Deserialize)]
pub struct AttendanceRequest {
    pub timetable_id: String,
    pub class_id: String,
    pub date: String,
    pub status: String,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct CrowdReportRequest {
    pub timetable_id: String,
    pub class_id: String,
    pub report_type: String,
    pub description: Option<String>,
}

#[derive(Deserialize)]
pub struct SearchQuery {
    pub school: Option<String>,
    pub programme: Option<String>,
    pub query: Option<String>,
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
    ).await.map_err(|e: mongodb::error::Error| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

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
        .map_err(|e: mongodb::error::Error| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
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
        is_public: payload.is_public.unwrap_or(false),
        fork_count: 0,
        school: payload.school,
        programme: payload.programme,
        classes: payload.classes,
        created_at: DateTime::now(),
    };

    let result = collection.insert_one(new_timetable, None).await
        .map_err(|e: mongodb::error::Error| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

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

    // Can copy if it's a template OR if it's public
    let template = collection.find_one(
        doc! { 
            "_id": template_oid,
            "$or": [
                { "is_template": true },
                { "is_public": true }
            ]
        }, 
        None
    ).await
        .map_err(|e: mongodb::error::Error| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Timetable not found or not public"}))))?;

    // Create a copy for the user
    let user_timetable = Timetable {
        id: None,
        user_id: user.user_id,
        name: format!("{} (Copy)", template.name),
        is_template: false,
        is_public: false,
        fork_count: 0,
        school: template.school,
        programme: template.programme,
        classes: template.classes,
        created_at: DateTime::now(),
    };

    let result = collection.insert_one(user_timetable, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Increment fork count on original
    let _ = collection.update_one(
        doc! { "_id": template_oid },
        doc! { "$inc": { "fork_count": 1 } },
        None
    ).await;

    Ok((StatusCode::CREATED, Json(json!({
        "message": "Timetable copied successfully",
        "id": result.inserted_id.as_object_id().unwrap().to_hex()
    }))))
}

pub async fn search_public_timetables_handler(
    State(state): State<Arc<AppState>>,
    axum::extract::Query(query): axum::extract::Query<SearchQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<Timetable>("timetables");

    let mut filter = doc! { "is_public": true };
    if let Some(school) = query.school { filter.insert("school", school); }
    if let Some(programme) = query.programme { filter.insert("programme", programme); }
    if let Some(q) = query.query { 
        filter.insert("name", doc! { "$regex": q, "$options": "i" }); 
    }

    let mut cursor = collection.find(filter, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut results = Vec::new();
    while let Some(result) = cursor.next().await {
        if let Ok(t) = result {
            results.push(t);
        }
    }

    Ok(Json(results))
}

pub async fn log_attendance_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<AttendanceRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<AttendanceLog>("attendance_logs");
    let t_oid = ObjectId::parse_str(&payload.timetable_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid Timetable ID"}))))?;

    let log = AttendanceLog {
        id: None,
        user_id: user.user_id,
        timetable_id: t_oid,
        class_id: payload.class_id,
        date: payload.date,
        status: payload.status,
        notes: payload.notes,
        created_at: DateTime::now(),
    };

    collection.insert_one(log, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(StatusCode::CREATED)
}

pub async fn submit_report_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CrowdReportRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<CrowdReport>("crowd_reports");
    let t_oid = ObjectId::parse_str(&payload.timetable_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid Timetable ID"}))))?;

    let report = CrowdReport {
        id: None,
        timetable_id: t_oid,
        class_id: payload.class_id.clone(),
        reporter_id: user.user_id,
        report_type: payload.report_type.clone(),
        description: payload.description,
        timestamp: DateTime::now(),
    };

    collection.insert_one(report, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Update reliability score on the timetable class
    // This is a simplified version; in a real app, you'd aggregate scores
    let tt_collection = state.mongo.collection::<Timetable>("timetables");
    let filter = doc! { "_id": t_oid, "classes.id": &payload.class_id };
    let update = doc! { 
        "$set": { 
            "classes.$.last_report": payload.report_type,
        },
        "$inc": { "classes.$.reliability_score": -0.1 } // Penalize for any report
    };
    
    let _ = tt_collection.update_one(filter, update, None).await;

    Ok(StatusCode::CREATED)
}

pub async fn get_missed_summary_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<AttendanceLog>("attendance_logs");
    
    let mut cursor = collection.find(doc! { "user_id": user.user_id, "status": "missed" }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut missed = Vec::new();
    while let Some(result) = cursor.next().await {
        if let Ok(l) = result {
            missed.push(l);
        }
    }

    Ok(Json(missed))
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
        .map_err(|e: mongodb::error::Error| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Timetable not found or unauthorized"}))))?;

    let mut update_doc = doc! {};
    if let Some(name) = payload.name { update_doc.insert("name", name); }
    if let Some(is_template) = payload.is_template { update_doc.insert("is_template", is_template); }
    if let Some(is_public) = payload.is_public { update_doc.insert("is_public", is_public); }
    if let Some(school) = payload.school { update_doc.insert("school", school); }
    if let Some(programme) = payload.programme { update_doc.insert("programme", programme); }
    if let Some(classes) = payload.classes { 
        let classes_bson = mongodb::bson::to_bson(&classes).unwrap();
        update_doc.insert("classes", classes_bson); 
    }

    collection.update_one(doc! { "_id": oid }, doc! { "$set": update_doc }, None).await
        .map_err(|e: mongodb::error::Error| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

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
        .map_err(|e: mongodb::error::Error| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(StatusCode::OK)
}

pub async fn add_lesson_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<TimetableClass>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let collection = state.mongo.collection::<Timetable>("timetables");

    let result = collection.update_one(
        doc! { "_id": oid, "user_id": user.user_id },
        doc! { "$push": { "classes": mongodb::bson::to_bson(&payload).unwrap() } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    if result.matched_count == 0 {
        return Err((StatusCode::NOT_FOUND, Json(json!({"error": "Timetable not found"}))));
    }

    Ok(StatusCode::OK)
}

pub async fn remove_lesson_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path((id, class_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let collection = state.mongo.collection::<Timetable>("timetables");

    let result = collection.update_one(
        doc! { "_id": oid, "user_id": user.user_id },
        doc! { "$pull": { "classes": { "id": class_id } } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    if result.matched_count == 0 {
        return Err((StatusCode::NOT_FOUND, Json(json!({"error": "Timetable not found"}))));
    }

    Ok(StatusCode::OK)
}

pub fn timetable_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_timetables_handler).post(create_timetable_handler))
        .route("/search", get(search_public_timetables_handler))
        .route("/attendance", post(log_attendance_handler).get(get_missed_summary_handler))
        .route("/report", post(submit_report_handler))
        .route("/:id", get(get_timetable_handler).put(update_timetable_handler).delete(delete_timetable_handler))
        .route("/:id/copy", post(copy_template_handler))
        .route("/:id/classes", post(add_lesson_handler))
        .route("/:id/classes/:class_id", delete(remove_lesson_handler))
}
