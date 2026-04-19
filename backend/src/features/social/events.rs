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
use crate::features::infrastructure::db::AppState;
use crate::models::{Event, EventRSVP, EventAttendee, EventComment, EventNotification, EventAnalytics, User};
use crate::features::infrastructure::dto::{
    EventResponse, RSVPStats, AttendanceStats,
    CreateEventRequest, UpdateEventRequest, CheckInRequest, EventFilter,
    PaginatedResponse, PaginationInfo, IdResponse, MessageResponse
};
use crate::features::infrastructure::error::{AppResult, AppError};
use crate::features::auth::auth_service::AuthUser;
use crate::utils::check_admin;
use futures::stream::StreamExt;

// --- DTOs ---

#[derive(Deserialize)]
pub struct RSVPRequest {
    pub status: String,
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

// --- Handlers ---

pub async fn create_event_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateEventRequest>,
) -> AppResult<impl IntoResponse> {
    let events = state.mongo.collection::<Event>("events");
    let profiles = state.mongo.collection::<crate::models::Profile>("profiles");
    
    let profile_doc = profiles.find_one(doc! { "user_id": user.user_id }, None).await?;

    let organizer_name = match profile_doc {
        Some(p) => p.username,
        None => "Unknown".to_string(),
    };

    let start_dt = chrono::DateTime::parse_from_rfc3339(&payload.start_datetime)
        .map_err(|_| AppError::BadRequest("Invalid start datetime format".to_string()))?;
    
    let end_dt = chrono::DateTime::parse_from_rfc3339(&payload.end_datetime)
        .map_err(|_| AppError::BadRequest("Invalid end datetime format".to_string()))?;

    let reg_start = match payload.registration_start {
        Some(ref s) => Some(chrono::DateTime::parse_from_rfc3339(s).map_err(|_| AppError::BadRequest("Invalid reg start".to_string()))?.into()),
        None => None
    };
    
    let reg_end = match payload.registration_end {
        Some(ref s) => Some(chrono::DateTime::parse_from_rfc3339(s).map_err(|_| AppError::BadRequest("Invalid reg end".to_string()))?.into()),
        None => None
    };

    let rec_end = match payload.recurrence_end_date {
        Some(ref s) => Some(chrono::DateTime::parse_from_rfc3339(s).map_err(|_| AppError::BadRequest("Invalid rec end".to_string()))?.into()),
        None => None
    };

    let new_event = Event {
        id: None,
        title: payload.title,
        description: payload.description,
        location: payload.location,
        location_type: payload.location_type.unwrap_or_else(|| "Physical".to_string()),
        venue_name: payload.venue_name,
        venue_address: payload.venue_address,
        virtual_meeting_url: payload.virtual_meeting_url,
        start_datetime: start_dt.into(),
        end_datetime: end_dt.into(),
        registration_start: reg_start,
        registration_end: reg_end,
        max_attendees: payload.max_attendees,
        current_attendees: 0,
        category: payload.category,
        tags: payload.tags,
        organizer_id: user.user_id,
        organizer_name,
        organizer_contact: payload.organizer_contact,
        event_type: payload.event_type.unwrap_or_else(|| "General".to_string()),
        status: payload.status.unwrap_or("published".to_string()),
        is_recurring: payload.is_recurring.unwrap_or(false),
        recurrence_pattern: payload.recurrence_pattern,
        recurrence_end_date: rec_end,
        image_url: payload.image_url,
        banner_url: payload.banner_url,
        featured: payload.featured.unwrap_or(false),
        ticket_price: payload.ticket_price.map(|p| (p * 100.0) as i64),
        currency: payload.currency.or(Some("KES".to_string())),
        rsvp_required: payload.rsvp_required.unwrap_or(false),
        waitlist_enabled: payload.waitlist_enabled.unwrap_or(false),
        waitlist_count: 0,
        created_at: DateTime::now(),
        updated_at: DateTime::now(),
    };

    let result = events.insert_one(new_event, None).await?;

    Ok((StatusCode::CREATED, Json(IdResponse { 
        id: result.inserted_id.as_object_id().unwrap().to_hex(),
        message: Some("Event created successfully".to_string())
    })))
}

pub async fn list_events_handler(
    State(state): State<Arc<AppState>>,
    user: Option<AuthUser>,
    Query(params): Query<EventFilter>,
) -> AppResult<impl IntoResponse> {
    let events = state.mongo.collection::<Event>("events");
    
    let is_admin = match &user {
        Some(u) => {
            let users = state.mongo.collection::<User>("users");
            match users.find_one(doc! { "_id": u.user_id }, None).await {
                Ok(Some(ud)) if ud.role == "admin" || ud.role == "superadmin" => true,
                _ => false,
            }
        },
        None => false,
    };
    
    let mut query = doc! {};
    
    if !is_admin {
        query.insert("status", "published");
    } else if let Some(status) = &params.status {
        if status != "all" {
            query.insert("status", status);
        }
    }
    
    if let Some(category) = &params.category {
        if category != "all" {
            query.insert("category", category);
        }
    }
    
    if let Some(location_type) = &params.location_type {
        query.insert("location_type", location_type);
    }
    
    if let Some(event_type) = &params.event_type {
        query.insert("event_type", event_type);
    }
    
    if let Some(search) = &params.search {
        let escaped_search = regex::escape(search);
        query.insert("$or", vec![
            doc! { "title": { "$regex": &escaped_search, "$options": "i" } },
            doc! { "description": { "$regex": &escaped_search, "$options": "i" } },
            doc! { "location": { "$regex": &escaped_search, "$options": "i" } },
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

    if let Some(true) = params.upcoming {
        query.insert("start_datetime", doc! { "$gte": mongodb::bson::DateTime::now() });
    }

    let sort_by = params.sort_by.unwrap_or_else(|| "start_datetime".to_string());
    let sort_order = params.sort_order.unwrap_or_else(|| "asc".to_string());
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(20);
    let skip = (page - 1) * limit;

    let sort_doc = match sort_order.as_str() {
        "desc" => doc! { sort_by: -1 },
        _ => doc! { sort_by: 1 },
    };

    let total_count = events.count_documents(query.clone(), None).await?;

    let find_options = mongodb::options::FindOptions::builder()
        .sort(sort_doc)
        .skip(Some(skip as u64))
        .limit(Some(limit))
        .build();

    let mut cursor = events.find(query, find_options).await?;

    let mut raw_events = Vec::new();
    while let Some(event) = cursor.next().await {
        if let Ok(e) = event {
            raw_events.push(e);
        }
    }

    let mut paginated_events = Vec::new();
    for e in &raw_events {
        paginated_events.push(build_event_response(e, &state).await?);
    }

    Ok((StatusCode::OK, Json(PaginatedResponse {
        items: paginated_events,
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

pub async fn get_event_handler(
    State(state): State<Arc<AppState>>,
    Path(event_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&event_id)
        .map_err(|_| AppError::BadRequest("Invalid event ID".to_string()))?;

    let events = state.mongo.collection::<Event>("events");
    let event = events.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Event not found".to_string()))?;

    let event_info: crate::features::infrastructure::dto::EventResponse = build_event_response(&event, &state).await?;
    Ok((StatusCode::OK, Json(event_info)))
}

pub async fn update_event_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(event_id): Path<String>,
    Json(payload): Json<UpdateEventRequest>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&event_id)
        .map_err(|_| AppError::BadRequest("Invalid event ID".to_string()))?;

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
    if let Some(ref start_datetime) = payload.start_datetime {
        let dt = chrono::DateTime::parse_from_rfc3339(&start_datetime)
            .map_err(|_| AppError::BadRequest("Invalid start datetime format".to_string()))?;
        update_doc.insert("start_datetime", dt);
    }
    if let Some(ref end_datetime) = payload.end_datetime {
        let dt = chrono::DateTime::parse_from_rfc3339(&end_datetime)
            .map_err(|_| AppError::BadRequest("Invalid end datetime format".to_string()))?;
        update_doc.insert("end_datetime", dt);
    }
    if let Some(ref registration_start) = payload.registration_start {
        let dt = chrono::DateTime::parse_from_rfc3339(&registration_start)
            .map_err(|_| AppError::BadRequest("Invalid registration start format".to_string()))?;
        update_doc.insert("registration_start", dt);
    }
    if let Some(ref registration_end) = payload.registration_end {
        let dt = chrono::DateTime::parse_from_rfc3339(&registration_end)
            .map_err(|_| AppError::BadRequest("Invalid registration end format".to_string()))?;
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

    update_doc.insert("updated_at", DateTime::now());

    events.update_one(
        doc! { "_id": oid },
        doc! { "$set": update_doc },
        None
    ).await?;

    Ok((StatusCode::OK, Json(MessageResponse { message: "Event updated successfully".to_string() })))
}

pub async fn delete_event_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(event_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&event_id)
        .map_err(|_| AppError::BadRequest("Invalid event ID".to_string()))?;

    let events = state.mongo.collection::<Event>("events");
    
    events.delete_one(doc! { "_id": oid }, None).await?;

    // Also delete associated data
    let event_rsvps = state.mongo.collection::<EventRSVP>("event_rsvps");
    event_rsvps.delete_many(doc! { "event_id": oid }, None).await?;

    let event_attendees = state.mongo.collection::<EventAttendee>("event_attendees");
    event_attendees.delete_many(doc! { "event_id": oid }, None).await?;

    let event_comments = state.mongo.collection::<EventComment>("event_comments");
    event_comments.delete_many(doc! { "event_id": oid }, None).await?;

    let event_notifications = state.mongo.collection::<EventNotification>("event_notifications");
    event_notifications.delete_many(doc! { "event_id": oid }, None).await?;

    let event_analytics = state.mongo.collection::<EventAnalytics>("event_analytics");
    event_analytics.delete_many(doc! { "event_id": oid }, None).await?;

    Ok((StatusCode::OK, Json(MessageResponse { message: "Event deleted successfully".to_string() })))
}

pub async fn get_event_calendar_handler(
    State(state): State<Arc<AppState>>,
) -> AppResult<impl IntoResponse> {
    let events = state.mongo.collection::<Event>("events");
    
    let mut cursor = events.find(doc! {}, None).await?;

    let mut calendar_events = Vec::new();
    let mut total_events = 0;
    let mut upcoming_events = 0;
    let mut ongoing_events = 0;
    let mut completed_events = 0;
    let mut total_attendees = 0;
    
    let now = chrono::Utc::now();
    
    while let Some(event_res) = cursor.next().await {
        if let Ok(e) = event_res {
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
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let event_oid = ObjectId::parse_str(&event_id)
        .map_err(|_| AppError::BadRequest("Invalid event ID".to_string()))?;
    
    let user_oid = ObjectId::parse_str(&user.user_id.to_hex())
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let event_attendees = state.mongo.collection::<EventAttendee>("event_attendees");
    
    // Check if attendee exists
    let attendee = event_attendees.find_one(doc! { 
        "event_id": event_oid, 
        "user_id": user_oid 
    }, None).await?
        .ok_or(AppError::NotFound("Attendee not found".to_string()))?;

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
    ).await?;

    Ok((StatusCode::OK, Json(json!({"message": "Attendee check-in updated"}))))
}

pub async fn get_event_analytics_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(event_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&event_id)
        .map_err(|_| AppError::BadRequest("Invalid event ID".to_string()))?;

    // Get event info
    let events = state.mongo.collection::<Event>("events");
    let event = events.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Event not found".to_string()))?;

    let analytics: crate::features::infrastructure::dto::EventResponse = build_event_response(&event, &state).await?;
    Ok((StatusCode::OK, Json(analytics)))
}

pub async fn rsvp_event_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(event_id): Path<String>,
    Json(payload): Json<RSVPRequest>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&event_id)
        .map_err(|_| AppError::BadRequest("Invalid event ID".to_string()))?;
    
    let event_rsvps = state.mongo.collection::<EventRSVP>("event_rsvps");
    let events = state.mongo.collection::<Event>("events");

    if events.find_one(doc! { "_id": oid }, None).await?.is_none() {
        return Err(AppError::NotFound("Event not found".to_string()));
    }

    let filter = doc! { "event_id": oid, "user_id": user.user_id };
    let update = doc! {
        "$set": { "status": payload.status },
        "$setOnInsert": { "created_at": mongodb::bson::DateTime::now() }
    };
    let options = mongodb::options::UpdateOptions::builder().upsert(true).build();

    event_rsvps.update_one(filter, update, options).await?;

    Ok((StatusCode::OK, Json(json!({"message": "RSVP updated successfully"}))))
}

pub async fn remove_rsvp_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(event_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&event_id)
        .map_err(|_| AppError::BadRequest("Invalid event ID".to_string()))?;
        
    let event_rsvps = state.mongo.collection::<EventRSVP>("event_rsvps");
    
    event_rsvps.delete_one(doc! { "event_id": oid, "user_id": user.user_id }, None).await?;

    Ok((StatusCode::OK, Json(json!({"message": "RSVP removed successfully"}))))
}

// --- Helper Functions ---

async fn build_event_response(
    event: &Event,
    state: &Arc<AppState>,
) -> AppResult<EventResponse> {
    // Run all count queries concurrently using try_join!
    let event_rsvps = state.mongo.collection::<EventRSVP>("event_rsvps");
    let event_attendees = state.mongo.collection::<EventAttendee>("event_attendees");
    let event_id = event.id.unwrap();

    let (interested_count, going_count, maybe_count, not_going_count, checked_in_count, total_attendees_count) = tokio::try_join!(
        event_rsvps.count_documents(doc! { "event_id": event_id, "status": "interested" }, None),
        event_rsvps.count_documents(doc! { "event_id": event_id, "status": "going" }, None),
        event_rsvps.count_documents(doc! { "event_id": event_id, "status": "maybe" }, None),
        event_rsvps.count_documents(doc! { "event_id": event_id, "status": "not_going" }, None),
        event_attendees.count_documents(doc! { "event_id": event_id, "checked_in": true }, None),
        event_attendees.count_documents(doc! { "event_id": event_id }, None),
    )?;

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
        is_virtual: event.location_type == "virtual",
        location_type: Some(event.location_type.clone()),
        venue_name: event.venue_name.clone(),
        venue_address: event.venue_address.clone(),
        virtual_meeting_url: event.virtual_meeting_url.clone(),
        start_datetime: event.start_datetime.to_chrono().to_rfc3339(),
        end_datetime: event.end_datetime.to_chrono().to_rfc3339(),
        registration_start: event.registration_start.map(|dt| dt.to_chrono().to_rfc3339()),
        registration_end: event.registration_end.map(|dt| dt.to_chrono().to_rfc3339()),
        max_attendees: event.max_attendees.unwrap_or(100) as u64,
        current_attendees: event.current_attendees as u64,
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
        ticket_price: event.ticket_price.map(|p| p as f64 / 100.0),
        currency: event.currency.clone(),
        rsvp_required: event.rsvp_required,
        waitlist_enabled: event.waitlist_enabled,
        waitlist_count: event.waitlist_count as u64,
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
        .route("/", get(list_events_handler).post(create_event_handler))
        .route("/:id", get(get_event_handler).put(update_event_handler).delete(delete_event_handler))
        .route("/:id/rsvp", post(rsvp_event_handler).delete(remove_rsvp_handler))
        .route("/:id/checkin", post(check_in_attendee_handler))
        .route("/:id/analytics", get(get_event_analytics_handler))
        .route("/calendar", get(get_event_calendar_handler))
}
