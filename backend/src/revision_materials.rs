use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use crate::db::AppState;
use crate::models::{RevisionMaterial, RevisionMaterialPurchase};
use crate::auth::AuthUser;
use futures::stream::StreamExt;

#[derive(Deserialize)]
pub struct MaterialFilter {
    pub category: Option<String>,
    pub course_code: Option<String>,
    pub search: Option<String>,
}

#[derive(Serialize)]
pub struct MaterialResponse {
    pub id: String,
    pub title: String,
    pub course_code: String,
    pub category: String,
    pub price: f64,
    pub is_locked: bool,
    pub thumbnail_url: Option<String>,
    pub has_purchased: bool,
    pub created_at: String,
}

pub async fn list_materials_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<MaterialFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let user: Option<AuthUser> = None; // For now, don't require auth for listing
    let collection = state.mongo.collection::<RevisionMaterial>("revision_materials");
    let purchases = state.mongo.collection::<RevisionMaterialPurchase>("material_purchases");

    let mut query = doc! {};
    
    if let Some(cat) = params.category {
        query.insert("category", cat);
    }
    if let Some(course) = params.course_code {
        query.insert("course_code", course);
    }
    if let Some(search) = params.search {
        let escaped_search = regex::escape(&search);
        query.insert("title", doc! { "$regex": &escaped_search, "$options": "i" });
    }

    let mut cursor = collection.find(query, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut materials = Vec::new();
    while let Some(m_res) = cursor.next().await {
        if let Ok(m) = m_res {
            let m_id = m.id.unwrap();
            
            let has_purchased = if let Some(ref u) = user {
                purchases.count_documents(doc! { "material_id": m_id, "user_id": u.user_id }, None).await.unwrap_or(0) > 0
            } else {
                false
            };

            materials.push(MaterialResponse {
                id: m_id.to_hex(),
                title: m.title,
                course_code: m.course_code,
                category: m.category,
                price: m.price as f64 / 100.0,
                is_locked: m.is_locked && !has_purchased,
                thumbnail_url: m.thumbnail_url,
                has_purchased,
                created_at: m.created_at.to_chrono().to_rfc3339(),
            });
        }
    }

    Ok((StatusCode::OK, Json(json!(materials))))
}

pub async fn get_material_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid material ID"}))))?;

    let collection = state.mongo.collection::<RevisionMaterial>("revision_materials");
    let purchases = state.mongo.collection::<RevisionMaterialPurchase>("material_purchases");

    let material = collection.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Material not found"}))))?;

    let has_purchased = purchases.count_documents(doc! { "material_id": oid, "user_id": user.user_id }, None).await.unwrap_or(0) > 0;

    if material.is_locked && !has_purchased {
        return Ok((StatusCode::OK, Json(json!({
            "id": material.id.unwrap().to_hex(),
            "title": material.title,
            "course_code": material.course_code,
            "category": material.category,
            "price": material.price as f64 / 100.0,
            "is_locked": true,
            "thumbnail_url": material.thumbnail_url,
            "has_purchased": false,
            "created_at": material.created_at.to_chrono().to_rfc3339(),
            "error": "Purchase required to view full content"
        }))));
    }

    Ok((StatusCode::OK, Json(json!({
        "id": material.id.unwrap().to_hex(),
        "title": material.title,
        "course_code": material.course_code,
        "category": material.category,
        "price": material.price as f64 / 100.0,
        "is_locked": false,
        "thumbnail_url": material.thumbnail_url,
        "file_url": material.file_url,
        "has_purchased": has_purchased,
        "created_at": material.created_at.to_chrono().to_rfc3339(),
    }))))
}

#[derive(Deserialize)]
pub struct CreateMaterialRequest {
    pub title: String,
    pub course_code: String,
    pub category: String,
    pub file_url: String,
    pub price: f64,
    pub is_locked: bool,
}

pub async fn create_material_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateMaterialRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // Only admin can upload materials for now? Or anyone but subject to moderation.
    // The requirements say users can also upload but maybe they earn from it.
    
    let collection = state.mongo.collection::<RevisionMaterial>("revision_materials");
    
    let new_material = RevisionMaterial {
        id: None,
        title: payload.title,
        course_code: payload.course_code,
        category: payload.category,
        file_url: payload.file_url,
        thumbnail_url: None,
        price: (payload.price * 100.0) as i64,
        is_locked: payload.is_locked,
        uploader_id: user.user_id,
        created_at: DateTime::now(),
    };

    let result = collection.insert_one(new_material, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({
        "message": "Material uploaded",
        "id": result.inserted_id.as_object_id().unwrap().to_hex()
    }))))
}

pub fn revision_material_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_materials_handler).post(create_material_handler))
        .route("/:id", get(get_material_handler))
}
