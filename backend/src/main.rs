use std::net::SocketAddr;
use std::sync::Arc;
use dotenvy::dotenv;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod models;
mod features;
mod utils;
mod routes;

use crate::features::infrastructure::{db, cache::CacheService, rate_limit};
use crate::features::ai;

#[tokio::main]
async fn main() {
    // Initialize Environment
    dotenv().ok();

    // Initialize Logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "karuteens_backend=info,tower_http=info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Verifying environment variables...");
    let required_vars = ["MONGO_URI", "REDIS_URL", "JWT_SECRET"];
    let mut missing_vars = Vec::new();

    for var in required_vars {
        if std::env::var(var).is_err() {
            missing_vars.push(var);
        }
    }

    if !missing_vars.is_empty() {
        tracing::error!("FATAL: Missing required environment variables: {:?}", missing_vars);
        tracing::error!("Please set these variables in your deployment dashboard (e.g., Render Dashboard)");
        std::process::exit(1);
    }

    // Validate FRONTEND_URL is set for production safety
    let frontend_url = std::env::var("FRONTEND_URL").unwrap_or_else(|_| {
        tracing::warn!("FRONTEND_URL not set, defaulting to '*' (insecure for production)");
        "*".into()
    });

    tracing::info!("Initializing Database Connection...");
    let mongo_db = db::init_mongo().await;
    let redis_client = db::init_redis().await;
    let jwt_secret = std::env::var("JWT_SECRET").unwrap();
    let brevo_api_key = std::env::var("BREVO_API_KEY").unwrap_or_default();

    let state = Arc::new(db::AppState {
        mongo: mongo_db,
        redis: redis_client.clone(),
        cache: CacheService::new(redis_client),
        redis_url: std::env::var("REDIS_URL").expect("REDIS_URL must be set"),
        jwt_secret,
        ws_connections: Arc::new(dashmap::DashMap::new()),
        mpesa_token: Arc::new(dashmap::DashMap::new()),
        ai_models: Arc::new(dashmap::DashMap::new()),
        model_health: Arc::new(dashmap::DashMap::new()),
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

    // Start Media Processing Worker
    crate::features::infrastructure::media_processor::spawn_media_worker(state.clone());

    // Port and Address Setup
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse::<u16>()
        .expect("PORT must be a number");

    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    // CORS Configuration
    let (origins, allow_credentials) = if frontend_url == "*" {
        (tower_http::cors::Any.into(), false)
    } else {
        let urls: Vec<axum::http::HeaderValue> = frontend_url
            .split(',')
            .map(|s| s.trim().parse::<axum::http::HeaderValue>().expect("Invalid FRONTEND_URL"))
            .collect();
        (tower_http::cors::AllowOrigin::list(urls), true)
    };

    // Create Router with CORS as outermost layer for proper preflight handling
    let cors = tower_http::cors::CorsLayer::new()
        .allow_origin(origins)
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PUT,
            axum::http::Method::DELETE,
            axum::http::Method::OPTIONS,
            axum::http::Method::PATCH,
        ])
        .allow_headers([
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
            axum::http::header::ACCEPT,
            axum::http::header::ORIGIN,
            axum::http::HeaderName::from_static("x-requested-with"),
            axum::http::HeaderName::from_static("x-request-id"),
            axum::http::HeaderName::from_static("cache-control"),
        ])
        .expose_headers([
            axum::http::header::CONTENT_DISPOSITION,
        ]);

    let mut cors = cors;
    if allow_credentials {
        cors = cors.allow_credentials(true);
    }

    let app = routes::create_router(state.clone())
        .layer(cors) // CORS as outermost middleware layer
        .layer(axum::middleware::from_fn_with_state(state.clone(), rate_limit::rate_limit_middleware))
        .layer(tower_http::set_header::SetResponseHeaderLayer::if_not_present(
            axum::http::header::HeaderName::from_static("cross-origin-embedder-policy"),
            axum::http::HeaderValue::from_static("require-corp"),
        ))
        .layer(tower_http::set_header::SetResponseHeaderLayer::if_not_present(
            axum::http::header::HeaderName::from_static("cross-origin-opener-policy"),
            axum::http::HeaderValue::from_static("same-origin"),
        ))
        .layer(tower_http::set_header::SetResponseHeaderLayer::if_not_present(
            axum::http::header::HeaderName::from_static("content-security-policy"),
            axum::http::HeaderValue::from_static("default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.karuteens.site https://*.vercel.app https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.karuteens.site wss://*.karuteens.site https://api.ably.io; frame-src 'self' https://www.youtube.com; media-src 'self' https:;"),
        ))
        .layer(tower_http::trace::TraceLayer::new_for_http());

    tracing::info!("KaruTeens Backend listening on {}", addr);

    // Start Server
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app.with_state(state).into_make_service())
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            tracing::info!("Received Ctrl+C, shutting down gracefully...");
        },
        _ = terminate => {
            tracing::info!("Received SIGTERM, shutting down gracefully...");
        },
    }
}
