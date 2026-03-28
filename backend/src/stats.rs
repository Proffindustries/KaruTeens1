use axum::{
    extract::{State, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use serde_json::json;
use crate::db::AppState;
use crate::auth::AuthUser;
use crate::models::Profile;
use mongodb::bson::doc;
use chrono::{Utc, Duration};
use mongodb::options::FindOptions;
use futures::stream::StreamExt;

#[derive(Deserialize)]
pub struct StatsQuery {
    // Optional query parameters for filtering
    pub timeframe: Option<String>, // e.g., "24h", "7d", "30d"
}

// Response structure for campus pulse data
#[derive(Serialize)]
pub struct CampusPulseResponse {
    pub active_users: u64,
    pub active_rooms: u64,
    pub posts_today: u64,
    pub top_streak: u64,
    pub trending_topics: Vec<String>,
    pub recent_activity: Vec<ActivityItem>,
}

#[derive(Serialize)]
pub struct ActivityItem {
    pub r#type: String,
    pub count: u64,
}

// Handler for campus pulse endpoint
pub async fn get_campus_pulse_handler(
    State(state): State<Arc<AppState>>,
    _user: AuthUser, // Require authentication
    Query(params): Query<StatsQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let timeframe = params.timeframe.as_deref().unwrap_or("24h");
    
    // Calculate start time based on timeframe
    let now = Utc::now();
    let start_time = match timeframe {
        "1h" => now - Duration::hours(1),
        "24h" => now - Duration::days(1),
        "7d" => now - Duration::days(7),
        "30d" => now - Duration::days(30),
        _ => now - Duration::days(1), // default to 24h
    };
    
    // Query active users (users who have posted, messaged, or used study rooms in timeframe)
    let active_users = state.mongo.collection::<Profile>("profiles")
        .count_documents(
            doc! {
                "$or": vec![
                    doc! { "last_seen_at": doc! { "$gte": start_time } },
                    doc! { "posts": doc! { "$elemMatch": doc! { "created_at": doc! { "$gte": start_time } } } },
                    doc! { "messages_sent": doc! { "$elemMatch": doc! { "created_at": doc! { "$gte": start_time } } } },
                    doc! { "study_room_visits": doc! { "$elemMatch": doc! { "visited_at": doc! { "$gte": start_time } } } }
                ]
            },
            None,
        )
        .await
        .unwrap_or(0) as u64;
    
    // Query active study rooms (rooms with activity in timeframe)
    let active_rooms = state.mongo.collection::<mongodb::bson::Document>("study_rooms")
        .count_documents(
            doc! { "last_activity_at": doc! { "$gte": start_time } },
            None,
        )
        .await
        .unwrap_or(0) as u64;
    
    // Query posts today (or in timeframe)
    let posts_today = state.mongo.collection::<mongodb::bson::Document>("posts")
        .count_documents(
            doc! { "created_at": doc! { "$gte": start_time } },
            None,
        )
        .await
        .unwrap_or(0) as u64;
    
    let mut top_streak_cursor = state.mongo.collection::<Profile>("profiles")
        .find(
            doc! {},
            Some(FindOptions::builder()
                .sort(doc! { "streak": -1 })
                .limit(1)
                .build()),
        )
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let top_streak_res = top_streak_cursor.next().await;
    let top_streak_profile: Option<Profile> = match top_streak_res {
        Some(Ok(p)) => Some(p),
        _ => None,
    };
    
    let top_streak = top_streak_profile
        .as_ref()
        .map(|p| p.streak)
        .unwrap_or(0);
    
    // Get trending topics (hashtags from recent posts)
    let mut hashtag_counts: std::collections::HashMap<String, u64> = std::collections::HashMap::new();
    let cursor_res = state.mongo.collection::<mongodb::bson::Document>("posts")
        .find(
            doc! { "created_at": doc! { "$gte": start_time }, "hashtags": doc! { "$exists": true } },
            Some(FindOptions::builder()
                .limit(50)
                .build()),
        )
        .await;

    if let Ok(mut cursor) = cursor_res {
        while let Some(Ok(post)) = cursor.next().await {
            if let Ok(hashtags) = post.get_array("hashtags") {
                for tag in hashtags {
                    if let Some(tag_str) = tag.as_str() {
                        *hashtag_counts.entry(tag_str.to_string()).or_insert(0) += 1;
                    }
                }
            }
        }
    }
    
    // Get top 5 trending topics
    let mut trending_topics: Vec<(String, u64)> = hashtag_counts.into_iter().collect();
    trending_topics.sort_by(|a, b| b.1.cmp(&a.1));
    let trending_topics: Vec<String> = trending_topics
        .into_iter()
        .take(5)
        .map(|(tag, _)| tag)
        .collect();
    
    // Get recent activity counts
    let recent_posts = state.mongo.collection::<mongodb::bson::Document>("posts")
        .count_documents(
            doc! { "created_at": doc! { "$gte": start_time } },
            None,
        )
        .await
        .unwrap_or(0);
    
    let recent_messages = state.mongo.collection::<mongodb::bson::Document>("messages")
        .count_documents(
            doc! { "created_at": doc! { "$gte": start_time } },
            None,
        )
        .await
        .unwrap_or(0);
    
    let recent_study_room_visits = state.mongo.collection::<mongodb::bson::Document>("study_room_visits")
        .count_documents(
            doc! { "visited_at": doc! { "$gte": start_time } },
            None,
        )
        .await
        .unwrap_or(0);
    
    let recent_activity = vec![
        ActivityItem { r#type: "post".to_string(), count: recent_posts as u64 },
        ActivityItem { r#type: "message".to_string(), count: recent_messages as u64 },
        ActivityItem { r#type: "study_room".to_string(), count: recent_study_room_visits as u64 },
    ];
    
    let response = CampusPulseResponse {
        active_users,
        active_rooms,
        posts_today,
        top_streak,
        trending_topics,
        recent_activity,
    };
    
    Ok((StatusCode::OK, Json(response)))
}

// Routes for stats
pub fn stats_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/stats/campus-pulse", get(get_campus_pulse_handler))
}