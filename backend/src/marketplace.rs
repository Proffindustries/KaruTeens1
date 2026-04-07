use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post, put},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use crate::db::AppState;
use crate::models::{MarketplaceItem, Profile, User};
use crate::dto::{MarketplaceItemResponse, CreateItemRequest, ItemFilter, IdResponse, MessageResponse};
use crate::error::{AppResult, AppError};
use crate::auth::AuthUser;
use mongodb::{bson::{doc, oid::ObjectId}, options::FindOptions};
use futures::stream::StreamExt;
use std::collections::HashMap;

// --- Handlers ---

pub async fn create_item_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateItemRequest>,
) -> AppResult<impl IntoResponse> {
    let collection = state.mongo.collection::<MarketplaceItem>("marketplace_items");

    let new_item = MarketplaceItem {
        id: None,
        seller_id: user.user_id,
        title: payload.title,
        description: payload.description,
        price: (payload.price * 100.0) as i64,
        currency: payload.currency.unwrap_or_else(|| "USD".to_string()),
        condition: payload.condition,
        category: payload.category,
        images: payload.images.unwrap_or_default(),
        status: "available".to_string(),
        created_at: mongodb::bson::DateTime::now(),
    };

    let result = collection.insert_one(new_item, None).await?;

    Ok((StatusCode::CREATED, Json(IdResponse {
        message: Some("Item listed successfully".to_string()), 
        id: result.inserted_id.as_object_id().unwrap().to_hex()
    })))
}

pub async fn get_items_handler(
    State(state): State<Arc<AppState>>,
    Query(filter): Query<ItemFilter>,
) -> AppResult<impl IntoResponse> {
    let items_collection = state.mongo.collection::<MarketplaceItem>("marketplace_items");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    let users_collection = state.mongo.collection::<User>("users");

    let mut query = doc! { "status": "available" };
    
    if let Some(category) = filter.category {
        if category != "all" {
            query.insert("category", category);
        }
    }

    if let Some(search) = &filter.search {
        if !(search as &str).is_empty() {
            let escaped_search = regex::escape(&search);
            query.insert("title", doc! { "$regex": &escaped_search, "$options": "i" });
        }
    }

    let find_options = FindOptions::builder().sort(doc! { "created_at": -1 }).limit(50).build();
    let mut cursor = items_collection.find(query, find_options).await?;

    let mut items = Vec::new();
    while let Some(item_res) = cursor.next().await {
        if let Ok(item) = item_res {
            items.push(item);
        }
    }

    if items.is_empty() {
        return Ok((StatusCode::OK, Json(Vec::<MarketplaceItemResponse>::new())));
    }

    // Batch fetch profiles and users
    let seller_ids: Vec<ObjectId> = items.iter().map(|i| i.seller_id).collect();
    
    let mut profile_map = HashMap::new();
    let mut profile_cursor = profiles_collection.find(doc! { "user_id": { "$in": &seller_ids } }, None).await?;
    while let Some(result) = profile_cursor.next().await {
        if let Ok(p) = result {
            profile_map.insert(p.user_id, p);
        }
    }

    let mut user_map = HashMap::new();
    let mut user_cursor = users_collection.find(doc! { "_id": { "$in": &seller_ids } }, None).await?;
    while let Some(result) = user_cursor.next().await {
        if let Ok(u) = result {
            if let Some(oid) = u.id {
                user_map.insert(oid, u);
            }
        }
    }

    let item_responses: Vec<MarketplaceItemResponse> = items.into_iter().map(|item| {
        let profile = profile_map.get(&item.seller_id);
        let user = user_map.get(&item.seller_id);

        MarketplaceItemResponse {
            id: item.id.unwrap().to_hex(),
            seller_id: item.seller_id.to_hex(),
            seller_name: profile.map(|p| p.username.clone()).unwrap_or_else(|| "Unknown".to_string()),
            seller_avatar: profile.and_then(|p| p.avatar_url.clone()),
            title: item.title,
            description: item.description,
            price: item.price as f64 / 100.0,
            currency: item.currency,
            condition: item.condition,
            category: item.category,
            images: Some(item.images),
            status: item.status,
            created_at: item.created_at.to_chrono().to_rfc3339(),
            seller_is_verified: user.map(|u| u.is_verified).unwrap_or(false),
        }
    }).collect();

    Ok((StatusCode::OK, Json(item_responses)))
}

pub async fn get_item_details_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid ID".to_string()))?;
    
    let items_collection = state.mongo.collection::<MarketplaceItem>("marketplace_items");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    let item = items_collection.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Item not found".to_string()))?;

    let profile = profiles_collection.find_one(doc! { "user_id": item.seller_id }, None).await?;

    let (seller_name, seller_avatar) = match profile {
        Some(p) => (p.username, p.avatar_url),
        None => ("Unknown".to_string(), None),
    };

    let users = state.mongo.collection::<User>("users");
    let user = users.find_one(doc! { "_id": item.seller_id }, None).await?;
    let seller_is_verified = user.map(|u| u.is_verified).unwrap_or(false);

    let response = MarketplaceItemResponse {
        id: item.id.unwrap().to_hex(),
        seller_id: item.seller_id.to_hex(),
        seller_name,
        seller_avatar,
        title: item.title,
        description: item.description,
        price: item.price as f64 / 100.0,
        currency: item.currency,
        condition: item.condition,
        category: item.category,
        images: Some(item.images),
        status: item.status,
        created_at: item.created_at.to_chrono().to_rfc3339(),
        seller_is_verified,
    };

    Ok((StatusCode::OK, Json(response)))
}

pub async fn mark_sold_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid ID".to_string()))?;
    let items_collection = state.mongo.collection::<MarketplaceItem>("marketplace_items");

    // Verify ownership
    let item = items_collection.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Item not found".to_string()))?;

    if item.seller_id != user.user_id {
        return Err(AppError::Forbidden("Not authorized to mark this item as sold".to_string()));
    }

    items_collection.update_one(
        doc! { "_id": oid },
        doc! { "$set": { "status": "sold" } },
        None
    ).await?;

    Ok((StatusCode::OK, Json(MessageResponse { message: "Item marked as sold".to_string() })))
}

pub fn marketplace_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(create_item_handler).get(get_items_handler))
        .route("/:id", get(get_item_details_handler))
        .route("/:id/sold", put(mark_sold_handler))
}
