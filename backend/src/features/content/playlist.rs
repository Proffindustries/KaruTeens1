use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use crate::features::infrastructure::db::AppState;
use crate::models::{StudyPlaylist, PlaylistItem};
use crate::features::auth::auth_service::AuthUser;
use futures::StreamExt;

#[derive(Deserialize)]
pub struct CreatePlaylistRequest {
    pub name: String,
    pub description: Option<String>,
    pub is_public: bool,
    pub subject: String,
}

#[derive(Deserialize)]
pub struct AddPlaylistItemRequest {
    pub item_type: String, // video, document, link, note
    pub title: String,
    pub url: String,
    pub duration_minutes: Option<i32>,
}

async fn create_playlist_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreatePlaylistRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let playlists = state.mongo.collection::<StudyPlaylist>("study_playlists");

    let playlist = StudyPlaylist {
        id: None,
        name: payload.name,
        description: payload.description,
        creator_id: user.user_id,
        collaborators: vec![user.user_id],
        items: vec![],
        is_public: payload.is_public,
        subject: payload.subject,
        created_at: DateTime::now(),
        updated_at: DateTime::now(),
    };

    let result = playlists.insert_one(playlist, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({
        "message": "Playlist created",
        "id": result.inserted_id.as_object_id().unwrap().to_hex()
    }))))
}

async fn list_playlists_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let playlists = state.mongo.collection::<StudyPlaylist>("study_playlists");

    let subject = params.get("subject").cloned();
    let query = if let Some(ref s) = subject {
        doc! { "subject": s, "$or": [ { "is_public": true }, { "collaborators": user.user_id } ] }
    } else {
        doc! { "$or": [ { "is_public": true }, { "collaborators": user.user_id } ] }
    };

    let cursor = playlists.find(query, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut playlist_list = Vec::new();
    let mut stream = cursor;
    while let Some(playlist) = stream.next().await {
        if let Ok(p) = playlist {
            playlist_list.push(json!({
                "id": p.id.unwrap().to_hex(),
                "name": p.name,
                "description": p.description,
                "creator_id": p.creator_id.to_hex(),
                "items_count": p.items.len(),
                "is_public": p.is_public,
                "subject": p.subject,
                "collaborators_count": p.collaborators.len(),
                "created_at": p.created_at.to_chrono().to_rfc3339(),
            }));
        }
    }

    Ok((StatusCode::OK, Json(playlist_list)))
}

async fn get_playlist_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(playlist_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&playlist_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;

    let playlists = state.mongo.collection::<StudyPlaylist>("study_playlists");

    let playlist = playlists.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Playlist not found"}))))?;

    if !playlist.is_public && !playlist.collaborators.contains(&user.user_id) {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Access denied"}))));
    }

    Ok((StatusCode::OK, Json(json!({
        "id": playlist.id.unwrap().to_hex(),
        "name": playlist.name,
        "description": playlist.description,
        "creator_id": playlist.creator_id.to_hex(),
        "items": playlist.items,
        "is_public": playlist.is_public,
        "subject": playlist.subject,
        "collaborators": playlist.collaborators.iter().map(|c| c.to_hex()).collect::<Vec<_>>(),
        "created_at": playlist.created_at.to_chrono().to_rfc3339(),
        "updated_at": playlist.updated_at.to_chrono().to_rfc3339(),
    }))))
}

async fn add_item_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(playlist_id): Path<String>,
    Json(payload): Json<AddPlaylistItemRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&playlist_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;

    let playlists = state.mongo.collection::<StudyPlaylist>("study_playlists");

    let playlist = playlists.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Playlist not found"}))))?;

    if !playlist.collaborators.contains(&user.user_id) {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Only collaborators can add items"}))));
    }

    let new_item_id = playlist.items.len() as i32;
    let new_item = PlaylistItem {
        id: new_item_id,
        item_type: payload.item_type,
        title: payload.title,
        url: payload.url,
        duration_minutes: payload.duration_minutes,
        added_by: user.user_id,
        added_at: DateTime::now(),
    };

    playlists.update_one(
        doc! { "_id": oid },
        doc! { "$push": { "items": mongodb::bson::to_bson(&new_item).unwrap() }, "$set": { "updated_at": DateTime::now() } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Item added", "item_id": new_item_id}))))
}

async fn add_collaborator_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path((playlist_id, username)): Path<(String, String)>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let oid = ObjectId::parse_str(&playlist_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ID"}))))?;

    let playlists = state.mongo.collection::<StudyPlaylist>("study_playlists");
    let profiles = state.mongo.collection::<crate::models::Profile>("profiles");

    let playlist = playlists.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Playlist not found"}))))?;

    if playlist.creator_id != user.user_id {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Only creator can add collaborators"}))));
    }

    let profile = profiles.find_one(doc! { "username": &username }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))))?;

    if playlist.collaborators.contains(&profile.user_id) {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "User is already a collaborator"}))));
    }

    playlists.update_one(
        doc! { "_id": oid },
        doc! { "$push": { "collaborators": profile.user_id } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Collaborator added"}))))
}

pub fn playlist_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_playlists_handler).post(create_playlist_handler))
        .route("/:id", get(get_playlist_handler))
        .route("/:id/items", post(add_item_handler))
        .route("/:id/collaborators/:username", post(add_collaborator_handler))
}
