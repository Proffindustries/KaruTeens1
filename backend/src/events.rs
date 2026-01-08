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
use crate::models::{Event, EventRSVP, EventAttendee, EventComment, EventNotification, EventAnalytics, User, Profile};
use crate::auth::AuthUser;
use futures::stream::StreamExt;

// --- DTOs ---

#[derive(Deserialize)]
pub struct CreateEventRequest {
    pub title: String,
    pub description: String,
    pub location: String,
    pub location_type: String,
    pub venue_name: Option<String>,
    pub venue_address: Option<String>,
    pub virtual_meeting_url: Option<String>,
    pub start_datetime: String,
    pub end_datetime: String,
    pub registration_start: Option<String>,
    pub registration_end: Option<String>,
    pub max_attendees: Option<i32>,
    pub category: String,
    pub tags: Option<Vec<String>>,
    pub event_type: String,
    pub status: String,
    pub is_recurring: bool,
    pub recurrence_pattern: Option<String>,
    pub recurrence_end_date: Option<String>,
    pub image_url: Option<String>,
    pub banner_url: Option<String>,
    pub featured: bool,
    pub ticket_price: Option<f64>,
    pub currency: Option<String>,
    pub rsvp_required: bool,
    pub waitlist_enabled: bool,
}

#[derive(Deserialize)]
pub struct UpdateEventRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub location: Option<String>,
    pub location_type: Option<String>,
    pub venue_name: Option<String>,
    pub venue_address: Option<String>,
    pub virtual_meeting_url: Option<String>,
    pub start_datetime: Option<String>,
    pub end_datetime: Option<String>,
    pub registration_start: Option<String>,
    pub registration_end: Option<String>,
    pub max_attendees: Option<i32>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub event_type: Option<String>,
    pub status: Option<String>,
    pub is_recurring: Option<bool>,
    pub recurrence_pattern: Option<String>,
    pub recurrence_end_date: Option<String>,
    pub image_url: Option<String>,
    pub banner_url: Option<String>,
    pub featured: Option<bool>,
    pub ticket_price: Option<f64>,
    pub currency: Option<String>,
    pub rsvp_required: Option<bool>,
    pub waitlist_enabled: Option<bool>,
}

#[derive(Deserialize)]
pub struct RSVPRequest {
    pub status: String, // interested, going, maybe, not_going
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct CheckInRequest {
    pub user_id: String,
    pub attended: bool,
}

#[derive(Deserialize)]
pub struct EventFilter {
    pub status: Option<String>,
    pub category: Option<String>,
    pub location_type: Option<String>,
    pub event_type: Option<String>,
    pub organizer: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub search: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct EventResponse {
    pub id: String,
    pub title: String,
    pub description: String,
    pub location: String,
    pub location_type: String,
    pub venue_name: Option<String>,
    pub venue_address: Option<String>,
    pub virtual_meeting_url: Option<String>,
    pub start_datetime: String,
    pub end_datetime: String,
    pub registration_start: Option<String>,
    pub registration_end: Option<String>,
    pub max_attendees: Option<i32>,
    pub current_attendees: i32,
    pub category: String,
    pub tags: Option<Vec<String>>,
    pub organizer_id: String,
    pub organizer_name: String,
    pub organizer_contact: Option<String>,
    pub event_type: String,
    pub status: String,
    pub is_recurring: bool,
    pub recurrence_pattern: Option<String>,
    pub recurrence_end_date: Option<String>,
    pub image_url: Option<String>,
    pub banner_url: Option<String>,
    pub featured: bool,
    pub ticket_price: Option<f64>,
    pub currency: Option<String>,
    pub rsvp_required: bool,
    pub waitlist_enabled: bool,
    pub waitlist_count: i32,
    pub created_at: String,
    pub updated_at: String,
    pub rsvp_stats: RSVPStats,
    pub attendance_stats: AttendanceStats,
}

#[derive(Serialize)]
pub struct RSVPStats {
    pub interested: i32,
    pub going: i32,
    pub maybe: i32,
    pub not_going: i32,
}

#[derive(Serialize)]
pub struct AttendanceStats {
    pub checked_in: i32,
    pub total_attendees: i32,
    pub attendance_rate: f64,
}

#[derive(Serialize)]
pub struct EventCalendarResponse {
    pub events: Vec<CalendarEvent>,
    pub summary: CalendarSummary,
}

#[derive(Serialize)]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub start: String,
    pub end: String,
    pub category: String,
    pub location: String,
    pub status: String,
    pub attendees: i32,
    pub max_attendees: Option<i32>,
}

#[derive(Serialize)]
pub struct CalendarSummary {
    pub total_events: i32,
    pub upcoming_events: i32,
    pub ongoing_events: i32,
    pub completed_events: i32,
    pub total_attendees: i32,
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

pub async fn list_events_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<EventFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let events = state.mongo.collection::<Event>("events");
    
    let mut query = doc! {};
    
    if let Some(status) = &params.status {
        query.insert("status", status);
    }
    
    if let Some(category) = &params.category {
        query.insert("category", category);
    }
    
    if let Some(location_type) = &params.location_type {
        query.insert("location_type", location_type);
    }
    
    if let Some(event_type) = &params.event_type {
        query.insert("event_type", event_type);
    }
    
    if let Some(search) = &params.search {
        query.insert("$or", vec![
            doc! { "title": { "$regex": search, "$options": "i" } },
            doc! { "description": { "$regex": search, "$options": "i" } },
            doc! { "location": { "$regex": search, "$options": "i" } },
        ]);
    }

    if let Some(date_from) = &params.date_from {
        if let Ok(date) = chrono::DateTime::parse_from_rfc3339(date_from) {
            query.insert("start_datetime", doc! { "$gte": date });
        }
    }

    if let Some(date_to) = &params.date_to {
        if let Ok(date) = chrono::DateTime::parse_from_rfc3339(date_to) {
            query.insert("end_datetime", doc! { "$lte": date });
        }
    }

    let sort_by = params.sort_by.unwrap_or_else(|| "start_datetime".to_string());
    let sort_order = params.sort_order.unwrap_or_else(|| "asc".to_string());
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(20);
    let skip = (page - 1) * limit;

    let _sort_doc = match sort_order.as_str() {
        "desc" => doc! { sort_by: -1 },
        _ => doc! { sort_by: 1 },
    };

    let mut cursor = events.find(query, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut events_list = Vec::new();
    let mut total_count = 0;
    
    while let Some(event) = cursor.next().await {
        if let Ok(e) = event {
            let event_info = build_event_response(&e, &state).await?;
            events_list.push(event_info);
            total_count += 1;
        }
    }

    // Apply pagination
    let start = skip as usize;
    let end = (start + limit as usize).min(events_list.len());
    let paginated_events = events_list.into_iter().skip(start).take(end - start).collect::<Vec<_>>();

    Ok((StatusCode::OK, Json(json!({
        "events": paginated_events,
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

pub async fn get_event_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(event_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&event_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid event ID"}))))?;

    let events = state.mongo.collection::<Event>("events");
    let event = events.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Event not found"}))))?;

    let event_info = build_event_response(&event, &state).await?;
    Ok((StatusCode::OK, Json(event_info)))
}

pub async fn create_event_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateEventRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let events = state.mongo.collection::<Event>("events");
    
    // Validate datetime format
    let start_datetime = chrono::DateTime::parse_from_rfc3339(&payload.start_datetime)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid start datetime format"}))))?;
    
    let end_datetime = chrono::DateTime::parse_from_rfc3339(&payload.end_datetime)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid end datetime format"}))))?;

    if start_datetime >= end_datetime {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Start time must be before end time"}))));
    }

    // Get organizer info
    let profiles = state.mongo.collection::<Profile>("profiles");
    let organizer_profile = profiles.find_one(doc! { "user_id": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Organizer profile not found"}))))?;

    let new_event = Event {
        id: None,
        title: payload.title,
        description: payload.description,
        location: payload.location,
        location_type: payload.location_type,
        venue_name: payload.venue_name,
        venue_address: payload.venue_address,
        virtual_meeting_url: payload.virtual_meeting_url,
        start_datetime: start_datetime.into(),
        end_datetime: end_datetime.into(),
        registration_start: payload.registration_start.map(|s| chrono::DateTime::parse_from_rfc3339(&s).unwrap().into()),
        registration_end: payload.registration_end.map(|s| chrono::DateTime::parse_from_rfc3339(&s).unwrap().into()),
        max_attendees: payload.max_attendees,
        current_attendees: 0,
        category: payload.category,
        tags: payload.tags,
        organizer_id: user.user_id,
        organizer_name: organizer_profile.username,
        organizer_contact: None,
        event_type: payload.event_type,
        status: payload.status,
        is_recurring: payload.is_recurring,
        recurrence_pattern: payload.recurrence_pattern,
        recurrence_end_date: payload.recurrence_end_date.map(|s| chrono::DateTime::parse_from_rfc3339(&s).unwrap().into()),
        image_url: payload.image_url,
        banner_url: payload.banner_url,
        featured: payload.featured,
        ticket_price: payload.ticket_price,
        currency: payload.currency,
        rsvp_required: payload.rsvp_required,
        waitlist_enabled: payload.waitlist_enabled,
        waitlist_count: 0,
        created_at: DateTime::now(),
        updated_at: DateTime::now(),
    };

    let result = events.insert_one(new_event, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({
        "message": "Event created successfully",
        "event_id": result.inserted_id.as_object_id().unwrap().to_hex()
    }))))
}

pub async fn update_event_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(event_id): Path<String>,
    Json(payload): Json<UpdateEventRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&event_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid event ID"}))))?;

    let events = state.mongo.collection::<Event>("events");
    
    let mut update_doc = doc! {};
    
    if let Some(title) = payload.title {
        update_doc.insert("title", title);
    }
    if let Some(description) = payload.description {
        update_doc.insert("description", description);
    }
    if let Some(location) = payload.location {
        update_doc.insert("location", location);
    }
    if let Some(location_type) = payload.location_type {
        update_doc.insert("location_type", location_type);
    }
    if let Some(venue_name) = payload.venue_name {
        update_doc.insert("venue_name", venue_name);
    }
    if let Some(venue_address) = payload.venue_address {
        update_doc.insert("venue_address", venue_address);
    }
    if let Some(virtual_meeting_url) = payload.virtual_meeting_url {
        update_doc.insert("virtual_meeting_url", virtual_meeting_url);
    }
    if let Some(start_datetime) = payload.start_datetime {
        let dt = chrono::DateTime::parse_from_rfc3339(&start_datetime)
            .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid start datetime format"}))))?;
        update_doc.insert("start_datetime", dt);
    }
    if let Some(end_datetime) = payload.end_datetime {
        let dt = chrono::DateTime::parse_from_rfc3339(&end_datetime)
            .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid end datetime format"}))))?;
        update_doc.insert("end_datetime", dt);
    }
    if let Some(registration_start) = payload.registration_start {
        let dt = chrono::DateTime::parse_from_rfc3339(&registration_start)
            .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid registration start format"}))))?;
        update_doc.insert("registration_start", dt);
    }
    if let Some(registration_end) = payload.registration_end {
        let dt = chrono::DateTime::parse_from_rfc3339(&registration_end)
            .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid registration end format"}))))?;
        update_doc.insert("registration_end", dt);
    }
    if let Some(max_attendees) = payload.max_attendees {
        update_doc.insert("max_attendees", max_attendees);
    }
    if let Some(category) = payload.category {
        update_doc.insert("category", category);
    }
    if let Some(tags) = payload.tags {
        update_doc.insert("tags", tags);
    }
    if let Some(event_type) = payload.event_type {
        update_doc.insert("event_type", event_type);
    }
    if let Some(status) = payload.status {
        update_doc.insert("status", status);
    }
    if let Some(is_recurring) = payload.is_recurring {
        update_doc.insert("is_recurring", is_recurring);
    }
    if let Some(recurrence_pattern) = payload.recurrence_pattern {
        update_doc.insert("recurrence_pattern", recurrence_pattern);
    }
    if let Some(recurrence_end_date) = payload.recurrence_end_date {
        let dt = chrono::DateTime::parse_from_rfc3339(&recurrence_end_date)
            .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid recurrence end date format"}))))?;
        update_doc.insert("recurrence_end_date", dt);
    }
    if let Some(image_url) = payload.image_url {
        update_doc.insert("image_url", image_url);
    }
    if let Some(banner_url) = payload.banner_url {
        update_doc.insert("banner_url", banner_url);
    }
    if let Some(featured) = payload.featured {
        update_doc.insert("featured", featured);
    }
    if let Some(ticket_price) = payload.ticket_price {
        update_doc.insert("ticket_price", ticket_price);
    }
    if let Some(currency) = payload.currency {
        update_doc.insert("currency", currency);
    }
    if let Some(rsvp_required) = payload.rsvp_required {
        update_doc.insert("rsvp_required", rsvp_required);
    }
    if let Some(waitlist_enabled) = payload.waitlist_enabled {
        update_doc.insert("waitlist_enabled", waitlist_enabled);
    }

    update_doc.insert("updated_at", DateTime::now());

    events.update_one(
        doc! { "_id": oid },
        doc! { "$set": update_doc },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Event updated successfully"}))))
}

pub async fn delete_event_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(event_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&event_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid event ID"}))))?;

    let events = state.mongo.collection::<Event>("events");
    
    events.delete_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Also delete associated data
    let event_rsvps = state.mongo.collection::<EventRSVP>("event_rsvps");
    event_rsvps.delete_many(doc! { "event_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let event_attendees = state.mongo.collection::<EventAttendee>("event_attendees");
    event_attendees.delete_many(doc! { "event_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let event_comments = state.mongo.collection::<EventComment>("event_comments");
    event_comments.delete_many(doc! { "event_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let event_notifications = state.mongo.collection::<EventNotification>("event_notifications");
    event_notifications.delete_many(doc! { "event_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let event_analytics = state.mongo.collection::<EventAnalytics>("event_analytics");
    event_analytics.delete_many(doc! { "event_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Event deleted successfully"}))))
}

pub async fn get_event_calendar_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let events = state.mongo.collection::<Event>("events");
    
    let mut cursor = events.find(doc! {}, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut calendar_events = Vec::new();
    let mut total_events = 0;
    let mut upcoming_events = 0;
    let mut ongoing_events = 0;
    let mut completed_events = 0;
    let mut total_attendees = 0;
    
    let now = chrono::Utc::now();
    
    while let Some(event) = cursor.next().await {
        if let Ok(e) = event {
            total_events += 1;
            
            // Count event types
            let event_end = e.end_datetime.to_chrono();
            let event_start = e.start_datetime.to_chrono();
            
            if event_end < now {
                completed_events += 1;
            } else if event_start <= now && event_end >= now {
                ongoing_events += 1;
            } else {
                upcoming_events += 1;
            }
            
            total_attendees += e.current_attendees;
            
            calendar_events.push(CalendarEvent {
                id: e.id.unwrap().to_hex(),
                title: e.title,
                start: event_start.to_rfc3339(),
                end: event_end.to_rfc3339(),
                category: e.category,
                location: e.location,
                status: e.status,
                attendees: e.current_attendees,
                max_attendees: e.max_attendees,
            });
        }
    }

    let summary = CalendarSummary {
        total_events,
        upcoming_events,
        ongoing_events,
        completed_events,
        total_attendees,
    };

    let calendar_response = EventCalendarResponse {
        events: calendar_events,
        summary,
    };

    Ok((StatusCode::OK, Json(calendar_response)))
}

pub async fn check_in_attendee_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(event_id): Path<String>,
    Json(payload): Json<CheckInRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let event_oid = ObjectId::parse_str(&event_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid event ID"}))))?;
    
    let user_oid = ObjectId::parse_str(&payload.user_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;

    let event_attendees = state.mongo.collection::<EventAttendee>("event_attendees");
    
    // Check if attendee exists
    let attendee = event_attendees.find_one(doc! { 
        "event_id": event_oid, 
        "user_id": user_oid 
    }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Attendee not found"}))))?;

    // Update check-in status
    event_attendees.update_one(
        doc! { "_id": attendee.id.unwrap() },
        doc! { 
            "$set": { 
                "checked_in": payload.attended,
                "check_in_time": if payload.attended { Some(DateTime::now()) } else { None }
            }
        },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Attendee check-in updated"}))))
}

pub async fn get_event_analytics_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(event_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&event_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid event ID"}))))?;

    // Get event info
    let events = state.mongo.collection::<Event>("events");
    let event = events.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Event not found"}))))?;

    // Get RSVP stats
    let event_rsvps = state.mongo.collection::<EventRSVP>("event_rsvps");
    let interested_count = event_rsvps.count_documents(doc! { "event_id": oid, "status": "interested" }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let going_count = event_rsvps.count_documents(doc! { "event_id": oid, "status": "going" }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let maybe_count = event_rsvps.count_documents(doc! { "event_id": oid, "status": "maybe" }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let not_going_count = event_rsvps.count_documents(doc! { "event_id": oid, "status": "not_going" }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Get attendance stats
    let event_attendees = state.mongo.collection::<EventAttendee>("event_attendees");
    let checked_in_count = event_attendees.count_documents(doc! { "event_id": oid, "checked_in": true }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let total_attendees_count = event_attendees.count_documents(doc! { "event_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let attendance_rate = if total_attendees_count > 0 {
        (checked_in_count as f64 / total_attendees_count as f64) * 100.0
    } else {
        0.0
    };

    let rsvp_stats = RSVPStats {
        interested: interested_count as i32,
        going: going_count as i32,
        maybe: maybe_count as i32,
        not_going: not_going_count as i32,
    };

    let attendance_stats = AttendanceStats {
        checked_in: checked_in_count as i32,
        total_attendees: total_attendees_count as i32,
        attendance_rate,
    };

    let analytics = EventResponse {
        id: event.id.unwrap().to_hex(),
        title: event.title,
        description: event.description,
        location: event.location,
        location_type: event.location_type,
        venue_name: event.venue_name,
        venue_address: event.venue_address,
        virtual_meeting_url: event.virtual_meeting_url,
        start_datetime: event.start_datetime.to_chrono().to_rfc3339(),
        end_datetime: event.end_datetime.to_chrono().to_rfc3339(),
        registration_start: event.registration_start.map(|dt| dt.to_chrono().to_rfc3339()),
        registration_end: event.registration_end.map(|dt| dt.to_chrono().to_rfc3339()),
        max_attendees: event.max_attendees,
        current_attendees: event.current_attendees,
        category: event.category,
        tags: event.tags,
        organizer_id: event.organizer_id.to_hex(),
        organizer_name: event.organizer_name,
        organizer_contact: event.organizer_contact,
        event_type: event.event_type,
        status: event.status,
        is_recurring: event.is_recurring,
        recurrence_pattern: event.recurrence_pattern,
        recurrence_end_date: event.recurrence_end_date.map(|dt| dt.to_chrono().to_rfc3339()),
        image_url: event.image_url,
        banner_url: event.banner_url,
        featured: event.featured,
        ticket_price: event.ticket_price,
        currency: event.currency,
        rsvp_required: event.rsvp_required,
        waitlist_enabled: event.waitlist_enabled,
        waitlist_count: event.waitlist_count,
        created_at: event.created_at.to_chrono().to_rfc3339(),
        updated_at: event.updated_at.to_chrono().to_rfc3339(),
        rsvp_stats,
        attendance_stats,
    };

    Ok((StatusCode::OK, Json(analytics)))
}

// --- Helper Functions ---

async fn build_event_response(
    event: &Event,
    state: &Arc<AppState>,
) -> Result<EventResponse, (StatusCode, Json<serde_json::Value>)> {
    // Get RSVP stats
    let event_rsvps = state.mongo.collection::<EventRSVP>("event_rsvps");
    let interested_count = event_rsvps.count_documents(doc! { "event_id": event.id.unwrap(), "status": "interested" }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let going_count = event_rsvps.count_documents(doc! { "event_id": event.id.unwrap(), "status": "going" }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let maybe_count = event_rsvps.count_documents(doc! { "event_id": event.id.unwrap(), "status": "maybe" }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let not_going_count = event_rsvps.count_documents(doc! { "event_id": event.id.unwrap(), "status": "not_going" }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Get attendance stats
    let event_attendees = state.mongo.collection::<EventAttendee>("event_attendees");
    let checked_in_count = event_attendees.count_documents(doc! { "event_id": event.id.unwrap(), "checked_in": true }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let total_attendees_count = event_attendees.count_documents(doc! { "event_id": event.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let attendance_rate = if total_attendees_count > 0 {
        (checked_in_count as f64 / total_attendees_count as f64) * 100.0
    } else {
        0.0
    };

    Ok(EventResponse {
        id: event.id.unwrap().to_hex(),
        title: event.title.clone(),
        description: event.description.clone(),
        location: event.location.clone(),
        location_type: event.location_type.clone(),
        venue_name: event.venue_name.clone(),
        venue_address: event.venue_address.clone(),
        virtual_meeting_url: event.virtual_meeting_url.clone(),
        start_datetime: event.start_datetime.to_chrono().to_rfc3339(),
        end_datetime: event.end_datetime.to_chrono().to_rfc3339(),
        registration_start: event.registration_start.map(|dt| dt.to_chrono().to_rfc3339()),
        registration_end: event.registration_end.map(|dt| dt.to_chrono().to_rfc3339()),
        max_attendees: event.max_attendees,
        current_attendees: event.current_attendees,
        category: event.category.clone(),
        tags: event.tags.clone(),
        organizer_id: event.organizer_id.to_hex(),
        organizer_name: event.organizer_name.clone(),
        organizer_contact: event.organizer_contact.clone(),
        event_type: event.event_type.clone(),
        status: event.status.clone(),
        is_recurring: event.is_recurring,
        recurrence_pattern: event.recurrence_pattern.clone(),
        recurrence_end_date: event.recurrence_end_date.map(|dt| dt.to_chrono().to_rfc3339()),
        image_url: event.image_url.clone(),
        banner_url: event.banner_url.clone(),
        featured: event.featured,
        ticket_price: event.ticket_price,
        currency: event.currency.clone(),
        rsvp_required: event.rsvp_required,
        waitlist_enabled: event.waitlist_enabled,
        waitlist_count: event.waitlist_count,
        created_at: event.created_at.to_chrono().to_rfc3339(),
        updated_at: event.updated_at.to_chrono().to_rfc3339(),
        rsvp_stats: RSVPStats {
            interested: interested_count as i32,
            going: going_count as i32,
            maybe: maybe_count as i32,
            not_going: not_going_count as i32,
        },
        attendance_stats: AttendanceStats {
            checked_in: checked_in_count as i32,
            total_attendees: total_attendees_count as i32,
            attendance_rate,
        },
    })
}

pub fn event_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_events_handler))
        .route("/:id", get(get_event_handler).put(update_event_handler).delete(delete_event_handler))
        .route("/:id/checkin", post(check_in_attendee_handler))
        .route("/:id/analytics", get(get_event_analytics_handler))
        .route("/calendar", get(get_event_calendar_handler))
}
