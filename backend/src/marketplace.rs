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
use crate::auth::AuthUser;
use mongodb::{bson::{doc, oid::ObjectId}, options::FindOptions};
use futures::stream::StreamExt;
use std::collections::HashMap;

// --- DTOs ---

#[derive(Deserialize)]
pub struct CreateItemRequest {
    pub title: String,
    pub description: String,
    pub price: f64,
    pub currency: String,
    pub condition: String,
    pub category: String,
    pub images: Vec<String>,
}

#[derive(Deserialize)]
pub struct ItemFilter {
    pub category: Option<String>,
    pub search: Option<String>,
}

#[derive(Serialize)]
pub struct ItemResponse {
    pub id: String,
    pub seller_id: String,
    pub seller_name: String,
    pub seller_avatar: Option<String>,
    pub title: String,
    pub description: String,
    pub price: f64,
    pub currency: String,
    pub condition: String,
    pub category: String,
    pub images: Vec<String>,
    pub status: String,
    pub created_at: String,
    pub seller_is_verified: bool,
}

// --- Handlers ---

pub async fn create_item_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateItemRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<MarketplaceItem>("marketplace_items");

    let new_item = MarketplaceItem {
        id: None,
        seller_id: user.user_id,
        title: payload.title,
        description: payload.description,
        price: (payload.price * 100.0) as i64,
        currency: payload.currency,
        condition: payload.condition,
        category: payload.category,
        images: payload.images,
        status: "available".to_string(),
        created_at: mongodb::bson::DateTime::now(),
    };

    let result = collection.insert_one(new_item, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({
        "message": "Item listed successfully", 
        "id": result.inserted_id.as_object_id().unwrap().to_hex()
    }))))
}

pub async fn get_items_handler(
    State(state): State<Arc<AppState>>,
    Query(filter): Query<ItemFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let items_collection = state.mongo.collection::<MarketplaceItem>("marketplace_items");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");
    let users_collection = state.mongo.collection::<User>("users");

    let mut query = doc! { "status": "available" };
    
    if let Some(category) = filter.category {
        if category != "all" {
            query.insert("category", category);
        }
    }

    if let Some(search) = filter.search {
        if !search.is_empty() {
            let escaped_search = regex::escape(&search);
            query.insert("title", doc! { "$regex": &escaped_search, "$options": "i" });
        }
    }

    let find_options = FindOptions::builder().sort(doc! { "created_at": -1 }).limit(50).build();
    let mut cursor = items_collection.find(query, find_options).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut items = Vec::new();
    while let Some(Ok(item)) = cursor.next().await {
        items.push(item);
    }

    if items.is_empty() {
        return Ok((StatusCode::OK, Json(json!([]))));
    }

    // Batch fetch profiles and users
    let seller_ids: Vec<ObjectId> = items.iter().map(|i| i.seller_id).collect();
    
    let mut profile_map = HashMap::new();
    let profile_cursor_res = profiles_collection.find(doc! { "user_id": { "$in": &seller_ids } }, None).await;
    if let Ok(mut profile_cursor) = profile_cursor_res {
        while let Some(Ok(p)) = profile_cursor.next().await {
            profile_map.insert(p.user_id, p);
        }
    }

    let mut user_map = HashMap::new();
    let user_cursor_res = users_collection.find(doc! { "_id": { "$in": &seller_ids } }, None).await;
    if let Ok(mut user_cursor) = user_cursor_res {
        while let Some(Ok(u)) = user_cursor.next().await {
            user_map.insert(u.id.unwrap(), u);
        }
    }

    let item_responses: Vec<ItemResponse> = items.into_iter().map(|item| {
        let profile = profile_map.get(&item.seller_id);
        let user = user_map.get(&item.seller_id);

        ItemResponse {
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
            images: item.images,
            status: item.status,
            created_at: item.created_at.to_chrono().to_rfc3339(),
            seller_is_verified: user.map(|u| u.is_verified).unwrap_or(false),
        }
    }).collect();

    Ok((StatusCode::OK, Json(json!(item_responses))))
}

pub async fn get_item_details_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    
    let items_collection = state.mongo.collection::<MarketplaceItem>("marketplace_items");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    let item = items_collection.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Item not found"}))))?;

    let profile = profiles_collection.find_one(doc! { "user_id": item.seller_id }, None).await
        .unwrap_or(None);

    let (seller_name, seller_avatar) = match profile {
        Some(p) => (p.username, p.avatar_url),
        None => ("Unknown".to_string(), None),
    };

    let users = state.mongo.collection::<User>("users");
    let user = users.find_one(doc! { "_id": item.seller_id }, None).await.unwrap_or(None);
    let seller_is_verified = user.map(|u| u.is_verified).unwrap_or(false);

    let response = ItemResponse {
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
        images: item.images,
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
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;
    let items_collection = state.mongo.collection::<MarketplaceItem>("marketplace_items");

    // Verify ownership
    let item = items_collection.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Item not found"}))))?;

    if item.seller_id != user.user_id {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Not authorized"}))));
    }

    items_collection.update_one(
        doc! { "_id": oid },
        doc! { "$set": { "status": "sold" } },
        None
    ).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Item marked as sold"}))))
}

pub fn marketplace_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(create_item_handler).get(get_items_handler))
        .route("/:id", get(get_item_details_handler))
        .route("/:id/sold", put(mark_sold_handler))
}
