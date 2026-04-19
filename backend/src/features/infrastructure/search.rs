use axum::{
    extract::{State, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use mongodb::bson::doc;
use crate::features::infrastructure::db::AppState;
use crate::models::{Profile, Post, Group, Event};
use futures::stream::StreamExt;

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: String,
    pub search_type: Option<String>, // all, users, posts, groups, events
    pub limit: Option<i64>,
    // Advanced filters
    pub category: Option<String>,
    pub school: Option<String>,
    pub year_of_study: Option<i32>,
    pub has_media: Option<bool>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub sort_by: Option<String>, // relevance, recent, popular
}

#[derive(Deserialize)]
pub struct AdvancedSearchFilters {
    pub tags: Option<Vec<String>>,
    pub post_type: Option<String>,
    pub min_likes: Option<i32>,
    pub language: Option<String>,
}

#[derive(Serialize)]
pub struct SearchResults {
    pub users: Option<Vec<serde_json::Value>>,
    pub posts: Option<Vec<serde_json::Value>>,
    pub groups: Option<Vec<serde_json::Value>>,
    pub events: Option<Vec<serde_json::Value>>,
    pub total_results: i64,
}

pub async fn search_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<SearchQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    if params.q.trim().is_empty() {
        return Ok(Json(json!({ "users": [], "posts": [], "groups": [], "events": [], "total_results": 0 })));
    }

    let q = params.q;
    let limit = params.limit.unwrap_or(10);
    let search_type = params.search_type.unwrap_or_else(|| "all".to_string());

    let mut results = SearchResults {
        users: None,
        posts: None,
        groups: None,
        events: None,
        total_results: 0,
    };

    // --- Search Users ---
    if search_type == "all" || search_type == "users" {
        let profiles = state.mongo.collection::<Profile>("profiles");
        
        let mut query = doc! {
            "$or": [
                { "username": { "$regex": &q, "$options": "i" } },
                { "full_name": { "$regex": &q, "$options": "i" } }
            ]
        };
        
        // Add advanced filters
        if let Some(ref school) = params.school {
            query.insert("school", doc! { "$regex": school, "$options": "i" });
        }
        if let Some(year) = params.year_of_study {
            query.insert("year_of_study", year);
        }
        
        let mut cursor = profiles.find(
            query,
            Some(mongodb::options::FindOptions::builder().limit(limit).build())
        ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

        let mut users_list = Vec::new();
        while let Some(profile) = cursor.next().await {
            if let Ok(p) = profile {
                users_list.push(json!({
                    "username": p.username,
                    "full_name": p.full_name,
                    "avatar_url": p.avatar_url,
                    "school": p.school,
                    "year_of_study": p.year_of_study,
                    "user_id": p.user_id.to_hex()
                }));
            }
        }
        results.users = Some(users_list);
    }

    // --- Search Posts ---
    if search_type == "all" || search_type == "posts" {
        let posts = state.mongo.collection::<Post>("posts");
        let mut cursor = posts.find(
            doc! {
                "status": "published",
                "$or": [
                    { "title": { "$regex": &q, "$options": "i" } },
                    { "content": { "$regex": &q, "$options": "i" } }
                ]
            },
            Some(mongodb::options::FindOptions::builder().limit(limit).build())
        ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

        let mut posts_list = Vec::new();
        while let Some(post) = cursor.next().await {
            if let Ok(p) = post {
                posts_list.push(json!({
                    "id": p.id.unwrap().to_hex(),
                    "title": p.title,
                    "author_name": p.author_name,
                    "created_at": p.created_at.to_chrono().to_rfc3339()
                }));
            }
        }
        results.posts = Some(posts_list);
    }

    // --- Search Groups ---
    if search_type == "all" || search_type == "groups" {
        let groups = state.mongo.collection::<Group>("groups");
        let mut cursor = groups.find(
            doc! {
                "is_private": false,
                "name": { "$regex": &q, "$options": "i" }
            },
            Some(mongodb::options::FindOptions::builder().limit(limit).build())
        ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

        let mut groups_list = Vec::new();
        while let Some(group) = cursor.next().await {
            if let Ok(g) = group {
                groups_list.push(json!({
                    "id": g.id.unwrap().to_hex(),
                    "name": g.name,
                    "avatar_url": g.avatar_url,
                    "member_count": g.members.len()
                }));
            }
        }
        results.groups = Some(groups_list);
    }

    // --- Search Events ---
    if search_type == "all" || search_type == "events" {
        let events = state.mongo.collection::<Event>("events");
        let mut cursor = events.find(
            doc! {
                "status": "published",
                "title": { "$regex": &q, "$options": "i" }
            },
            Some(mongodb::options::FindOptions::builder().limit(limit).build())
        ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

        let mut events_list = Vec::new();
        while let Some(event) = cursor.next().await {
            if let Ok(e) = event {
                events_list.push(json!({
                    "id": e.id.unwrap().to_hex(),
                    "title": e.title,
                    "location": e.location,
                    "start_datetime": e.start_datetime.to_chrono().to_rfc3339()
                }));
            }
        }
        results.events = Some(events_list);
    }

    Ok(Json(json!(results)))
}

pub fn search_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(search_handler))
}
