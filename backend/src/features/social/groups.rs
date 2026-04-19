use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post, put, delete},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use mongodb::bson::{doc, oid::ObjectId};
use crate::features::infrastructure::db::AppState;
use crate::models::{Group, GroupPost, User, Profile};
use crate::features::infrastructure::dto::{
    GroupResponse, MemberInfo, GroupPostResponse, CreateGroupRequest, 
    UpdateGroupRequest, AddMemberRequest, RemoveMemberRequest, 
    MakeAdminRequest, GroupFilter, IdResponse, MessageResponse
};
use crate::features::infrastructure::error::{AppResult, AppError};
use crate::features::auth::auth_service::AuthUser;
use crate::utils::check_admin;
use futures::stream::StreamExt;

// --- Helpers: Check Group Admin Status ---

async fn check_group_admin(
    user_id: ObjectId,
    group_id: ObjectId,
    state: &Arc<AppState>,
) -> AppResult<Group> {
    let groups = state.mongo.collection::<Group>("groups");
    let group = groups.find_one(doc! { "_id": group_id }, None).await?
        .ok_or(AppError::NotFound("Group not found".to_string()))?;

    // Check if user is creator or an admin
    if group.creator_id != user_id && !group.admins.contains(&user_id) {
        // Also check if they are system admins
        match check_admin(user_id, state).await {
            Ok(_) => {}, // User is admin, proceed
            Err(_) => {
                return Err(AppError::Forbidden("Only group creator and admins can perform this action".to_string()));
            }
        }
    }
    
    Ok(group)
}

// --- Handlers ---

pub async fn create_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateGroupRequest>,
) -> AppResult<impl IntoResponse> {
    let groups = state.mongo.collection::<Group>("groups");
    
    let now = mongodb::bson::DateTime::now();
    let group = Group {
        id: None,
        name: payload.name,
        description: payload.description,
        category: payload.category,
        avatar_url: payload.avatar_url,
        cover_url: payload.cover_url,
        creator_id: user.user_id,
        admins: vec![user.user_id],
        members: vec![user.user_id],
        is_private: payload.is_private,
        max_members: Some(payload.max_members.unwrap_or(100)),
        created_at: now,
        updated_at: now,
    };
    
    let result = groups.insert_one(group, None).await?;
    
    Ok((StatusCode::CREATED, Json(IdResponse { 
        id: result.inserted_id.as_object_id().unwrap().to_hex(),
        message: Some("Group created successfully".to_string())
    })))
}

pub async fn list_groups_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<GroupFilter>,
) -> AppResult<impl IntoResponse> {
    let groups = state.mongo.collection::<Group>("groups");
    
    let mut query = doc! {};
    
    if let Some(category) = &params.category {
        if category != "all" {
            query.insert("category", category);
        }
    }
    
    if let Some(is_private) = params.is_private {
        query.insert("is_private", is_private);
    }
    
    if let Some(search) = &params.search {
        if !(search as &str).is_empty() {
            query.insert("name", doc! { "$regex": search, "$options": "i" });
        }
    }

    let mut cursor = groups.find(query, None).await?;

    let mut groups_list = Vec::new();
    
    while let Some(group_res) = cursor.next().await {
        if let Ok(g) = group_res {
            let group_info: crate::features::infrastructure::dto::GroupResponse = build_group_response(&g, &state, Some(&user)).await?;
            groups_list.push(group_info);
        }
    }

    Ok((StatusCode::OK, Json(groups_list)))
}

pub async fn get_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&group_id)
        .map_err(|_| AppError::BadRequest("Invalid group ID".to_string()))?;

    let groups = state.mongo.collection::<Group>("groups");
    let group = groups.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Group not found".to_string()))?;

    let group_info: crate::features::infrastructure::dto::GroupResponse = build_group_response(&group, &state, Some(&user)).await?;
    Ok((StatusCode::OK, Json(group_info)))
}

pub async fn update_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
    Json(payload): Json<UpdateGroupRequest>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&group_id)
        .map_err(|_| AppError::BadRequest("Invalid group ID".to_string()))?;

    check_group_admin(user.user_id, oid, &state).await?;

    let groups = state.mongo.collection::<Group>("groups");
    
    let mut update_doc = doc! {};
    
    if let Some(name) = payload.name { update_doc.insert("name", name); }
    if let Some(description) = payload.description { update_doc.insert("description", description); }
    if let Some(category) = payload.category { update_doc.insert("category", category); }
    if let Some(is_private) = payload.is_private { update_doc.insert("is_private", is_private); }
    if let Some(max_members) = payload.max_members { update_doc.insert("max_members", max_members); }
    if let Some(avatar_url) = payload.avatar_url { update_doc.insert("avatar_url", avatar_url); }
    if let Some(cover_url) = payload.cover_url { update_doc.insert("cover_url", cover_url); }

    if update_doc.is_empty() {
        return Ok((StatusCode::OK, Json(MessageResponse { message: "No changes made".to_string() })));
    }

    update_doc.insert("updated_at", mongodb::bson::DateTime::now());

    groups.update_one(doc! { "_id": oid }, doc! { "$set": update_doc }, None).await?;

    Ok((StatusCode::OK, Json(MessageResponse { message: "Group updated successfully".to_string() })))
}

pub async fn delete_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&group_id)
        .map_err(|_| AppError::BadRequest("Invalid group ID".to_string()))?;

    let group = check_group_admin(user.user_id, oid, &state).await?;

    // Only creator can delete group (unless system admin)
    if group.creator_id != user.user_id {
        check_admin(user.user_id, &state).await?;
    }

    let groups = state.mongo.collection::<Group>("groups");
    groups.delete_one(doc! { "_id": oid }, None).await?;

    // Delete associated posts
    let posts = state.mongo.collection::<crate::models::Post>("posts");
    posts.delete_many(doc! { "group_id": oid }, None).await?;

    Ok((StatusCode::OK, Json(MessageResponse { message: "Group deleted successfully".to_string() })))
}

pub async fn add_member_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
    Json(payload): Json<AddMemberRequest>,
) -> AppResult<impl IntoResponse> {
    let group_oid = ObjectId::parse_str(&group_id)
        .map_err(|_| AppError::BadRequest("Invalid group ID".to_string()))?;

    check_group_admin(user.user_id, group_oid, &state).await?;
    
    let user_oid = ObjectId::parse_str(&payload.user_id)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let groups = state.mongo.collection::<Group>("groups");
    
    let users = state.mongo.collection::<User>("users");
    let user_exists = users.find_one(doc! { "_id": user_oid }, None).await?.is_some();

    if !user_exists {
        return Err(AppError::NotFound("User not found".to_string()));
    }

    groups.update_one(
        doc! { "_id": group_oid },
        doc! { "$addToSet": { "members": user_oid } },
        None
    ).await?;

    Ok((StatusCode::OK, Json(MessageResponse { message: "Member added successfully".to_string() })))
}

pub async fn remove_member_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
    Json(payload): Json<RemoveMemberRequest>,
) -> AppResult<impl IntoResponse> {
    let group_oid = ObjectId::parse_str(&group_id)
        .map_err(|_| AppError::BadRequest("Invalid group ID".to_string()))?;

    check_group_admin(user.user_id, group_oid, &state).await?;
    
    let user_oid = ObjectId::parse_str(&payload.user_id)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let groups = state.mongo.collection::<Group>("groups");
    
    groups.update_one(
        doc! { "_id": group_oid },
        doc! { "$pull": { "members": user_oid, "admins": user_oid } },
        None
    ).await?;

    Ok((StatusCode::OK, Json(MessageResponse { message: "Member removed successfully".to_string() })))
}

pub async fn make_admin_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
    Json(payload): Json<MakeAdminRequest>,
) -> AppResult<impl IntoResponse> {
    let group_oid = ObjectId::parse_str(&group_id)
        .map_err(|_| AppError::BadRequest("Invalid group ID".to_string()))?;

    let group = check_group_admin(user.user_id, group_oid, &state).await?;

    if group.creator_id != user.user_id {
        check_admin(user.user_id, &state).await?;
    }
    
    let user_oid = ObjectId::parse_str(&payload.user_id)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let groups = state.mongo.collection::<Group>("groups");
    
    groups.update_one(
        doc! { "_id": group_oid },
        doc! { "$addToSet": { "admins": user_oid } },
        None
    ).await?;

    Ok((StatusCode::OK, Json(MessageResponse { message: "User promoted to admin".to_string() })))
}

pub async fn list_group_posts_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let group_oid = ObjectId::parse_str(&group_id)
        .map_err(|_| AppError::BadRequest("Invalid group ID".to_string()))?;

    let posts = state.mongo.collection::<crate::models::Post>("posts");
    
    let mut cursor = posts.find(doc! { "group_id": group_oid }, None).await?;

    let mut posts_vec = Vec::new();
    while let Some(post_res) = cursor.next().await {
        if let Ok(p) = post_res {
            posts_vec.push(p);
        }
    }

    let responses = crate::features::content::posts_to_responses(&state, Some(&user), posts_vec).await;
    Ok((StatusCode::OK, Json(responses)))
}

pub async fn create_group_post_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
    Json(payload): Json<crate::features::content::CreatePostRequest>,
) -> AppResult<impl IntoResponse> {
    let group_oid = ObjectId::parse_str(&group_id)
        .map_err(|_| AppError::BadRequest("Invalid group ID".to_string()))?;
    
    let posts = state.mongo.collection::<crate::models::Post>("posts");
    
    let profiles_collection = state.mongo.collection::<crate::models::Profile>("profiles");
    let profile = profiles_collection.find_one(doc! { "user_id": user.user_id }, None).await?;
    
    let author_name = profile.map(|p| p.username).unwrap_or_else(|| "Anonymous".to_string());

    let now = mongodb::bson::DateTime::now();
    let new_post = crate::models::Post {
        id: None,
        group_id: Some(group_oid),
        page_id: None,
        author_id: user.user_id,
        author_name,
        title: "".to_string(),
        content: payload.content,
        excerpt: None,
        slug: "".to_string(),
        status: "published".to_string(),
        post_type: payload.post_type,
        category: "general".to_string(),
        tags: None,
        media_urls: if payload.media_urls.is_empty() { None } else { Some(payload.media_urls) },
        location: payload.location.map(|l| crate::models::Location {
            latitude: l.latitude,
            longitude: l.longitude,
            label: l.label,
            is_live: l.is_live,
            expires_at: l.duration_minutes.map(|m| mongodb::bson::DateTime::from_millis(chrono::Utc::now().timestamp_millis() + (m as i64 * 60000))),
        }),
        scheduled_publish_date: None,
        published_at: Some(now),
        approved_at: None,
        approved_by: None,
        rejected_at: None,
        rejected_by: None,
        rejection_reason: None,
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        reading_time: None,
        language: "en".to_string(),
        is_featured: false,
        is_premium: false,
        allow_comments: true,
        allow_sharing: true,
        seo_title: None,
        seo_description: None,
        seo_keywords: None,
        meta_data: None,
        source_url: None,
        source_author: None,
        plagiarism_score: None,
        content_rating: None,
        is_nsfw: payload.is_nsfw,
        poll: payload.poll,
        is_anonymous: payload.is_anonymous,
        created_at: now,
        updated_at: now,
    };
    
    let result = posts.insert_one(new_post, None).await?;
    
    Ok((StatusCode::CREATED, Json(json!({ "id": result.inserted_id.as_object_id().unwrap().to_hex() }))))
}

// --- Helper Functions ---

async fn build_group_response(
    group: &Group,
    state: &Arc<AppState>,
    user: Option<&AuthUser>,
) -> AppResult<GroupResponse> {
    let profiles = state.mongo.collection::<Profile>("profiles");
    
    let mut members_info = Vec::new();
    let is_member = user.map(|u| group.members.contains(&u.user_id)).unwrap_or(false);
    
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
        max_members: group.max_members.unwrap_or(100) as u64,
        member_count: group.members.len() as u64,
        is_member,
        created_at: group.created_at.to_chrono().to_rfc3339(),
    })
}

pub async fn join_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let group_oid = ObjectId::parse_str(&group_id)
        .map_err(|_| AppError::BadRequest("Invalid group ID".to_string()))?;
    
    let groups = state.mongo.collection::<Group>("groups");
    
    groups.update_one(
        doc! { "_id": group_oid },
        doc! { "$addToSet": { "members": user.user_id } },
        None
    ).await?;

    Ok((StatusCode::OK, Json(MessageResponse { message: "Joined group successfully".to_string() })))
}

pub async fn leave_group_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(group_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let group_oid = ObjectId::parse_str(&group_id)
        .map_err(|_| AppError::BadRequest("Invalid group ID".to_string()))?;
    
    let groups = state.mongo.collection::<Group>("groups");
    
    groups.update_one(
        doc! { "_id": group_oid },
        doc! { "$pull": { "members": user.user_id, "admins": user.user_id } },
        None
    ).await?;

    Ok((StatusCode::OK, Json(MessageResponse { message: "Left group successfully".to_string() })))
}

pub fn group_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_groups_handler).post(create_group_handler))
        .route("/:id", get(get_group_handler).put(update_group_handler).delete(delete_group_handler))
        .route("/:id/join", post(join_group_handler))
        .route("/:id/leave", post(leave_group_handler))
        .route("/:id/members/add", post(add_member_handler))
        .route("/:id/members/remove", post(remove_member_handler))
        .route("/:id/admins/add", post(make_admin_handler))
        .route("/:id/posts", get(list_group_posts_handler).post(create_group_post_handler))
}
