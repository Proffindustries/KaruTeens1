use axum::{
    http::StatusCode,
    response::{IntoResponse, Json},
};

/// Standardized application error types
#[derive(Debug)]
pub enum AppError {
    // Client errors (4xx)
    BadRequest(String),
    Unauthorized(String),
    Forbidden(String),
    NotFound(String),
    Conflict(String),
    
    // Server errors (5xx)
    InternalServerError(String),
    DatabaseError(String),
    CacheError(String),
}

/// Enhanced error response structure
#[derive(serde::Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: Option<String>,
    pub details: Option<serde_json::Value>,
    pub code: Option<String>,
    pub timestamp: String,
    pub request_id: Option<String>,
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, error_type, message, code) = match self {
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, "bad_request", msg, Some("BAD_REQUEST")),
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, "unauthorized", msg, Some("UNAUTHORIZED")),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, "forbidden", msg, Some("FORBIDDEN")),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, "not_found", msg, Some("NOT_FOUND")),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, "conflict", msg, Some("CONFLICT")),
            AppError::InternalServerError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, "internal_server_error", msg, Some("INTERNAL_ERROR")),
            AppError::DatabaseError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, "database_error", msg, Some("DATABASE_ERROR")),
            AppError::CacheError(msg) => (StatusCode::SERVICE_UNAVAILABLE, "cache_error", msg, Some("CACHE_ERROR")),
        };

        let body = Json(ErrorResponse {
            error: error_type.to_string(),
            message: Some(message),
            details: None,
            code: code.map(|c| c.to_string()),
            timestamp: chrono::Utc::now().to_rfc3339(),
            request_id: get_request_id(),
        });

        (status, body).into_response()
    }
}

// Helper function to extract request ID (simplified)
fn get_request_id() -> Option<String> {
    // In a real implementation, this would extract from headers
    None
}

// Conversions from external error types
impl From<mongodb::error::Error> for AppError {
    fn from(err: mongodb::error::Error) -> Self {
        tracing::error!("Database error: {}", err);
        AppError::DatabaseError("A database error occurred.".to_string())
    }
}

impl From<redis::RedisError> for AppError {
    fn from(err: redis::RedisError) -> Self {
        tracing::error!("Redis error: {}", err);
        AppError::CacheError("A cache error occurred.".to_string())
    }
}

impl From<argon2::password_hash::Error> for AppError {
    fn from(err: argon2::password_hash::Error) -> Self {
        tracing::error!("Hashing error: {}", err);
        AppError::InternalServerError("A password processing error occurred.".to_string())
    }
}

impl From<jsonwebtoken::errors::Error> for AppError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        tracing::error!("JWT error: {}", err);
        AppError::Unauthorized("Invalid or expired token.".to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        tracing::error!("JSON serialization error: {}", err);
        AppError::InternalServerError("Data serialization error.".to_string())
    }
}

// Result type alias for convenience
pub type AppResult<T> = Result<T, AppError>;


