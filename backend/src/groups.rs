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
use crate::models::{Group, GroupPost, Profile, Location};
use crate::auth::AuthUser;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use futures::stream::StreamExt;

// --- DTOs ---

#[derive(Deserialize)]
pub struct CreateGroupRequest {
    pub name: String,
    pub description: String,
    pub category: String,
    pub avatar_url: Option<String>,
    pub cover_url: Option<String>,
    pub is_private: bool,
    pub max_members: Option<i32>,
}

#[derive(Deserialize)]
pub struct GroupFilter {
    pub category: Option<String>,
    pub search: Option<String>,
}

#[derive(Serialize)]
pub struct GroupResponse {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub avatar_url: Option<String>,
    pub cover_url: Option<String>,
    pub member_count: usize,
    pub max_members: Option<i32>,
    pub is_private: bool,
    pub is_member: bool,
    pub is_admin: bool,
    pub created_at: String,
}

#[derive(Deserialize)]
pub struct LocationRequest {
    pub latitude: f64,
    pub longitude: f64,
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub is_live: Option<bool>,
    #[serde(default)]
    pub duration_minutes: Option<i32>,
}

#[derive(Deserialize)]
pub struct CreateGroupPostRequest {
    pub content: String,
    pub media_urls: Vec<String>,
    pub post_type: Option<String>,
    pub location: Option<LocationRequest>,
}

// --- Handlers ---

pub async fn create_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateGroupRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<Group>("groups");

    let new_group = Group {
        id: None,
        name: payload.name,
        description: payload.description,
        category: payload.category,
        avatar_url: payload.avatar_url,
        cover_url: payload.cover_url,
        creator_id: user.user_id,
        admins: vec![user.user_id],
        members: vec![user.user_id], // Creator is first member
        is_private: payload.is_private,
        max_members: payload.max_members,
        created_at: DateTime::now(),
    };

    let result = collection.insert_one(new_group, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({
        "message": "Group created",
        "id": result.inserted_id.as_object_id().unwrap().to_hex()
    }))))
}

pub async fn list_groups_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(filter): Query<GroupFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<Group>("groups");

    let mut query = doc! {};

    if let Some(category) = filter.category {
        if category != "all" {
            query.insert("category", category);
        }
    }

    if let Some(search) = filter.search {
        if !search.is_empty() {
            query.insert("name", doc! { "$regex": search, "$options": "i" });
        }
    }

    let mut cursor = collection.find(query, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut groups = Vec::new();

    while let Some(group) = cursor.next().await {
        if let Ok(grp) = group {
            let is_member = grp.members.contains(&user.user_id);
            let is_admin = grp.admins.contains(&user.user_id);

            groups.push(GroupResponse {
                id: grp.id.unwrap().to_hex(),
                name: grp.name,
                description: grp.description,
                category: grp.category,
                avatar_url: grp.avatar_url,
                cover_url: grp.cover_url,
                member_count: grp.members.len(),
                max_members: grp.max_members,
                is_private: grp.is_private,
                is_member,
                is_admin,
                created_at: grp.created_at.to_chrono().to_rfc3339(),
            });
        }
    }

    Ok((StatusCode::OK, Json(groups)))
}

pub async fn get_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid group ID"}))))?;

    let collection = state.mongo.collection::<Group>("groups");
    let group = collection.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Group not found"}))))?;

    let is_member = group.members.contains(&user.user_id);
    let is_admin = group.admins.contains(&user.user_id);

    let response = GroupResponse {
        id: group.id.unwrap().to_hex(),
        name: group.name,
        description: group.description,
        category: group.category,
        avatar_url: group.avatar_url,
        cover_url: group.cover_url,
        member_count: group.members.len(),
        max_members: group.max_members,
        is_private: group.is_private,
        is_member,
        is_admin,
        created_at: group.created_at.to_chrono().to_rfc3339(),
    };

    Ok((StatusCode::OK, Json(response)))
}

pub async fn join_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid group ID"}))))?;

    let collection = state.mongo.collection::<Group>("groups");
    let group = collection.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Group not found"}))))?;

    // Check if already a member
    if group.members.contains(&user.user_id) {
        return Ok((StatusCode::OK, Json(json!({"message": "Already a member"}))));
    }

    // Check capacity
    if let Some(max) = group.max_members {
        if group.members.len() >= max as usize {
            return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Group is full"}))));
        }
    }

    // Add member
    collection.update_one(
        doc! { "_id": oid },
        doc! { "$push": { "members": user.user_id } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Joined group"}))))
}

pub async fn leave_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid group ID"}))))?;

    let collection = state.mongo.collection::<Group>("groups");

    collection.update_one(
        doc! { "_id": oid },
        doc! {
            "$pull": {
                "members": user.user_id,
                "admins": user.user_id
            }
        },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Left group"}))))
}

pub async fn create_group_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<CreateGroupPostRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let group_oid = ObjectId::parse_str(&id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid group ID"}))))?;

    // Check verification
    let users_collection = state.mongo.collection::<crate::models::User>("users");
    let db_user = users_collection.find_one(doc! { "_id": user.user_id }, None).await.unwrap_or(None);
    if db_user.map_or(true, |u| !u.is_verified) {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Account verification required to post in groups. Please verify your account for Ksh 20."}))));
    }

    // Verify membership
    let groups_collection = state.mongo.collection::<Group>("groups");
    let group = groups_collection.find_one(doc! { "_id": group_oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Group not found"}))))?;

    if !group.members.contains(&user.user_id) {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Must be a member to post"}))));
    }

    let posts_collection = state.mongo.collection::<GroupPost>("group_posts");
    let new_post = GroupPost {
        id: None,
        group_id: group_oid,
        user_id: user.user_id,
        content: payload.content,
        media_urls: payload.media_urls,
        post_type: payload.post_type.unwrap_or_else(|| "text".to_string()),
        location: payload.location.map(|l| {
            let expires_at = l.duration_minutes.map(|mins| {
                let chrono_dt = chrono::Utc::now() + chrono::Duration::minutes(mins as i64);
                mongodb::bson::DateTime::from_chrono(chrono_dt)
            });
            Location {
                latitude: l.latitude,
                longitude: l.longitude,
                label: l.label,
                is_live: l.is_live,
                expires_at,
            }
        }),
        likes_count: 0,
        comments_count: 0,
        created_at: DateTime::now(),
    };

    let result = posts_collection.insert_one(new_post, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({
        "message": "Post created",
        "id": result.inserted_id.as_object_id().unwrap().to_hex()
    }))))
}

pub async fn get_group_posts_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let group_oid = ObjectId::parse_str(&id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid group ID"}))))?;

    // Verify membership for private groups
    let groups_collection = state.mongo.collection::<Group>("groups");
    let group = groups_collection.find_one(doc! { "_id": group_oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Group not found"}))))?;

    if group.is_private && !group.members.contains(&user.user_id) {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Private group - members only"}))));
    }

    let posts_collection = state.mongo.collection::<GroupPost>("group_posts");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    let mut cursor = posts_collection.find(
        doc! { "group_id": group_oid },
        mongodb::options::FindOptions::builder().sort(doc! { "created_at": -1 }).limit(50).build()
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut posts = Vec::new();

    while let Some(post) = cursor.next().await {
        if let Ok(p) = post {
            let profile = profiles_collection.find_one(doc! { "user_id": p.user_id }, None).await
                .unwrap_or(None);

            let (username, avatar_url) = match profile {
                Some(prof) => (prof.username, prof.avatar_url),
                None => ("Unknown".to_string(), None),
            };

            posts.push(json!({
                "id": p.id.unwrap().to_hex(),
                "user_id": p.user_id.to_hex(),
                "username": username,
                "avatar_url": avatar_url,
                "content": p.content,
                "media_urls": p.media_urls,
                "likes_count": p.likes_count,
                "comments_count": p.comments_count,
                "created_at": p.created_at.to_chrono().to_rfc3339(),
            }));
        }
    }

    Ok((StatusCode::OK, Json(posts)))
}

pub fn group_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(create_group_handler).get(list_groups_handler))
        .route("/:id", get(get_group_handler))
        .route("/:id/join", post(join_group_handler))
        .route("/:id/leave", post(leave_group_handler))
        .route("/:id/posts", post(create_group_post_handler).get(get_group_posts_handler))
}
