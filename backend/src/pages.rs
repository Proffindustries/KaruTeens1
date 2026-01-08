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
use crate::models::{Page, PageRevision, PageView, PageLike, PageComment, PageAnalytics, User, Profile};
use crate::auth::AuthUser;
use futures::stream::StreamExt;

// --- DTOs ---

#[derive(Deserialize, Serialize, Clone)]
pub struct CreatePageRequest {
    pub title: String,
    pub slug: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub featured_image: Option<String>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub meta_keywords: Option<Vec<String>>,
    pub status: String,
    pub visibility: String,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub template: Option<String>,
    pub redirect_url: Option<String>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct UpdatePageRequest {
    pub title: Option<String>,
    pub slug: Option<String>,
    pub content: Option<String>,
    pub excerpt: Option<String>,
    pub featured_image: Option<String>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub meta_keywords: Option<Vec<String>>,
    pub status: Option<String>,
    pub visibility: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub template: Option<String>,
    pub redirect_url: Option<String>,
}

#[derive(Deserialize)]
pub struct PublishPageRequest {
    pub publish_now: bool,
    pub scheduled_date: Option<String>,
}

#[derive(Deserialize)]
pub struct PageFilter {
    pub status: Option<String>,
    pub visibility: Option<String>,
    pub category: Option<String>,
    pub author: Option<String>,
    pub search: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct PageResponse {
    pub id: String,
    pub title: String,
    pub slug: String,
    pub excerpt: Option<String>,
    pub featured_image: Option<String>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub meta_keywords: Option<Vec<String>>,
    pub status: String,
    pub visibility: String,
    pub author_id: String,
    pub author_name: String,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub template: Option<String>,
    pub redirect_url: Option<String>,
    pub seo_score: Option<f64>,
    pub view_count: i32,
    pub likes_count: i32,
    pub comments_count: i32,
    pub published_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
pub struct PageAnalyticsResponse {
    pub page_id: String,
    pub page_title: String,
    pub total_views: i32,
    pub unique_visitors: i32,
    pub avg_time_on_page: f64,
    pub bounce_rate: f64,
    pub top_referrers: Vec<ReferrerInfo>,
    pub traffic_by_hour: Vec<TrafficHour>,
    pub traffic_by_day: Vec<TrafficDay>,
}

#[derive(Serialize)]
pub struct ReferrerInfo {
    pub referrer: String,
    pub views: i32,
}

#[derive(Serialize)]
pub struct TrafficHour {
    pub hour: i32,
    pub views: i32,
}

#[derive(Serialize)]
pub struct TrafficDay {
    pub date: String,
    pub views: i32,
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

pub async fn list_pages_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<PageFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let pages = state.mongo.collection::<Page>("pages");
    
    let mut query = doc! {};
    
    if let Some(status) = &params.status {
        query.insert("status", status);
    }
    
    if let Some(visibility) = &params.visibility {
        query.insert("visibility", visibility);
    }
    
    if let Some(category) = &params.category {
        query.insert("category", category);
    }
    
    if let Some(search) = &params.search {
        query.insert("$or", vec![
            doc! { "title": { "$regex": search, "$options": "i" } },
            doc! { "content": { "$regex": search, "$options": "i" } },
            doc! { "excerpt": { "$regex": search, "$options": "i" } },
        ]);
    }

    let sort_by = params.sort_by.unwrap_or_else(|| "created_at".to_string());
    let sort_order = params.sort_order.unwrap_or_else(|| "desc".to_string());
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(20);
    let skip = (page - 1) * limit;

    let _sort_doc = match sort_order.as_str() {
        "asc" => doc! { sort_by: 1 },
        _ => doc! { sort_by: -1 },
    };

    let mut cursor = pages.find(query, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut pages_list = Vec::new();
    let mut total_count = 0;
    
    while let Some(page) = cursor.next().await {
        if let Ok(p) = page {
            let page_info = build_page_response(&p, &state).await?;
            pages_list.push(page_info);
            total_count += 1;
        }
    }

    // Apply pagination
    let start = skip as usize;
    let end = (start + limit as usize).min(pages_list.len());
    let paginated_pages = pages_list.into_iter().skip(start).take(end - start).collect::<Vec<_>>();

    Ok((StatusCode::OK, Json(json!({
        "pages": paginated_pages,
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

pub async fn get_page_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(page_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&page_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid page ID"}))))?;

    let pages = state.mongo.collection::<Page>("pages");
    let page = pages.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Page not found"}))))?;

    let page_info = build_page_response(&page, &state).await?;
    Ok((StatusCode::OK, Json(page_info)))
}

pub async fn create_page_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreatePageRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let pages = state.mongo.collection::<Page>("pages");
    
    // Check if slug already exists
    let existing_page = pages.find_one(doc! { "slug": &payload.slug }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    if existing_page.is_some() {
        return Err((StatusCode::CONFLICT, Json(json!({"error": "Slug already exists"}))));
    }

    let new_page = Page {
        id: None,
        title: payload.title.clone(),
        slug: payload.slug.clone(),
        content: payload.content.clone(),
        excerpt: payload.excerpt.clone(),
        featured_image: payload.featured_image.clone(),
        meta_title: payload.meta_title.clone(),
        meta_description: payload.meta_description.clone(),
        meta_keywords: payload.meta_keywords.clone(),
        status: payload.status.clone(),
        visibility: payload.visibility.clone(),
        author_id: user.user_id,
        category: payload.category.clone(),
        tags: payload.tags.clone(),
        template: payload.template.clone(),
        redirect_url: payload.redirect_url.clone(),
        seo_score: None,
        view_count: 0,
        likes_count: 0,
        comments_count: 0,
        published_at: None,
        created_at: DateTime::now(),
        updated_at: DateTime::now(),
    };

    let result = pages.insert_one(new_page, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Create initial revision
    create_page_revision(&state, result.inserted_id.as_object_id().unwrap(), &user.user_id, "Initial creation", &payload).await?;

    Ok((StatusCode::CREATED, Json(json!({
        "message": "Page created successfully",
        "page_id": result.inserted_id.as_object_id().unwrap().to_hex()
    }))))
}

pub async fn update_page_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(page_id): Path<String>,
    Json(payload): Json<UpdatePageRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&page_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid page ID"}))))?;

    let pages = state.mongo.collection::<Page>("pages");
    
    // Get current page to create revision
    let _current_page = pages.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Page not found"}))))?;

    let mut update_doc = doc! {};
    
    if let Some(title) = &payload.title {
        update_doc.insert("title", title);
    }
    if let Some(slug) = &payload.slug {
        update_doc.insert("slug", slug);
    }
    if let Some(content) = &payload.content {
        update_doc.insert("content", content);
    }
    if let Some(excerpt) = &payload.excerpt {
        update_doc.insert("excerpt", excerpt);
    }
    if let Some(featured_image) = &payload.featured_image {
        update_doc.insert("featured_image", featured_image);
    }
    if let Some(meta_title) = &payload.meta_title {
        update_doc.insert("meta_title", meta_title);
    }
    if let Some(meta_description) = &payload.meta_description {
        update_doc.insert("meta_description", meta_description);
    }
    if let Some(meta_keywords) = &payload.meta_keywords {
        update_doc.insert("meta_keywords", meta_keywords);
    }
    if let Some(status) = &payload.status {
        update_doc.insert("status", status);
        if status == "published" {
            update_doc.insert("published_at", DateTime::now());
        }
    }
    if let Some(visibility) = &payload.visibility {
        update_doc.insert("visibility", visibility);
    }
    if let Some(category) = &payload.category {
        update_doc.insert("category", category);
    }
    if let Some(tags) = &payload.tags {
        update_doc.insert("tags", tags);
    }
    if let Some(template) = &payload.template {
        update_doc.insert("template", template);
    }
    if let Some(redirect_url) = &payload.redirect_url {
        update_doc.insert("redirect_url", redirect_url);
    }

    update_doc.insert("updated_at", DateTime::now());

    pages.update_one(
        doc! { "_id": oid },
        doc! { "$set": update_doc },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Create revision
    create_page_revision(&state, oid, &user.user_id, "Page updated", &payload).await?;

    Ok((StatusCode::OK, Json(json!({"message": "Page updated successfully"}))))
}

pub async fn delete_page_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(page_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&page_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid page ID"}))))?;

    let pages = state.mongo.collection::<Page>("pages");
    
    pages.delete_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Also delete associated data
    let page_revisions = state.mongo.collection::<PageRevision>("page_revisions");
    page_revisions.delete_many(doc! { "page_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let page_views = state.mongo.collection::<PageView>("page_views");
    page_views.delete_many(doc! { "page_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let page_likes = state.mongo.collection::<PageLike>("page_likes");
    page_likes.delete_many(doc! { "page_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let page_comments = state.mongo.collection::<PageComment>("page_comments");
    page_comments.delete_many(doc! { "page_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let page_analytics = state.mongo.collection::<PageAnalytics>("page_analytics");
    page_analytics.delete_many(doc! { "page_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Page deleted successfully"}))))
}

pub async fn publish_page_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(page_id): Path<String>,
    Json(payload): Json<PublishPageRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&page_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid page ID"}))))?;

    let pages = state.mongo.collection::<Page>("pages");
    
    let mut update_doc = doc! {
        "status": "published",
        "published_at": DateTime::now(),
        "updated_at": DateTime::now()
    };

    if payload.publish_now {
        update_doc.insert("published_at", DateTime::now());
    } else if let Some(scheduled_date) = payload.scheduled_date {
        let scheduled_time = chrono::DateTime::parse_from_rfc3339(&scheduled_date)
            .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid scheduled date format"}))))?;
        update_doc.insert("published_at", scheduled_time);
    }

    pages.update_one(
        doc! { "_id": oid },
        doc! { "$set": update_doc },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Page published successfully"}))))
}

pub async fn unpublish_page_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(page_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&page_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid page ID"}))))?;

    let pages = state.mongo.collection::<Page>("pages");
    
    pages.update_one(
        doc! { "_id": oid },
        doc! { 
            "$set": { 
                "status": "draft",
                "published_at": null,
                "updated_at": DateTime::now()
            }
        },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Page unpublished successfully"}))))
}

pub async fn get_page_analytics_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(page_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&page_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid page ID"}))))?;

    // Get page info
    let pages = state.mongo.collection::<Page>("pages");
    let page = pages.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Page not found"}))))?;

    // Calculate analytics
    let page_views = state.mongo.collection::<PageView>("page_views");
    let total_views = page_views.count_documents(doc! { "page_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let unique_visitors = page_views.distinct("user_id", doc! { "page_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .len() as i32;

    // Get referrers
    let referrers_cursor = page_views.aggregate(vec![
        doc! { "$match": { "page_id": oid, "referrer": { "$ne": null } } },
        doc! { "$group": { "_id": "$referrer", "count": { "$sum": 1 } } },
        doc! { "$sort": { "count": -1 } },
        doc! { "$limit": 10 }
    ], None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut top_referrers = Vec::new();
    let mut referrers_stream = referrers_cursor;
    while let Some(result) = referrers_stream.next().await {
        if let Ok(doc) = result {
            if let Some(referrer) = doc.get("_id").and_then(|v| v.as_str()) {
                if let Some(count) = doc.get("count").and_then(|v| v.as_i32()) {
                    top_referrers.push(ReferrerInfo {
                        referrer: referrer.to_string(),
                        views: count,
                    });
                }
            }
        }
    }

    // Get traffic by hour
    let traffic_by_hour = get_traffic_by_hour(&state, oid).await?;
    let traffic_by_day = get_traffic_by_day(&state, oid).await?;

    // Calculate average time on page 
    // TODO: This requires a 'duration' field in PageView which we don't have yet. 
    // Returning 0.0 instead of fake data.
    let avg_time_on_page = 0.0; 

    // Calculate bounce rate
    // Definition: % of visitors who view only one page. 
    // For a single page analytics, this is hard to calculate without session tracking.
    // We will return 0.0 for now to be accurate about our lack of data.
    let bounce_rate = 0.0;

    let analytics = PageAnalyticsResponse {
        page_id: page.id.unwrap().to_hex(),
        page_title: page.title,
        total_views: total_views as i32,
        unique_visitors,
        avg_time_on_page,
        bounce_rate,
        top_referrers,
        traffic_by_hour,
        traffic_by_day,
    };

    Ok((StatusCode::OK, Json(analytics)))
}

// --- Helper Functions ---

async fn build_page_response(
    page: &Page,
    state: &Arc<AppState>,
) -> Result<PageResponse, (StatusCode, Json<serde_json::Value>)> {
    let profiles = state.mongo.collection::<Profile>("profiles");
    
    let author_name = if let Ok(Some(profile)) = profiles.find_one(doc! { "user_id": page.author_id }, None).await {
        profile.username
    } else {
        "Unknown".to_string()
    };

    Ok(PageResponse {
        id: page.id.unwrap().to_hex(),
        title: page.title.clone(),
        slug: page.slug.clone(),
        excerpt: page.excerpt.clone(),
        featured_image: page.featured_image.clone(),
        meta_title: page.meta_title.clone(),
        meta_description: page.meta_description.clone(),
        meta_keywords: page.meta_keywords.clone(),
        status: page.status.clone(),
        visibility: page.visibility.clone(),
        author_id: page.author_id.to_hex(),
        author_name,
        category: page.category.clone(),
        tags: page.tags.clone(),
        template: page.template.clone(),
        redirect_url: page.redirect_url.clone(),
        seo_score: page.seo_score,
        view_count: page.view_count,
        likes_count: page.likes_count,
        comments_count: page.comments_count,
        published_at: page.published_at.map(|dt| dt.to_chrono().to_rfc3339()),
        created_at: page.created_at.to_chrono().to_rfc3339(),
        updated_at: page.updated_at.to_chrono().to_rfc3339(),
    })
}

async fn create_page_revision(
    state: &Arc<AppState>,
    page_id: ObjectId,
    editor_id: &ObjectId,
    editor_notes: &str,
    payload: &impl serde::Serialize,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let page_revisions = state.mongo.collection::<PageRevision>("page_revisions");
    
    let revision = PageRevision {
        id: None,
        page_id,
        title: serde_json::to_value(payload).unwrap().get("title").unwrap().as_str().unwrap_or("").to_string(),
        content: serde_json::to_value(payload).unwrap().get("content").unwrap().as_str().unwrap_or("").to_string(),
        excerpt: serde_json::to_value(payload).unwrap().get("excerpt").and_then(|v| v.as_str()).map(|s| s.to_string()),
        featured_image: serde_json::to_value(payload).unwrap().get("featured_image").and_then(|v| v.as_str()).map(|s| s.to_string()),
        meta_title: serde_json::to_value(payload).unwrap().get("meta_title").and_then(|v| v.as_str()).map(|s| s.to_string()),
        meta_description: serde_json::to_value(payload).unwrap().get("meta_description").and_then(|v| v.as_str()).map(|s| s.to_string()),
        meta_keywords: serde_json::to_value(payload).unwrap().get("meta_keywords").and_then(|v| v.as_array()).map(|arr| arr.iter().map(|v| v.as_str().unwrap_or("").to_string()).collect()),
        editor_id: *editor_id,
        editor_notes: Some(editor_notes.to_string()),
        created_at: DateTime::now(),
    };

    page_revisions.insert_one(revision, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(())
}

async fn get_traffic_by_hour(
    state: &Arc<AppState>,
    page_id: ObjectId,
) -> Result<Vec<TrafficHour>, (StatusCode, Json<serde_json::Value>)> {
    let page_views = state.mongo.collection::<PageView>("page_views");
    
    let mut traffic = Vec::new();
    for hour in 0..24 {
        let count = page_views.count_documents(doc! {
            "page_id": page_id,
            "$expr": { "$eq": [{ "$hour": "$created_at" }, hour] }
        }, None).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
        
        traffic.push(TrafficHour {
            hour,
            views: count as i32,
        });
    }

    Ok(traffic)
}

async fn get_traffic_by_day(
    state: &Arc<AppState>,
    page_id: ObjectId,
) -> Result<Vec<TrafficDay>, (StatusCode, Json<serde_json::Value>)> {
    let page_views = state.mongo.collection::<PageView>("page_views");
    
    // Get last 30 days of traffic
    let mut traffic = Vec::new();
    for i in 0..30 {
        let date = chrono::Utc::now() - chrono::Duration::days(i);
        let start_of_day = date.date_naive().and_hms_opt(0, 0, 0).unwrap();
        let end_of_day = date.date_naive().and_hms_opt(23, 59, 59).unwrap();
        
        let count = page_views.count_documents(doc! {
            "page_id": page_id,
            "created_at": {
                "$gte": mongodb::bson::DateTime::from_chrono(start_of_day.and_utc()),
                "$lte": mongodb::bson::DateTime::from_chrono(end_of_day.and_utc())
            }
        }, None).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
        
        traffic.push(TrafficDay {
            date: start_of_day.format("%Y-%m-%d").to_string(),
            views: count as i32,
        });
    }

    traffic.reverse(); // Oldest first
    Ok(traffic)
}

pub fn page_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_pages_handler))
        .route("/:id", get(get_page_handler).put(update_page_handler).delete(delete_page_handler))
        .route("/:id/publish", post(publish_page_handler))
        .route("/:id/unpublish", post(unpublish_page_handler))
        .route("/:id/analytics", get(get_page_analytics_handler))
}