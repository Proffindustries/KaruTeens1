use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, put},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use crate::features::infrastructure::db::AppState;
use crate::models::{User, Profile, Post, Transaction, Story, ContentModeration};
use crate::features::auth::auth_service::AuthUser;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use futures::stream::StreamExt;
use chrono::{Utc, Duration};
use mongodb::options::UpdateOptions;
use crate::features::social::ws::{send_to_user, WsPayload};
use crate::features::social::messages::MessageResponse;
use crate::features::content::posts::post_routes;
use crate::features::social::events::event_routes;
use crate::features::content::comments::comment_routes;
use crate::features::content::stories::story_routes;
use crate::features::content::reels::reel_routes;
use crate::features::social::groups::group_routes;
use crate::features::social::pages::page_routes;
use crate::features::ads::ad_routes;

// --- DTOs za Mfumo ---
#[derive(Debug, Serialize, Deserialize)]
pub struct SystemSettings {
    pub is_payment_enabled: bool,
    pub maintenance_mode: bool,
    pub allow_new_registrations: bool,
    pub free_verification_limit: i64,
}

#[derive(Deserialize)]
pub struct UpdateSettingsRequest {
    pub is_payment_enabled: Option<bool>,
    pub maintenance_mode: Option<bool>,
    pub allow_new_registrations: Option<bool>,
}

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
    pub verified: Option<String>,  // Changed from bool to String to handle "all"
    pub premium: Option<String>,   // Changed from bool to String to handle "all"
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
    pub last_seen_at: Option<String>,
    pub post_count: i64,
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
    pub growth_rate: f64,
    pub report_breakdown: std::collections::HashMap<String, i64>,
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
    if let Some(Ok(doc)) = revenue_cursor.next().await {
        if let Ok(amount) = doc.get_f64("total") {
            total_revenue = amount;
        } else if let Ok(amount_i) = doc.get_i32("total") { // sometimes comes as int if round
            total_revenue = amount_i as f64;
        } else if let Ok(amount_d) = doc.get_f64("total") { // double check
            total_revenue = amount_d;
        }
    }

    // Connect Stories
    let stories_collection = state.mongo.collection::<Story>("stories");
    let total_stories = stories_collection.count_documents(doc! {}, None).await.unwrap_or(0) as i64;
    
    // Connect Reports (Content Moderation Queue)
    let reports_collection = state.mongo.collection::<ContentModeration>("content_moderation");
    let total_reports = reports_collection.count_documents(doc! { "status": "pending" }, None).await.unwrap_or(0) as i64;

    let mut report_breakdown = std::collections::HashMap::new();
    let mut cursor = reports_collection.aggregate(vec![
        doc! { "$group": { "_id": "$content_type", "count": { "$sum": 1 } } }
    ], None).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    while let Some(Ok(doc)) = cursor.next().await {
        if let (Ok(content_type), Ok(count)) = (doc.get_str("_id"), doc.get_i32("count")) {
            report_breakdown.insert(content_type.to_string(), count as i64);
        }
    }

    // Calculate Growth Rate (last 30 days vs previous 30 days)
    let thirty_days_ago = Utc::now() - Duration::days(30);
    let sixty_days_ago = Utc::now() - Duration::days(60);
    
    let new_users = users_collection.count_documents(doc! { 
        "created_at": { "$gte": DateTime::from_chrono(thirty_days_ago) } 
    }, None).await.unwrap_or(0) as f64;
    
    let prev_users = users_collection.count_documents(doc! { 
        "created_at": { 
            "$gte": DateTime::from_chrono(sixty_days_ago),
            "$lt": DateTime::from_chrono(thirty_days_ago)
        } 
    }, None).await.unwrap_or(0) as f64;
    
    let growth_rate = if prev_users > 0.0 {
        ((new_users - prev_users) / prev_users) * 100.0
    } else if new_users > 0.0 {
        100.0
    } else {
        0.0
    };

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
        growth_rate,
        report_breakdown,
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
        if verified == "true" {
            query.insert("is_verified", true);
        } else if verified == "false" {
            query.insert("is_verified", false);
        }
    }

    if let Some(premium) = filter.premium {
        if premium == "true" {
            query.insert("is_premium", true);
        } else if premium == "false" {
            query.insert("is_premium", false);
        }
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

            let profile = profiles_collection.find_one(doc! { "user_id": user_id }, None).await.ok().flatten();
            let username = profile.as_ref().map(|p| p.username.clone());
            let last_seen_at = profile.as_ref().and_then(|p| p.last_seen_at.map(|ls| ls.to_chrono().to_rfc3339()));

            let posts_collection = state.mongo.collection::<Post>("posts");
            let post_count = posts_collection.count_documents(doc! { "author_id": user_id }, None).await.unwrap_or(0) as i64;

            users.push(AdminUserResponse {
                id: user_id.to_hex(),
                email: u.email,
                role: u.role,
                is_verified: u.is_verified,
                is_premium: u.is_premium,
                is_banned: u.is_banned,
                username,
                created_at: u.created_at.to_chrono().to_rfc3339(),
                last_seen_at,
                post_count,
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

// --- Content Moderation Handlers (Real Data) ---
pub async fn list_moderation_items_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    require_admin(user.user_id, &state).await?;

    let moderation_collection = state.mongo.collection::<ContentModeration>("content_moderation");
    let mut cursor = moderation_collection.find(
        doc! { "status": "pending" },
        mongodb::options::FindOptions::builder().sort(doc! { "created_at": -1 }).limit(100).build()
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut items = Vec::new();
    while let Some(item) = cursor.next().await {
        if let Ok(i) = item {
            items.push(i);
        }
    }

    Ok((StatusCode::OK, Json(items)))
}

pub async fn update_moderation_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    require_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;

    let status = payload.get("status").and_then(|v| v.as_str())
        .ok_or((StatusCode::BAD_REQUEST, Json(json!({"error": "Missing status"}))))?;

    let moderation_collection = state.mongo.collection::<ContentModeration>("content_moderation");
    moderation_collection.update_one(
        doc! { "_id": oid },
        doc! { "$set": { 
            "status": status,
            "moderated_at": DateTime::now(),
            "moderated_by": user.user_id
        }},
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": format!("Status set to {}", status)}))))
}

// --- System Settings Handlers (Payment Toggle) ---
pub async fn get_settings_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    require_admin(user.user_id, &state).await?;

    let settings_collection = state.mongo.collection::<SystemSettings>("settings");
    let settings = settings_collection.find_one(doc! {}, None).await
        .unwrap_or(None)
        .unwrap_or(SystemSettings {
            is_payment_enabled: true,
            maintenance_mode: false,
            allow_new_registrations: true,
            free_verification_limit: 1000,
        });

    Ok((StatusCode::OK, Json(settings)))
}

pub async fn update_settings_update(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<UpdateSettingsRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let role = require_admin(user.user_id, &state).await?;
    
    if role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "SuperAdmin only can change system settings"}))));
    }

    let settings_collection = state.mongo.collection::<mongodb::bson::Document>("settings");
    let mut update_doc = doc! {};
    
    if let Some(val) = payload.is_payment_enabled { update_doc.insert("is_payment_enabled", val); }
    if let Some(val) = payload.maintenance_mode { update_doc.insert("maintenance_mode", val); }
    if let Some(val) = payload.allow_new_registrations { update_doc.insert("allow_new_registrations", val); }

    settings_collection.update_one(
        doc! {},
        doc! { "$set": update_doc },
        UpdateOptions::builder().upsert(true).build()
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "System settings updated"}))))
}




// --- Public System Status ---
pub async fn get_public_settings_handler(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let settings_collection = state.mongo.collection::<SystemSettings>("settings");
    let settings = settings_collection.find_one(doc! {}, None).await
        .unwrap_or(None)
        .unwrap_or(SystemSettings {
            is_payment_enabled: true,
            maintenance_mode: false,
            allow_new_registrations: true,
            free_verification_limit: 1000,
        });

    Ok((StatusCode::OK, Json(json!({
        "is_payment_enabled": settings.is_payment_enabled
    }))))
}

#[derive(Deserialize)]
pub struct BroadcastRequest {
    pub content: String,
}

pub async fn broadcast_system_message_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<BroadcastRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    require_admin(user.user_id, &state).await?;

    let users_collection = state.mongo.collection::<User>("users");
    let chats_collection = state.mongo.collection::<crate::models::Chat>("chats");
    let messages_collection = state.mongo.collection::<crate::models::Message>("messages");
    let notifications_collection = state.mongo.collection::<crate::models::Notification>("notifications");

    let mut cursor = users_collection.find(doc! { "is_banned": false }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let system_user_id = user.user_id;

    // Spawn the broadcast task to avoid timing out the admin request
    let state_clone = state.clone();
    let content = payload.content.clone();
    
    tokio::spawn(async move {
        while let Some(Ok(target_user)) = cursor.next().await {
            let target_user_id = target_user.id.unwrap();
            if target_user_id == system_user_id { continue; }

            // Find or create a 1-to-1 chat between admin and user marked as system
            let chat_query = doc! {
                "participants": { "$all": [system_user_id, target_user_id] },
                "is_group": false
            };

            let chat = state_clone.mongo.collection::<crate::models::Chat>("chats")
                .find_one(chat_query.clone(), None).await.unwrap_or(None);
            
            let chat_id = if let Some(c) = chat {
                let cid = c.id.unwrap();
                // Update last_message and last_message_time for existing chat
                let _ = state_clone.mongo.collection::<crate::models::Chat>("chats").update_one(
                    doc! { "_id": cid },
                    doc! { "$set": { 
                        "last_message": content.clone(),
                        "last_message_time": DateTime::now() 
                    } },
                    None
                ).await;
                cid
            } else {
                let new_chat = crate::models::Chat {
                    id: None,
                    participants: vec![system_user_id, target_user_id],
                    is_group: false,
                    name: Some("System".to_string()),
                    avatar_url: None,
                    admins: vec![system_user_id],
                    last_message: Some(content.clone()),
                    last_message_time: DateTime::now(),
                    disappearing_duration: None,
                    created_at: DateTime::now(),
                };
                if let Ok(res) = state_clone.mongo.collection::<crate::models::Chat>("chats").insert_one(new_chat, None).await {
                    res.inserted_id.as_object_id().unwrap()
                } else {
                    continue;
                }
            };

            // Create message
            let new_msg = crate::models::Message {
                id: None,
                chat_id,
                sender_id: system_user_id,
                content: content.clone(),
                encrypted_content: None,
                encryption_iv: None,
                attachment_url: None,
                attachment_type: None,
                reply_to_id: None,
                reactions: vec![],
                is_deleted: false,
                deleted_at: None,
                read_at: None,
                poll: None,
                location: None,
                contact: None,
                is_view_once: false,
                is_system: true,
                is_announcement: true,
                viewed_at: None,
                expires_at: None,
                created_at: DateTime::now(),
            };

            let msg_res = state_clone.mongo.collection::<crate::models::Message>("messages").insert_one(new_msg, None).await;
            let msg_id = if let Ok(r) = msg_res {
                r.inserted_id.as_object_id().unwrap()
            } else {
                continue;
            };

            // Notification
            let notif = crate::models::Notification {
                id: None,
                user_id: target_user_id,
                actor_id: system_user_id,
                notification_type: "system_broadcast".to_string(),
                target_id: Some(chat_id),
                content: format!("System Message: {}", if content.len() > 50 { &content[..47] } else { &content }),
                is_read: false,
                created_at: DateTime::now(),
            };
            let _ = state_clone.mongo.collection::<crate::models::Notification>("notifications").insert_one(notif, None).await;

            // WebSocket Broadcast
            let ws_msg = MessageResponse {
                id: msg_id.to_hex(),
                chat_id: chat_id.to_hex(),
                sender_id: system_user_id.to_hex(),
                sender_username: "System Admin".to_string(),
                content: content.clone(),
                attachment_url: None,
                attachment_type: None,
                created_at: chrono::Utc::now().to_rfc3339(),
                is_me: false,
                reply_to: None,
                reactions: vec![],
                is_deleted: false,
                read_at: None,
                encrypted_content: None,
                encryption_iv: None,
                poll: None,
                location: None,
                contact: None,
                is_view_once: false,
                viewed_at: None,
                expires_at: None,
            };

            let ws_payload = WsPayload {
                r#type: "message".to_string(),
                data: json!(ws_msg),
            };
            send_to_user(&state_clone, &target_user_id, &ws_payload).await;
        }
    });

    Ok((StatusCode::OK, Json(json!({"message": "Broadcast is being sent to all active users"}))))
}

pub fn admin_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/stats", get(get_platform_stats_handler))
        .route("/broadcast", axum::routing::post(broadcast_system_message_handler))
        .route("/users", get(list_users_handler))
        .route("/users/:id/role", put(update_user_role_handler))
        .route("/users/:id/ban", put(ban_user_handler))
        .route("/users/:id/verify", put(verify_user_handler))
        .route("/moderation", get(list_moderation_items_handler))
        .route("/moderation/:id", put(update_moderation_handler))
        .route("/settings", get(get_settings_handler).put(update_settings_update))
        .nest("/posts", post_routes())
        .nest("/events", event_routes())
        .nest("/comments", comment_routes())
        .nest("/stories", story_routes())
        .nest("/reels", reel_routes())
        .nest("/groups", group_routes())
        .nest("/pages", page_routes())
        .nest("/ads", ad_routes())
}
