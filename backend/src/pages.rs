use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post, delete},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use crate::db::AppState;
use crate::models::{Page, PageFollow, Post, Profile, User};
use crate::dto::{PageResponse, CreatePageRequest, PageFilter};
use crate::error::{AppResult, AppError};
use crate::auth::AuthUser;
use futures::stream::StreamExt;

// --- Handlers ---

pub async fn list_pages_handler(
    State(state): State<Arc<AppState>>,
    user: Option<AuthUser>,
    Query(params): Query<PageFilter>,
) -> AppResult<impl IntoResponse> {
    let pages_coll = state.mongo.collection::<Page>("pages");
    let follows_coll = state.mongo.collection::<PageFollow>("page_follows");

    let mut filter = doc! {};
    if let Some(cat) = params.category {
        if cat != "all" {
            filter.insert("category", cat);
        }
    }
    if let Some(search) = &params.search {
        if !(search as &str).is_empty() {
            filter.insert("name", doc! { "$regex": search, "$options": "i" });
        }
    }

    let limit = params.limit.unwrap_or(20);
    let mut cursor = pages_coll.find(filter, mongodb::options::FindOptions::builder().limit(Some(limit as i64)).build()).await?;

    let mut result = Vec::new();
    while let Some(page_res) = cursor.next().await {
        if let Ok(page) = page_res {
            let is_following = if let Some(ref u) = user {
                follows_coll.find_one(doc! { "page_id": page.id.unwrap(), "user_id": u.user_id }, None).await?.is_some()
            } else {
                false
            };

            let is_creator = user.as_ref().map(|u| u.user_id == page.creator_id).unwrap_or(false);

            result.push(PageResponse {
                id: page.id.unwrap().to_hex(),
                name: page.name,
                slug: page.slug,
                description: page.description,
                avatar_url: page.avatar_url,
                cover_url: page.cover_url,
                creator_id: page.creator_id.to_hex(),
                category: page.category,
                is_official: page.is_official,
                follower_count: page.follower_count as u64,
                post_count: page.post_count as u64,
                is_following,
                is_creator,
                created_at: page.created_at.to_chrono().to_rfc3339(),
            });
        }
    }

    Ok((StatusCode::OK, Json(result)))
}

pub async fn create_page_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreatePageRequest>,
) -> AppResult<impl IntoResponse> {
    let pages_coll = state.mongo.collection::<Page>("pages");

    // Generate slug
    let slug = payload.name.to_lowercase()
        .replace(" ", "-")
        .chars()
        .filter(|c: &char| c.is_alphanumeric() || *c == '-')
        .collect::<String>();

    // Check if slug exists
    if pages_coll.find_one(doc! { "slug": &slug }, None).await?.is_some() {
         return Err(AppError::BadRequest("A page with this name already exists".to_string()));
    }

    let new_page = Page {
        id: None,
        name: payload.name,
        slug,
        description: payload.description,
        avatar_url: payload.avatar_url,
        cover_url: payload.cover_url,
        creator_id: user.user_id,
        category: payload.category,
        is_official: false,
        follower_count: 0,
        post_count: 0,
        created_at: DateTime::now(),
        updated_at: DateTime::now(),
    };

    let res = pages_coll.insert_one(new_page, None).await?;

    Ok((StatusCode::CREATED, Json(json!({"id": res.inserted_id.as_object_id().unwrap().to_hex()}))))
}

pub async fn get_page_handler(
    State(state): State<Arc<AppState>>,
    user: Option<AuthUser>,
    Path(slug_or_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let pages_coll = state.mongo.collection::<Page>("pages");
    let follows_coll = state.mongo.collection::<PageFollow>("page_follows");

    let filter = if let Ok(oid) = ObjectId::parse_str(&slug_or_id) {
        doc! { "_id": oid }
    } else {
        doc! { "slug": &slug_or_id }
    };

    let page = pages_coll.find_one(filter, None).await?
        .ok_or(AppError::NotFound("Page not found".to_string()))?;

    let is_following = if let Some(ref u) = user {
        follows_coll.find_one(doc! { "page_id": page.id.unwrap(), "user_id": u.user_id }, None).await?.is_some()
    } else {
        false
    };

    let is_creator = user.as_ref().map(|u| u.user_id == page.creator_id).unwrap_or(false);

    Ok((StatusCode::OK, Json(PageResponse {
        id: page.id.unwrap().to_hex(),
        name: page.name,
        slug: page.slug,
        description: page.description,
        avatar_url: page.avatar_url,
        cover_url: page.cover_url,
        creator_id: page.creator_id.to_hex(),
        category: page.category,
        is_official: page.is_official,
        follower_count: page.follower_count as u64,
        post_count: page.post_count as u64,
        is_following,
        is_creator,
        created_at: page.created_at.to_chrono().to_rfc3339(),
    })))
}

pub async fn follow_page_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(page_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&page_id).map_err(|_| AppError::BadRequest("Invalid ID".to_string()))?;
    let follows_coll = state.mongo.collection::<PageFollow>("page_follows");
    let pages_coll = state.mongo.collection::<Page>("pages");

    if follows_coll.find_one(doc! { "page_id": oid, "user_id": user.user_id }, None).await?.is_some() {
        return Ok((StatusCode::OK, Json(json!({"message": "Already following"}))));
    }

    let follow = PageFollow {
        id: None,
        page_id: oid,
        user_id: user.user_id,
        created_at: DateTime::now(),
    };

    follows_coll.insert_one(follow, None).await?;
    
    pages_coll.update_one(doc! { "_id": oid }, doc! { "$inc": { "follower_count": 1 } }, None).await.ok();

    Ok((StatusCode::OK, Json(json!({"message": "Followed successfully"}))))
}

pub async fn unfollow_page_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(page_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&page_id).map_err(|_| AppError::BadRequest("Invalid ID".to_string()))?;
    let follows_coll = state.mongo.collection::<PageFollow>("page_follows");
    let pages_coll = state.mongo.collection::<Page>("pages");

    let res = follows_coll.delete_one(doc! { "page_id": oid, "user_id": user.user_id }, None).await?;

    if res.deleted_count > 0 {
        pages_coll.update_one(doc! { "_id": oid }, doc! { "$inc": { "follower_count": -1 } }, None).await.ok();
    }

    Ok((StatusCode::OK, Json(json!({"message": "Unfollowed successfully"}))))
}

pub async fn list_page_followers_handler(
    State(state): State<Arc<AppState>>,
    Path(page_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&page_id).map_err(|_| AppError::BadRequest("Invalid ID".to_string()))?;
    let follows_coll = state.mongo.collection::<PageFollow>("page_follows");
    let profiles_coll = state.mongo.collection::<Profile>("profiles");

    let mut cursor = follows_coll.find(doc! { "page_id": oid }, None).await?;

    let mut users = Vec::new();
    while let Some(follow_res) = cursor.next().await {
        if let Ok(follow) = follow_res {
            if let Ok(Some(profile)) = profiles_coll.find_one(doc! { "user_id": follow.user_id }, None).await {
                users.push(json!({
                    "username": profile.username,
                    "avatar_url": profile.avatar_url,
                    "user_id": follow.user_id.to_hex()
                }));
            }
        }
    }

    Ok((StatusCode::OK, Json(users)))
}

pub fn page_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_pages_handler).post(create_page_handler))
        .route("/:id", get(get_page_handler))
        .route("/:id/follow", post(follow_page_handler).delete(unfollow_page_handler))
        .route("/:id/followers", get(list_page_followers_handler))
}
