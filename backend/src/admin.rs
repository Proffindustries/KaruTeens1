use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, put, delete},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use crate::db::AppState;
use crate::models::{User, Profile, Post, Transaction, Story, ContentModeration};
use crate::auth::AuthUser;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use futures::stream::StreamExt;
use chrono::{Utc, Duration};

// --- Admin Middleware ---

pub async fn require_admin(
    user_id: ObjectId,
    state: &Arc<AppState>,
) -> Result<String, (StatusCode, Json<serde_json::Value>)> {
    let users = state.mongo.collection::<User>("users");
    let user_doc = users.find_one(doc! { "_id": user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    match user_doc {
        Some(u) if u.role == "admin" || u.role == "superadmin" => Ok(u.role),
        _ => Err((StatusCode::FORBIDDEN, Json(json!({"error": "Admin access required"}))))
    }
}

// --- DTOs ---

#[derive(Deserialize)]
pub struct UserFilter {
    pub role: Option<String>,
    pub verified: Option<bool>,
    pub premium: Option<bool>,
    pub search: Option<String>,
}

#[derive(Serialize)]
pub struct AdminUserResponse {
    pub id: String,
    pub email: String,
    pub role: String,
    pub is_verified: bool,
    pub is_premium: bool,
    pub is_banned: bool,
    pub username: Option<String>,
    pub created_at: String,
}

#[derive(Serialize)]
pub struct PlatformStats {
    pub total_users: i64,
    pub verified_users: i64,
    pub premium_users: i64,
    pub banned_users: i64,
    pub total_posts: i64,
    pub total_events: i64,
    pub total_groups: i64,
    pub active_users: i64,
    pub total_revenue: f64,
    pub total_stories: i64,
    pub total_reports: i64,
}

#[derive(Deserialize)]
pub struct UpdateRoleRequest {
    pub role: String,
}

#[derive(Deserialize)]
pub struct BanUserRequest {
    pub banned: bool,
}

// --- Handlers ---

pub async fn get_platform_stats_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    require_admin(user.user_id, &state).await?;

    let users_collection = state.mongo.collection::<User>("users");
    let posts_collection = state.mongo.collection::<Post>("posts");

    // Get user counts
    let total_users = users_collection.count_documents(doc! {}, None).await.unwrap_or(0) as i64;
    let verified_users = users_collection.count_documents(doc! { "is_verified": true }, None).await.unwrap_or(0) as i64;
    let premium_users = users_collection.count_documents(doc! { "is_premium": true }, None).await.unwrap_or(0) as i64;
    let banned_users = users_collection.count_documents(doc! { "is_banned": true }, None).await.unwrap_or(0) as i64;

    // Get content counts
    let total_posts = posts_collection.count_documents(doc! {}, None).await.unwrap_or(0) as i64;
    
    let events_collection = state.mongo.collection::<mongodb::bson::Document>("events");
    let total_events = events_collection.count_documents(doc! {}, None).await.unwrap_or(0) as i64;
    
    let groups_collection = state.mongo.collection::<mongodb::bson::Document>("groups");
    let total_groups = groups_collection.count_documents(doc! {}, None).await.unwrap_or(0) as i64;
    
    // Calculate Active Users (last seen in 30 days)
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    let active_threshold = Utc::now() - Duration::days(30);
    let active_users = profiles_collection.count_documents(doc! { 
        "last_seen_at": { "$gte": DateTime::from_chrono(active_threshold) } 
    }, None).await.unwrap_or(0) as i64;

    // Calculate Revenue
    let transactions_collection = state.mongo.collection::<Transaction>("transactions");
    let mut revenue_cursor = transactions_collection.aggregate(vec![
        doc! { "$match": { "status": "completed" } },
        doc! { "$group": { "_id": null, "total": { "$sum": "$amount" } } }
    ], None).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let mut total_revenue = 0.0;
    if let Some(result) = revenue_cursor.next().await {
        if let Ok(doc) = result {
            if let Ok(amount) = doc.get_f64("total") {
                total_revenue = amount;
            } else if let Ok(amount_i) = doc.get_i32("total") { // sometimes comes as int if round
                total_revenue = amount_i as f64;
            } else if let Ok(amount_d) = doc.get_f64("total") { // double check
                total_revenue = amount_d;
            }
        }
    }

    // Connect Stories
    let stories_collection = state.mongo.collection::<Story>("stories");
    let total_stories = stories_collection.count_documents(doc! {}, None).await.unwrap_or(0) as i64;
    
    // Connect Reports (Content Moderation Queue)
    let reports_collection = state.mongo.collection::<ContentModeration>("content_moderation");
    let total_reports = reports_collection.count_documents(doc! { "status": "pending" }, None).await.unwrap_or(0) as i64;

    let stats = PlatformStats {
        total_users,
        verified_users,
        premium_users,
        banned_users,
        total_posts,
        total_events,
        total_groups,
        active_users,
        total_revenue,
        total_stories,
        total_reports,
    };

    Ok((StatusCode::OK, Json(stats)))
}

pub async fn list_users_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(filter): Query<UserFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    require_admin(user.user_id, &state).await?;

    let users_collection = state.mongo.collection::<User>("users");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    let mut query = doc! {};

    if let Some(role) = filter.role {
        if role != "all" {
            query.insert("role", role);
        }
    }

    if let Some(verified) = filter.verified {
        query.insert("is_verified", verified);
    }

    if let Some(premium) = filter.premium {
        query.insert("is_premium", premium);
    }

    let mut cursor = users_collection.find(
        query,
        mongodb::options::FindOptions::builder()
            .sort(doc! { "created_at": -1 })
            .limit(100)
            .build()
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut users = Vec::new();

    while let Some(user) = cursor.next().await {
        if let Ok(u) = user {
            let user_id = u.id.unwrap();

            let username = profiles_collection.find_one(doc! { "user_id": user_id }, None).await
                .ok()
                .flatten()
                .map(|p| p.username);

            users.push(AdminUserResponse {
                id: user_id.to_hex(),
                email: u.email,
                role: u.role,
                is_verified: u.is_verified,
                is_premium: u.is_premium,
                is_banned: u.is_banned,
                username,
                created_at: u.created_at.to_chrono().to_rfc3339(),
            });
        }
    }

    Ok((StatusCode::OK, Json(users)))
}

pub async fn update_user_role_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(user_id_str): Path<String>,
    Json(payload): Json<UpdateRoleRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let admin_role = require_admin(user.user_id, &state).await?;

    // Only superadmin can change roles
    if admin_role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "SuperAdmin required to change roles"}))));
    }

    let target_user_id = ObjectId::parse_str(&user_id_str)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;

    let users_collection = state.mongo.collection::<User>("users");
    users_collection.update_one(
        doc! { "_id": target_user_id },
        doc! { "$set": { "role": &payload.role } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Role updated"}))))
}

pub async fn ban_user_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(user_id_str): Path<String>,
    Json(payload): Json<BanUserRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    require_admin(user.user_id, &state).await?;

    let target_user_id = ObjectId::parse_str(&user_id_str)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;

    let users_collection = state.mongo.collection::<User>("users");

    if payload.banned {
        users_collection.update_one(
            doc! { "_id": target_user_id },
            doc! { "$set": {
                "is_banned": true,
                "banned_at": DateTime::now(),
                "banned_by": user.user_id
            }},
            None
        ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    } else {
        users_collection.update_one(
            doc! { "_id": target_user_id },
            doc! { "$set": {
                "is_banned": false
            }, "$unset": {
                "banned_at": "",
                "banned_by": ""
            }},
            None
        ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    }

    let action = if payload.banned { "banned" } else { "unbanned" };
    Ok((StatusCode::OK, Json(json!({"message": format!("User {}", action)}))))
}

pub async fn verify_user_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(user_id_str): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    require_admin(user.user_id, &state).await?;

    let target_user_id = ObjectId::parse_str(&user_id_str)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;

    let users_collection = state.mongo.collection::<User>("users");
    users_collection.update_one(
        doc! { "_id": target_user_id },
        doc! { "$set": { "is_verified": true } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "User verified"}))))
}

pub async fn delete_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(post_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    require_admin(user.user_id, &state).await?;

    let post_oid = ObjectId::parse_str(&post_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid post ID"}))))?;

    let posts_collection = state.mongo.collection::<Post>("posts");
    posts_collection.delete_one(doc! { "_id": post_oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Post deleted"}))))
}

pub fn admin_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/stats", get(get_platform_stats_handler))
        .route("/users", get(list_users_handler))
        .route("/users/:id/role", put(update_user_role_handler))
        .route("/users/:id/ban", put(ban_user_handler))
        .route("/users/:id/verify", put(verify_user_handler))
        .route("/posts/:id", delete(delete_post_handler))
}
