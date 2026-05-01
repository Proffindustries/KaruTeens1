use axum::{
    extract::Json,
    routing::post,
    Router,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::features::infrastructure::db::AppState;
use crate::features::auth::auth_service::AuthUser;
use sha1::{Sha1, Digest};
use std::collections::BTreeMap;
use chrono::Utc;
use aws_sdk_s3::presigning::PresigningConfig;
use aws_sdk_s3::Client as S3Client;
use std::time::Duration;
use rand::Rng;
use rand::distributions::Alphanumeric;

#[derive(Debug, Deserialize)]
pub struct CloudinarySignatureRequest {
    pub params: BTreeMap<String, String>,
}

#[derive(Debug, Serialize)]
pub struct CloudinarySignatureResponse {
    pub signature: String,
    pub timestamp: i64,
}

#[derive(Debug, Deserialize)]
pub struct R2PresignedUrlRequest {
    pub file_name: String,
    pub content_type: String,
}

#[derive(Debug, Serialize)]
pub struct R2PresignedUrlResponse {
    pub url: String,
    pub public_url: String, // The actual URL being uploaded to (might be temp)
    pub final_public_url: String, // Where it will be after processing
}

pub fn media_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/signature/cloudinary", post(get_cloudinary_signature))
        .route("/signature/r2", post(get_r2_presigned_url))
        .route("/process", post(trigger_media_processing))
        .route("/status/:job_id", axum::routing::get(get_media_status))
}

use crate::models::MediaJobRecord;

async fn get_media_status(
    _user: AuthUser,
    state: axum::extract::State<Arc<AppState>>,
    axum::extract::Path(job_id): axum::extract::Path<String>,
) -> AppResult<impl IntoResponse> {
    let coll = state.mongo.collection::<MediaJobRecord>("media_jobs");
    let job = coll.find_one(mongodb::bson::doc! { "_id": &job_id }, None)
        .await
        .map_err(|e| AppError::InternalServerError(format!("DB error: {}", e)))?
        .ok_or_else(|| AppError::NotFound("Job not found".to_string()))?;

    Ok(Json(job))
}

#[derive(Debug, Deserialize)]
pub struct MediaProcessRequest {
    pub temp_url: String,
    pub media_type: String, // "video", "audio", "voice_note"
    pub original_name: String,
}

#[derive(Debug, Serialize)]
pub struct MediaProcessResponse {
    pub job_id: String,
    pub status: String,
}

async fn trigger_media_processing(
    _user: AuthUser,
    state: axum::extract::State<Arc<AppState>>,
    Json(payload): Json<MediaProcessRequest>,
) -> AppResult<impl IntoResponse> {
    let job_id = uuid::Uuid::new_v4().to_string();
    
    // 1. Create Job Record in MongoDB
    let coll = state.mongo.collection::<MediaJobRecord>("media_jobs");
    let final_url = format!("{}/uploads/{}", 
        std::env::var("R2_PUBLIC_BASE_URL").unwrap_or_default(),
        payload.temp_url.split("/temp/").last().unwrap_or("")
    );

    let record = MediaJobRecord {
        id: job_id.clone(),
        user_id: _user.id.to_string(),
        status: "pending".to_string(),
        media_type: payload.media_type.clone(),
        original_name: payload.original_name.clone(),
        final_url,
        error: None,
        created_at: Utc::now().timestamp(),
        updated_at: Utc::now().timestamp(),
    };
    
    coll.insert_one(record, None).await.map_err(|e| {
        tracing::error!("Failed to create job record: {}", e);
        AppError::InternalServerError("Database error".to_string())
    })?;

    // 2. Push job to Redis queue
    let mut conn = state.redis.clone();
    let job_data = serde_json::json!({
        "job_id": &job_id,
        "temp_url": payload.temp_url,
        "media_type": payload.media_type,
        "original_name": payload.original_name,
        "user_id": _user.id.to_string(),
        "created_at": Utc::now().timestamp(),
    });

    let _: () = redis::Cmd::lpush("media_queue", job_data.to_string())
        .query_async(&mut conn)
        .await
        .map_err(|e| {
            tracing::error!("Failed to queue media job: {}", e);
            AppError::InternalServerError("Queue system unavailable".to_string())
        })?;

    Ok(Json(MediaProcessResponse {
        job_id,
        status: "queued".to_string(),
    }))
}

use crate::features::infrastructure::error::{AppError, AppResult};

async fn get_cloudinary_signature(
    _user: AuthUser,
    Json(payload): Json<CloudinarySignatureRequest>,
) -> AppResult<impl IntoResponse> {
    let api_secret = std::env::var("CLOUDINARY_API_SECRET")
        .map_err(|_| AppError::InternalServerError("CLOUDINARY_API_SECRET not set".to_string()))?;
    
    // Cloudinary signature requires params to be sorted alphabetically (BTreeMap does this)
    // and joined with & then appending secret (NO & before secret)
    let mut param_string = payload.params
        .iter()
        .map(|(k, v)| format!("{}={}", k, v))
        .collect::<Vec<String>>()
        .join("&");
    
    param_string.push_str(&api_secret);
    
    let mut hasher = Sha1::new();
    hasher.update(param_string.as_bytes());
    let signature = hex::encode(hasher.finalize());

    Ok(Json(CloudinarySignatureResponse {
        signature,
        timestamp: payload.params.get("timestamp").and_then(|t| t.parse().ok()).unwrap_or_else(|| Utc::now().timestamp()),
    }))
}

async fn get_r2_presigned_url(
    _user: AuthUser,
    Json(payload): Json<R2PresignedUrlRequest>,
) -> AppResult<impl IntoResponse> {
    let account_id = std::env::var("R2_ACCOUNT_ID")
        .map_err(|_| AppError::InternalServerError("R2_ACCOUNT_ID not set".to_string()))?;
    let access_key_id = std::env::var("R2_ACCESS_KEY_ID")
        .map_err(|_| AppError::InternalServerError("R2_ACCESS_KEY_ID not set".to_string()))?;
    let secret_access_key = std::env::var("R2_SECRET_ACCESS_KEY")
        .map_err(|_| AppError::InternalServerError("R2_SECRET_ACCESS_KEY not set".to_string()))?;
    let bucket = std::env::var("R2_BUCKET")
        .map_err(|_| AppError::InternalServerError("R2_BUCKET not set".to_string()))?;
    let public_base_url = std::env::var("R2_PUBLIC_BASE_URL")
        .map_err(|_| AppError::InternalServerError("R2_PUBLIC_BASE_URL not set".to_string()))?;

    let endpoint = format!("https://{}.r2.cloudflarestorage.com", account_id);
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id,
        secret_access_key,
        None,
        None,
        "Static",
    );

    let config = aws_sdk_s3::config::Builder::new()
        .behavior_version(aws_sdk_s3::config::BehaviorVersion::latest())
        .endpoint_url(endpoint)
        .region(aws_sdk_s3::config::Region::new("auto"))
        .credentials_provider(credentials)
        .build();

    let client = S3Client::from_conf(config);
    
    // Sanitize filename: replace whitespace with underscores, keep alphanumeric, dots, dashes, underscores
    let mut sanitized_name = payload.file_name.chars()
        .map(|c| if c.is_whitespace() { '_' } else { c })
        .filter(|c| c.is_ascii() && (c.is_alphanumeric() || *c == '.' || *c == '-' || *c == '_'))
        .collect::<String>();
    
    if sanitized_name.is_empty() {
        sanitized_name = "file".to_string();
    }
    
    // Truncate filename if it's too long to prevent S3 key issues
    if sanitized_name.len() > 100 {
        sanitized_name = sanitized_name.chars().take(100).collect();
    }
        
    let suffix: String = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(6)
        .map(char::from)
        .collect();
    
    let key = if payload.content_type.starts_with("image/") {
        format!("uploads/{}/{}-{}", Utc::now().timestamp(), sanitized_name, suffix)
    } else {
        // Videos, Audio, and Docs go to temp/ for processing or safe storage
        format!("temp/{}/{}-{}", Utc::now().timestamp(), sanitized_name, suffix)
    };
    
    let expires_in = Duration::from_secs(3600);
    let presigned_request = client
        .put_object()
        .bucket(bucket)
        .key(&key)
        .content_type(payload.content_type)
        .presigned(PresigningConfig::expires_in(expires_in).map_err(|e| {
            tracing::error!("Presigned config error: {}", e);
            AppError::InternalServerError("Failed to create presigning config".to_string())
        })?)
        .await
        .map_err(|e| {
            tracing::error!("S3 presigning error: {}", e);
            AppError::InternalServerError("Failed to generate presigned URL".to_string())
        })?;

    let final_public_url = if payload.content_type.starts_with("image/") {
        format!("{}/{}", public_base_url, key)
    } else {
        // Map temp/ prefix to uploads/ for final destination
        format!("{}/{}", public_base_url, key.replace("temp/", "uploads/"))
    };

    Ok(Json(R2PresignedUrlResponse {
        url: presigned_request.uri().to_string(),
        public_url: format!("{}/{}", public_base_url, key),
        final_public_url,
    }))
}
