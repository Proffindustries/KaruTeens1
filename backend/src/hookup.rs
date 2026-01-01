use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use crate::db::AppState;
use crate::models::{HookupAlias, HookupMatch};
use crate::auth::AuthUser;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use futures::stream::StreamExt;

// --- DTOs ---

#[derive(Deserialize)]
pub struct CreateAliasRequest {
    pub alias_username: String,
    pub gender: String,
    pub age: i32,
    pub bio: String,
}

#[derive(Serialize)]
pub struct AliasDiscovery {
    pub id: String,
    pub alias_username: String,
    pub gender: String,
    pub age: i32,
    pub bio: String,
}

// --- Handlers ---

pub async fn get_my_alias_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<HookupAlias>("hookup_aliases");
    let alias = collection.find_one(doc! { "user_id": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    match alias {
        Some(a) => Ok((StatusCode::OK, Json(a))),
        None => Err((StatusCode::NOT_FOUND, Json(json!({"error": "No alias found"})))),
    }
}

pub async fn create_or_update_alias_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateAliasRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<HookupAlias>("hookup_aliases");

    let existing = collection.find_one(doc! { "user_id": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    if let Some(mut alias) = existing {
        alias.alias_username = payload.alias_username;
        alias.gender = payload.gender;
        alias.age = payload.age;
        alias.bio = payload.bio;
        // is_verified remains whatever it was

        collection.replace_one(doc! { "_id": alias.id.unwrap() }, alias, None).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

        Ok((StatusCode::OK, Json(json!({"message": "Alias updated"}))))
    } else {
        let new_alias = HookupAlias {
            id: None,
            user_id: user.user_id,
            alias_username: payload.alias_username,
            gender: payload.gender,
            age: payload.age,
            bio: payload.bio,
            is_verified: false, // Must pay Ksh 20 to activate
            created_at: DateTime::now(),
        };

        collection.insert_one(new_alias, None).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

        Ok((StatusCode::CREATED, Json(json!({"message": "Alias created. Pay to activate."}))))
    }
}

pub async fn discover_aliases_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let alias_collection = state.mongo.collection::<HookupAlias>("hookup_aliases");
    let match_collection = state.mongo.collection::<HookupMatch>("hookup_matches");

    // Get user's alias
    let my_alias = alias_collection.find_one(doc! { "user_id": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::FORBIDDEN, Json(json!({"error": "Create an alias first"}))))?;

    if !my_alias.is_verified {
        return Err((StatusCode::PAYMENT_REQUIRED, Json(json!({"error": "Payment required to discover"}))));
    }

    // Get aliases I've already interacted with
    let mut cursor = match_collection.find(doc! { "from_alias_id": my_alias.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut interacted_ids = vec![my_alias.id.unwrap()];
    while let Some(m) = cursor.next().await {
        if let Ok(match_obj) = m {
            interacted_ids.push(match_obj.to_alias_id);
        }
    }

    // Find new aliases to discover
    let mut discover_cursor = alias_collection.find(
        doc! { 
            "_id": { "$nin": interacted_ids },
            "is_verified": true,
            "gender": { "$ne": my_alias.gender } // Simple straight matching for now
        }, 
        mongodb::options::FindOptions::builder().limit(20).build()
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut discovery = Vec::new();
    while let Some(a) = discover_cursor.next().await {
        if let Ok(alias) = a {
            discovery.push(AliasDiscovery {
                id: alias.id.unwrap().to_hex(),
                alias_username: alias.alias_username,
                gender: alias.gender,
                age: alias.age,
                bio: alias.bio,
            });
        }
    }

    Ok((StatusCode::OK, Json(discovery)))
}

pub async fn interact_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path((target_id, interaction)): Path<(String, String)>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let alias_collection = state.mongo.collection::<HookupAlias>("hookup_aliases");
    let match_collection = state.mongo.collection::<HookupMatch>("hookup_matches");

    let my_alias = alias_collection.find_one(doc! { "user_id": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::FORBIDDEN, Json(json!({"error": "Create an alias first"}))))?;

    let target_oid = ObjectId::parse_str(&target_id).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;

    let new_interaction = HookupMatch {
        id: None,
        from_alias_id: my_alias.id.unwrap(),
        to_alias_id: target_oid,
        interaction: interaction.clone(),
        created_at: DateTime::now(),
    };

    match_collection.insert_one(new_interaction, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Check if it's a mutual match
    if interaction == "like" {
        let mutual = match_collection.find_one(doc! {
            "from_alias_id": target_oid,
            "to_alias_id": my_alias.id.unwrap(),
            "interaction": "like"
        }, None).await.unwrap_or(None);

        if mutual.is_some() {
            return Ok((StatusCode::OK, Json(json!({"match": true, "message": "It's a mutual match!"}))));
        }
    }

    Ok((StatusCode::OK, Json(json!({"match": false, "message": "Interaction saved"}))))
}

pub fn hookup_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/alias", get(get_my_alias_handler).post(create_or_update_alias_handler))
        .route("/discover", get(discover_aliases_handler))
        .route("/interact/:id/:type", post(interact_handler))
}
