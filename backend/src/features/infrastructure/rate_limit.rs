use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Json, Response},
};
use redis::AsyncCommands;
use serde_json::json;
use std::sync::Arc;
use crate::features::infrastructure::db::AppState;

pub async fn rate_limit_middleware(
    State(state): State<Arc<AppState>>,
    request: Request,
    next: Next,
) -> Result<Response, impl IntoResponse> {
    let path = request.uri().path();

    // Skip rate limiting for health checks and CORS preflight
    if path == "/" || path == "/api/config" || request.method() == axum::http::Method::OPTIONS {
        return Ok(next.run(request).await);
    }
    
    // Get client identifier (IP or user ID if authenticated)
    let client_id = request
        .headers()
        .get("x-forwarded-for")
        .and_then(|h| h.to_str().ok())
        .or_else(|| request.headers().get("x-real-ip").and_then(|h| h.to_str().ok()))
        .unwrap_or("unknown");

    // Different limits for different endpoints
    let (limit, window) = if path.contains("/auth/login") || path.contains("/auth/register") {
        (5, 300) // 5 requests per 5 minutes for auth
    } else if path.contains("/auth/forgot-password") {
        (3, 600) // 3 requests per 10 minutes for forgot-password (stricter)
    } else if path.contains("/auth/") {
        (10, 300)
    } else if path.contains("/api/posts") && request.method() == "POST" {
        (30, 3600)
    } else if path.contains("/feed") || path.contains("/trending") {
        (60, 60) // Higher limit for read-heavy endpoints
    } else {
        (200, 60) // 200 requests per minute for general API
    };

    let key = format!("rl:{}:{}", client_id, path.split('/').nth(2).unwrap_or("api"));
    
    // Use Redis ConnectionManager with timeout to prevent hanging
    let mut conn = state.redis.clone();
    let count_res = tokio::time::timeout(
        std::time::Duration::from_secs(2),
        conn.get::<_, i64>(&key)
    ).await;

    let count = match count_res {
        Ok(Ok(c)) => c,
        _ => 0, // Fallback to 0 if Redis hangs or errors
    };
    
    if count >= limit {
        tracing::warn!("Rate limit exceeded for {} on {}", client_id, path);
        return Err((
            StatusCode::TOO_MANY_REQUESTS,
            Json(json!({
                "error": "Too many requests. Please slow down.",
                "retry_after": window
            }))
        ));
    }

    // Increment with timeout
    let _ = tokio::time::timeout(
        std::time::Duration::from_secs(2),
        async {
            let _: () = conn.incr(&key, 1).await.unwrap_or(());
            let _: () = conn.expire(&key, window).await.unwrap_or(());
        }
    ).await;
    
    Ok(next.run(request).await)
}
