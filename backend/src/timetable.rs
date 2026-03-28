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
use crate::db::AppState;
use crate::auth::AuthUser;

// --- DTOs ---

#[derive(Deserialize, Serialize, Clone)]
pub struct Class {
    pub id: String,
    pub title: String,
    pub start_time: String,
    pub end_time: String,
    pub room: String,
    pub day: String,
}

#[derive(Deserialize, Serialize)]
pub struct CreateClassRequest {
    pub title: String,
    pub start_time: String,
    pub end_time: String,
    pub room: String,
    pub day: String,
}

#[derive(Deserialize, Serialize)]
pub struct UpdateClassRequest {
    pub title: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub room: Option<String>,
    pub day: Option<String>,
}

// --- Handlers ---

pub async fn list_timetable_handler(
    State(_state): State<Arc<AppState>>,
    _user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // For now, return a static timetable
    // In a real application, this would be fetched from the database
    let mut timetable: HashMap<String, Vec<Class>> = HashMap::new();

    timetable.insert(
        "Monday".to_string(),
        vec![
            Class {
                id: "1".to_string(),
                title: "Mathematics".to_string(),
                start_time: "09:00".to_string(),
                end_time: "10:30".to_string(),
                room: "Room 101".to_string(),
                day: "Monday".to_string(),
            },
            Class {
                id: "2".to_string(),
                title: "Physics".to_string(),
                start_time: "11:00".to_string(),
                end_time: "12:30".to_string(),
                room: "Lab 2".to_string(),
                day: "Monday".to_string(),
            },
        ],
    );

    timetable.insert(
        "Tuesday".to_string(),
        vec![
            Class {
                id: "3".to_string(),
                title: "History".to_string(),
                start_time: "09:00".to_string(),
                end_time: "10:30".to_string(),
                room: "Room 102".to_string(),
                day: "Tuesday".to_string(),
            },
            Class {
                id: "4".to_string(),
                title: "Chemistry".to_string(),
                start_time: "11:00".to_string(),
                end_time: "12:30".to_string(),
                room: "Lab 1".to_string(),
                day: "Tuesday".to_string(),
            },
        ],
    );

    // Add more days as needed...

    Ok(Json(timetable))
}

pub async fn create_class_handler(
    State(_state): State<Arc<AppState>>,
    _user: AuthUser,
    Json(request): Json<CreateClassRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // In a real application, we would save to the database and return the created class
    // For now, we just return a success message
    Ok((StatusCode::CREATED, Json(json!({
        "message": "Class created successfully",
        "class": request
    }))))
}

pub async fn update_class_handler(
    State(_state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(id): Path<String>,
    Json(request): Json<UpdateClassRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // In a real application, we would update the class in the database
    Ok((StatusCode::OK, Json(serde_json::json!({
        "message": "Class updated successfully",
        "id": id,
        "updates": request
    }))))
}

pub async fn delete_class_handler(
    State(_state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // In a real application, we would delete the class from the database
    Ok((StatusCode::OK, Json(serde_json::json!({
        "message": "Class deleted successfully",
        "id": id
    }))))
}

// --- Routes ---

pub fn timetable_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_timetable_handler))
        .route("/", post(create_class_handler))
        .route("/:id", put(update_class_handler))
        .route("/:id", delete(delete_class_handler))
}
