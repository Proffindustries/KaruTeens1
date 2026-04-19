use axum::{
    http::StatusCode,
    response::{IntoResponse, Json},
};
use serde_json::json;
use std::collections::HashMap;

/// Standardized application error types
#[derive(Debug)]
pub enum AppError {
    // Client errors (4xx)
    BadRequest(String),
    Unauthorized(String),
    Forbidden(String),
    NotFound(String),
    Conflict(String),
    ValidationError(Vec<ValidationError>),
    
    // Server errors (5xx)
    InternalServerError(String),
    ServiceUnavailable(String),
    DatabaseError(String),
    CacheError(String),
    
    // Business logic errors
    InsufficientPermissions(String),
    ResourceLocked(String),
    QuotaExceeded(String),
    FeatureDisabled(String),
}

/// Validation error details for structured error responses
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ValidationError {
    pub field: String,
    pub message: String,
    pub code: Option<String>,
}

/// Enhanced error response structure
#[derive(serde::Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: Option<String>,
    pub details: Option<serde_json::Value>,
    pub code: Option<String>,
    pub validation_errors: Option<Vec<ValidationError>>,
    pub timestamp: String,
    pub request_id: Option<String>,
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, error_type, message, code) = match self {
            AppError::ValidationError(errors) => {
                let details = json!({
                    "validation_errors": errors
                });
                return (
                    StatusCode::BAD_REQUEST,
                    Json(ErrorResponse {
                        error: "validation_error".to_string(),
                        message: Some("Request validation failed".to_string()),
                        details: Some(details),
                        code: Some("VALIDATION_ERROR".to_string()),
                        validation_errors: Some(errors),
                        timestamp: chrono::Utc::now().to_rfc3339(),
                        request_id: get_request_id(),
                    })
                ).into_response();
            },
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, "bad_request", msg, Some("BAD_REQUEST")),
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, "unauthorized", msg, Some("UNAUTHORIZED")),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, "forbidden", msg, Some("FORBIDDEN")),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, "not_found", msg, Some("NOT_FOUND")),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, "conflict", msg, Some("CONFLICT")),
            AppError::InternalServerError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, "internal_server_error", msg, Some("INTERNAL_ERROR")),
            AppError::ServiceUnavailable(msg) => (StatusCode::SERVICE_UNAVAILABLE, "service_unavailable", msg, Some("SERVICE_UNAVAILABLE")),
            AppError::DatabaseError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, "database_error", msg, Some("DATABASE_ERROR")),
            AppError::CacheError(msg) => (StatusCode::SERVICE_UNAVAILABLE, "cache_error", msg, Some("CACHE_ERROR")),
            AppError::InsufficientPermissions(msg) => (StatusCode::FORBIDDEN, "insufficient_permissions", msg, Some("INSUFFICIENT_PERMISSIONS")),
            AppError::ResourceLocked(msg) => (StatusCode::LOCKED, "resource_locked", msg, Some("RESOURCE_LOCKED")),
            AppError::QuotaExceeded(msg) => (StatusCode::TOO_MANY_REQUESTS, "quota_exceeded", msg, Some("QUOTA_EXCEEDED")),
            AppError::FeatureDisabled(msg) => (StatusCode::SERVICE_UNAVAILABLE, "feature_disabled", msg, Some("FEATURE_DISABLED")),
        };

        let body = Json(ErrorResponse {
            error: error_type.to_string(),
            message: Some(message),
            details: None,
            code: code.map(|c| c.to_string()),
            validation_errors: None,
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

/// Error handling utilities
pub mod error_utils {
    use super::*;

    /// Create a validation error from field-level issues
    pub fn validation_error(field: &str, message: &str) -> AppError {
        AppError::ValidationError(vec![
            ValidationError {
                field: field.to_string(),
                message: message.to_string(),
                code: None,
            }
        ])
    }

    /// Create multiple validation errors
    pub fn validation_errors(errors: Vec<(String, String)>) -> AppError {
        let validation_errors = errors.into_iter().map(|(field, message)| ValidationError {
            field,
            message,
            code: None,
        }).collect();
        
        AppError::ValidationError(validation_errors)
    }

    /// Create a not found error with context
    pub fn not_found(resource: &str, identifier: &str) -> AppError {
        AppError::NotFound(format!("{} with identifier '{}' not found", resource, identifier))
    }

    /// Create a forbidden error with context
    pub fn forbidden(action: &str, resource: &str) -> AppError {
        AppError::Forbidden(format!("Insufficient permissions to {} {}", action, resource))
    }

    /// Create a conflict error with context
    pub fn conflict(resource: &str, reason: &str) -> AppError {
        AppError::Conflict(format!("{} conflict: {}", resource, reason))
    }
}
