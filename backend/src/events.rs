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
use crate::db::AppState;
use crate::models::{Event, EventRSVP, Profile};
use crate::auth::AuthUser;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use futures::stream::StreamExt;

// --- DTOs ---

#[derive(Deserialize)]
pub struct CreateEventRequest {
    pub title: String,
    pub description: String,
    pub location: String,
    pub start_datetime: String, // ISO 8601
    pub end_datetime: String,
    pub image_url: Option<String>,
    pub category: String,
    pub max_attendees: Option<i32>,
}

#[derive(Deserialize)]
pub struct EventFilter {
    pub category: Option<String>,
    pub upcoming: Option<bool>,
}

#[derive(Serialize)]
pub struct EventResponse {
    pub id: String,
    pub creator_id: String,
    pub creator_name: String,
    pub title: String,
    pub description: String,
    pub location: String,
    pub start_datetime: String,
    pub end_datetime: String,
    pub image_url: Option<String>,
    pub category: String,
    pub max_attendees: Option<i32>,
    pub attendee_count: usize,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Deserialize)]
pub struct RSVPRequest {
    pub status: String, // interested, going, maybe
}

// --- Handlers ---

pub async fn create_event_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateEventRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<Event>("events");

    // Parse datetimes
    let start_dt = chrono::DateTime::parse_from_rfc3339(&payload.start_datetime)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid start_datetime"}))))?;
    let end_dt = chrono::DateTime::parse_from_rfc3339(&payload.end_datetime)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid end_datetime"}))))?;

    let new_event = Event {
        id: None,
        creator_id: user.user_id,
        title: payload.title,
        description: payload.description,
        location: payload.location,
        start_datetime: DateTime::from_chrono(start_dt.with_timezone(&chrono::Utc)),
        end_datetime: DateTime::from_chrono(end_dt.with_timezone(&chrono::Utc)),
        image_url: payload.image_url,
        category: payload.category,
        max_attendees: payload.max_attendees,
        is_active: true,
        created_at: DateTime::now(),
    };

    let result = collection.insert_one(new_event, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({
        "message": "Event created",
        "id": result.inserted_id.as_object_id().unwrap().to_hex()
    }))))
}

pub async fn list_events_handler(
    State(state): State<Arc<AppState>>,
    Query(filter): Query<EventFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let events_collection = state.mongo.collection::<Event>("events");
    let rsvps_collection = state.mongo.collection::<EventRSVP>("event_rsvps");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    let mut query = doc! { "is_active": true };

    if let Some(category) = filter.category {
        if category != "all" {
            query.insert("category", category);
        }
    }

    if filter.upcoming.unwrap_or(true) {
        query.insert("start_datetime", doc! { "$gte": DateTime::now() });
    }

    let mut cursor = events_collection.find(query, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut events = Vec::new();

    while let Some(event) = cursor.next().await {
        if let Ok(evt) = event {
            // Get RSVP count
            let rsvp_count = rsvps_collection.count_documents(
                doc! { "event_id": evt.id.unwrap(), "status": { "$in": ["going", "interested"] } },
                None
            ).await.unwrap_or(0) as usize;

            // Get creator name
            let profile = profiles_collection.find_one(doc! { "user_id": evt.creator_id }, None).await
                .unwrap_or(None);
            let creator_name = profile.map(|p| p.username).unwrap_or_else(|| "Unknown".to_string());

            events.push(EventResponse {
                id: evt.id.unwrap().to_hex(),
                creator_id: evt.creator_id.to_hex(),
                creator_name,
                title: evt.title,
                description: evt.description,
                location: evt.location,
                start_datetime: evt.start_datetime.to_chrono().to_rfc3339(),
                end_datetime: evt.end_datetime.to_chrono().to_rfc3339(),
                image_url: evt.image_url,
                category: evt.category,
                max_attendees: evt.max_attendees,
                attendee_count: rsvp_count,
                is_active: evt.is_active,
                created_at: evt.created_at.to_chrono().to_rfc3339(),
            });
        }
    }

    Ok((StatusCode::OK, Json(events)))
}

pub async fn get_event_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid event ID"}))))?;

    let events_collection = state.mongo.collection::<Event>("events");
    let rsvps_collection = state.mongo.collection::<EventRSVP>("event_rsvps");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    let event = events_collection.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Event not found"}))))?;

    let rsvp_count = rsvps_collection.count_documents(
        doc! { "event_id": oid, "status": { "$in": ["going", "interested"] } },
        None
    ).await.unwrap_or(0) as usize;

    let profile = profiles_collection.find_one(doc! { "user_id": event.creator_id }, None).await
        .unwrap_or(None);
    let creator_name = profile.map(|p| p.username).unwrap_or_else(|| "Unknown".to_string());

    let response = EventResponse {
        id: event.id.unwrap().to_hex(),
        creator_id: event.creator_id.to_hex(),
        creator_name,
        title: event.title,
        description: event.description,
        location: event.location,
        start_datetime: event.start_datetime.to_chrono().to_rfc3339(),
        end_datetime: event.end_datetime.to_chrono().to_rfc3339(),
        image_url: event.image_url,
        category: event.category,
        max_attendees: event.max_attendees,
        attendee_count: rsvp_count,
        is_active: event.is_active,
        created_at: event.created_at.to_chrono().to_rfc3339(),
    };

    Ok((StatusCode::OK, Json(response)))
}

pub async fn rsvp_event_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<RSVPRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let event_oid = ObjectId::parse_str(&id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid event ID"}))))?;

    let rsvps_collection = state.mongo.collection::<EventRSVP>("event_rsvps");

    // Check if already RSVP'd
    let existing = rsvps_collection.find_one(
        doc! { "event_id": event_oid, "user_id": user.user_id },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    if let Some(mut rsvp) = existing {
        // Update existing RSVP
        rsvp.status = payload.status.clone();
        rsvps_collection.replace_one(
            doc! { "_id": rsvp.id.unwrap() },
            rsvp,
            None
        ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

        return Ok((StatusCode::OK, Json(json!({"message": "RSVP updated", "status": payload.status}))));
    }

    // Create new RSVP
    let new_rsvp = EventRSVP {
        id: None,
        event_id: event_oid,
        user_id: user.user_id,
        status: payload.status.clone(),
        created_at: DateTime::now(),
    };

    rsvps_collection.insert_one(new_rsvp, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({"message": "RSVP created", "status": payload.status}))))
}

pub async fn remove_rsvp_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let event_oid = ObjectId::parse_str(&id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid event ID"}))))?;

    let rsvps_collection = state.mongo.collection::<EventRSVP>("event_rsvps");

    rsvps_collection.delete_one(
        doc! { "event_id": event_oid, "user_id": user.user_id },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "RSVP removed"}))))
}

pub fn event_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(create_event_handler).get(list_events_handler))
        .route("/:id", get(get_event_handler))
        .route("/:id/rsvp", post(rsvp_event_handler).delete(remove_rsvp_handler))
}
