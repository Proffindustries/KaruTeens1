#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]

use axum::{
    routing::get,
    Router,
};
use std::net::SocketAddr;
use dotenvy::dotenv;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod db;
mod models;
mod error;
mod auth;
mod content;
mod marketplace;
mod user;
mod rate_limit;
mod cache;
mod cache_utils;
mod cdn;
mod push;
mod search;
mod media;
mod messages;
mod notifications;
mod ws;
mod payments;
mod ai;
mod ably;
mod hookup;
mod study_rooms;
mod events;
mod groups;
mod pages;
mod posts;
mod comments;
mod stories;
mod reels;
mod ads;
mod admin;
mod revision_materials;
mod playlist;
mod stats;
mod follows;
mod timetable;
mod confessions;

use auth::auth_routes;
use content::content_routes;
use user::user_routes;
use media::media_routes;
use marketplace::marketplace_routes;
use messages::message_routes;
use notifications::notification_routes;
use payments::payment_routes;
use ws::ws_handler;
use revision_materials::revision_material_routes;
use playlist::playlist_routes;
use stories::story_routes;
use reels::reel_routes;
use groups::group_routes;
use events::event_routes;
use pages::page_routes;
use ads::ad_routes;
use cache::CacheService;

#[tokio::main]
async fn main() {
    // Initialize Environment
    dotenv().ok();

    // Initialize Logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "karuteens_backend=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Initializing Database Connection...");
    // Initialize DBs
    let mongo_db = db::init_mongo().await;
    let redis_client = db::init_redis().await;
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let brevo_api_key = std::env::var("BREVO_API_KEY").unwrap_or_default();
    
    let state = std::sync::Arc::new(db::AppState { 
        mongo: mongo_db, 
        redis: redis_client.clone(),
        cache: CacheService::new(redis_client),
        jwt_secret,
        ws_connections: std::sync::Arc::new(dashmap::DashMap::new()),
        mpesa_token: std::sync::Arc::new(dashmap::DashMap::new()),
        ai_models: std::sync::Arc::new(dashmap::DashMap::new()),
        model_health: std::sync::Arc::new(dashmap::DashMap::new()),
        http_client: reqwest::Client::new(),
        brevo_api_key,
        redis_presence_ttl: std::env::var("REDIS_PRESENCE_TTL")
            .unwrap_or_else(|_| "300".to_string())
            .parse()
            .unwrap_or(300),
        redis_mongo_update_ttl: std::env::var("REDIS_MONGO_UPDATE_TTL")
            .unwrap_or_else(|_| "60".to_string())
            .parse()
            .unwrap_or(60),
    });

    // Start AI Model Updater
    ai::spawn_model_updater(state.clone());

    // Port and Address Setup
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse::<u16>()
        .expect("PORT must be a number");
    
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    
    // CORS Configuration
    let frontend_url = std::env::var("FRONTEND_URL").unwrap_or_else(|_| "*".into());
    let origins: tower_http::cors::AllowOrigin = if frontend_url == "*" {
        tower_http::cors::Any.into()
    } else {
        let urls: Vec<axum::http::HeaderValue> = frontend_url
            .split(',')
            .map(|s| s.trim().parse::<axum::http::HeaderValue>().expect("Invalid FRONTEND_URL"))
            .collect();
        tower_http::cors::AllowOrigin::list(urls)
    };

    let app = Router::new()
         .route("/", get(health_check))
         .route("/api/config", get(admin::get_public_settings_handler))
         .route("/ws", get(ws_handler))
         .nest("/api/auth", auth_routes())
         .nest("/api/posts", content_routes())
         .nest("/api/users", user_routes())
         .nest("/api/media", media_routes())
         .nest("/api/ably", ably::ably_routes())
         .nest("/api/marketplace", marketplace_routes())
         .nest("/api/messages", message_routes())
         .nest("/api/notifications", notification_routes())
         .nest("/api/payments", payment_routes())
         .nest("/api/ai", ai::ai_routes())
         .nest("/api/hookup", hookup::hookup_routes())
         .nest("/api/study-rooms", study_rooms::study_room_routes())
         .nest("/api/revision-materials", revision_material_routes())
         .nest("/api/playlists", playlist_routes())
         .nest("/api/stories", story_routes())
         .nest("/api/reels", reel_routes())
         .nest("/api/groups", group_routes())
         .nest("/api/events", event_routes())
         .nest("/api/pages", page_routes())
         .nest("/api/ads", ad_routes())
        .nest("/api/stats", stats::stats_routes())
        .nest("/api/follows", follows::follows_routes())
        .nest("/api/timetable", timetable::timetable_routes())
        .nest("/api/confessions", confessions::confessions_routes())
        // Management/Admin routes
        .nest("/api/admin", admin::admin_routes())
         .layer(
             tower_http::cors::CorsLayer::new()
                 .allow_origin(origins)
                 .allow_methods(tower_http::cors::Any)
                 .allow_headers([
                     axum::http::header::AUTHORIZATION,
                     axum::http::header::CONTENT_TYPE,
                     axum::http::header::ACCEPT,
                     axum::http::header::ORIGIN,
                 ])
                 .expose_headers([
                     axum::http::header::AUTHORIZATION,
                 ])
         )
         .layer(tower_http::trace::TraceLayer::new_for_http())
         .with_state(state);

    tracing::info!("listening on {}", addr);

    // Start Server
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "KaruTeens Backend is Running!"
}
