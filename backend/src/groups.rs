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
use crate::models::{Group, GroupPost, User, Profile};
use crate::auth::AuthUser;
use futures::stream::StreamExt;

// --- DTOs ---

#[derive(Deserialize)]
pub struct CreateGroupRequest {
    pub name: String,
    pub description: String,
    pub category: String,
    pub is_private: bool,
    pub max_members: Option<i32>,
}

#[derive(Deserialize)]
pub struct UpdateGroupRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub is_private: Option<bool>,
    pub max_members: Option<i32>,
    pub avatar_url: Option<String>,
    pub cover_url: Option<String>,
}

#[derive(Deserialize)]
pub struct AddMemberRequest {
    pub user_id: String,
}

#[derive(Deserialize)]
pub struct RemoveMemberRequest {
    pub user_id: String,
}

#[derive(Deserialize)]
pub struct MakeAdminRequest {
    pub user_id: String,
}

#[derive(Serialize)]
pub struct GroupResponse {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub avatar_url: Option<String>,
    pub cover_url: Option<String>,
    pub creator_id: String,
    pub admins: Vec<String>,
    pub members: Vec<MemberInfo>,
    pub is_private: bool,
    pub max_members: Option<i32>,
    pub member_count: usize,
    pub created_at: String,
}

#[derive(Serialize)]
pub struct MemberInfo {
    pub user_id: String,
    pub username: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Serialize)]
pub struct GroupPostResponse {
    pub id: String,
    pub group_id: String,
    pub user_id: String,
    pub username: String,
    pub content: String,
    pub media_urls: Vec<String>,
    pub post_type: String,
    pub location: Option<serde_json::Value>,
    pub likes_count: i32,
    pub comments_count: i32,
    pub created_at: String,
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

pub async fn list_groups_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<GroupFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let groups = state.mongo.collection::<Group>("groups");
    
    let mut query = doc! {};
    
    if let Some(category) = &params.category {
        query.insert("category", category);
    }
    
    if let Some(is_private) = params.is_private {
        query.insert("is_private", is_private);
    }

    let mut cursor = groups.find(query, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut groups_list = Vec::new();
    
    while let Some(group) = cursor.next().await {
        if let Ok(g) = group {
            let group_info = build_group_response(&g, &state).await?;
            groups_list.push(group_info);
        }
    }

    Ok((StatusCode::OK, Json(groups_list)))
}

pub async fn get_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&group_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid group ID"}))))?;

    let groups = state.mongo.collection::<Group>("groups");
    let group = groups.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Group not found"}))))?;

    let group_info = build_group_response(&group, &state).await?;
    Ok((StatusCode::OK, Json(group_info)))
}

pub async fn create_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateGroupRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let groups = state.mongo.collection::<Group>("groups");
    
    let new_group = Group {
        id: None,
        name: payload.name,
        description: payload.description,
        category: payload.category,
        avatar_url: None,
        cover_url: None,
        creator_id: user.user_id,
        admins: vec![user.user_id],
        members: vec![user.user_id],
        is_private: payload.is_private,
        max_members: payload.max_members,
        created_at: DateTime::now(),
    };

    let result = groups.insert_one(new_group, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({
        "message": "Group created successfully",
        "group_id": result.inserted_id.as_object_id().unwrap().to_hex()
    }))))
}

pub async fn update_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
    Json(payload): Json<UpdateGroupRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&group_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid group ID"}))))?;

    let groups = state.mongo.collection::<Group>("groups");
    
    let mut update_doc = doc! {};
    
    if let Some(name) = payload.name {
        update_doc.insert("name", name);
    }
    if let Some(description) = payload.description {
        update_doc.insert("description", description);
    }
    if let Some(category) = payload.category {
        update_doc.insert("category", category);
    }
    if let Some(is_private) = payload.is_private {
        update_doc.insert("is_private", is_private);
    }
    if let Some(max_members) = payload.max_members {
        update_doc.insert("max_members", max_members);
    }
    if let Some(avatar_url) = payload.avatar_url {
        update_doc.insert("avatar_url", avatar_url);
    }
    if let Some(cover_url) = payload.cover_url {
        update_doc.insert("cover_url", cover_url);
    }

    groups.update_one(
        doc! { "_id": oid },
        doc! { "$set": update_doc },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Group updated successfully"}))))
}

pub async fn delete_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&group_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid group ID"}))))?;

    let groups = state.mongo.collection::<Group>("groups");
    
    groups.delete_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Also delete associated posts
    let group_posts = state.mongo.collection::<GroupPost>("group_posts");
    group_posts.delete_many(doc! { "group_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Group deleted successfully"}))))
}

pub async fn add_member_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
    Json(payload): Json<AddMemberRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let group_oid = ObjectId::parse_str(&group_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid group ID"}))))?;
    
    let user_oid = ObjectId::parse_str(&payload.user_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;

    let groups = state.mongo.collection::<Group>("groups");
    
    // Check if user exists
    let users = state.mongo.collection::<User>("users");
    let user_exists = users.find_one(doc! { "_id": user_oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .is_some();

    if !user_exists {
        return Err((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))));
    }

    // Add user to group
    groups.update_one(
        doc! { "_id": group_oid },
        doc! { "$addToSet": { "members": user_oid } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Member added successfully"}))))
}

pub async fn remove_member_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
    Json(payload): Json<RemoveMemberRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let group_oid = ObjectId::parse_str(&group_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid group ID"}))))?;
    
    let user_oid = ObjectId::parse_str(&payload.user_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;

    let groups = state.mongo.collection::<Group>("groups");
    
    // Remove user from members and admins
    groups.update_one(
        doc! { "_id": group_oid },
        doc! { 
            "$pull": { 
                "members": user_oid,
                "admins": user_oid
            }
        },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Member removed successfully"}))))
}

pub async fn make_admin_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
    Json(payload): Json<MakeAdminRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let group_oid = ObjectId::parse_str(&group_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid group ID"}))))?;
    
    let user_oid = ObjectId::parse_str(&payload.user_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user ID"}))))?;

    let groups = state.mongo.collection::<Group>("groups");
    
    // Add user to admins
    groups.update_one(
        doc! { "_id": group_oid },
        doc! { "$addToSet": { "admins": user_oid } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "User promoted to admin"}))))
}

pub async fn list_group_posts_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let group_oid = ObjectId::parse_str(&group_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid group ID"}))))?;

    let group_posts = state.mongo.collection::<GroupPost>("group_posts");
    
    let mut cursor = group_posts.find(doc! { "group_id": group_oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut posts = Vec::new();
    
    while let Some(post) = cursor.next().await {
        if let Ok(p) = post {
            let post_info = build_group_post_response(&p, &state).await?;
            posts.push(post_info);
        }
    }

    Ok((StatusCode::OK, Json(posts)))
}

// --- Helper Functions ---

async fn build_group_response(
    group: &Group,
    state: &Arc<AppState>,
) -> Result<GroupResponse, (StatusCode, Json<serde_json::Value>)> {
    let profiles = state.mongo.collection::<Profile>("profiles");
    
    let mut members_info = Vec::new();
    
    for member_id in &group.members {
        if let Ok(Some(profile)) = profiles.find_one(doc! { "user_id": member_id }, None).await {
            members_info.push(MemberInfo {
                user_id: member_id.to_hex(),
                username: profile.username,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
            });
        }
    }

    Ok(GroupResponse {
        id: group.id.unwrap().to_hex(),
        name: group.name.clone(),
        description: group.description.clone(),
        category: group.category.clone(),
        avatar_url: group.avatar_url.clone(),
        cover_url: group.cover_url.clone(),
        creator_id: group.creator_id.to_hex(),
        admins: group.admins.iter().map(|id| id.to_hex()).collect(),
        members: members_info,
        is_private: group.is_private,
        max_members: group.max_members,
        member_count: group.members.len(),
        created_at: group.created_at.to_chrono().to_rfc3339(),
    })
}

async fn build_group_post_response(
    post: &GroupPost,
    state: &Arc<AppState>,
) -> Result<GroupPostResponse, (StatusCode, Json<serde_json::Value>)> {
    let profiles = state.mongo.collection::<Profile>("profiles");
    
    let username = if let Ok(Some(profile)) = profiles.find_one(doc! { "user_id": post.user_id }, None).await {
        profile.username
    } else {
        "Unknown".to_string()
    };

    Ok(GroupPostResponse {
        id: post.id.unwrap().to_hex(),
        group_id: post.group_id.to_hex(),
        user_id: post.user_id.to_hex(),
        username,
        content: post.content.clone(),
        media_urls: post.media_urls.clone(),
        post_type: post.post_type.clone(),
        location: post.location.as_ref().map(|loc| serde_json::to_value(loc).unwrap_or_default()),
        likes_count: post.likes_count,
        comments_count: post.comments_count,
        created_at: post.created_at.to_chrono().to_rfc3339(),
    })
}

#[derive(Deserialize)]
pub struct GroupFilter {
    pub category: Option<String>,
    pub is_private: Option<bool>,
}

pub fn group_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_groups_handler))
        .route("/:id", get(get_group_handler).put(update_group_handler).delete(delete_group_handler))
        .route("/:id/members/add", post(add_member_handler))
        .route("/:id/members/remove", post(remove_member_handler))
        .route("/:id/admins/add", post(make_admin_handler))
        .route("/:id/posts", get(list_group_posts_handler))
}
