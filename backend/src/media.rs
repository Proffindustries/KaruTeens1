use axum::{
    extract::Json,
    routing::post,
    Router,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::db::AppState;
use crate::auth::AuthUser;
use sha1::{Sha1, Digest};
use std::collections::BTreeMap;
use hex;
use chrono::Utc;
use aws_sdk_s3::presigning::PresigningConfig;
use aws_sdk_s3::Client as S3Client;
use std::time::Duration;

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
    pub public_url: String,
}

pub fn media_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/signature/cloudinary", post(get_cloudinary_signature))
        .route("/signature/r2", post(get_r2_presigned_url))
}

async fn get_cloudinary_signature(
    _user: AuthUser,
    Json(payload): Json<CloudinarySignatureRequest>,
) -> impl IntoResponse {
    let api_secret = std::env::var("CLOUDINARY_API_SECRET").expect("CLOUDINARY_API_SECRET not set");
    
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

    Json(CloudinarySignatureResponse {
        signature,
        timestamp: payload.params.get("timestamp").and_then(|t| t.parse().ok()).unwrap_or_else(|| Utc::now().timestamp()),
    })
}

async fn get_r2_presigned_url(
    _user: AuthUser,
    Json(payload): Json<R2PresignedUrlRequest>,
) -> impl IntoResponse {
    let account_id = std::env::var("R2_ACCOUNT_ID").expect("R2_ACCOUNT_ID not set");
    let access_key_id = std::env::var("R2_ACCESS_KEY_ID").expect("R2_ACCESS_KEY_ID not set");
    let secret_access_key = std::env::var("R2_SECRET_ACCESS_KEY").expect("R2_SECRET_ACCESS_KEY not set");
    let bucket = std::env::var("R2_BUCKET").expect("R2_BUCKET not set");
    let public_base_url = std::env::var("R2_PUBLIC_BASE_URL").expect("R2_PUBLIC_BASE_URL not set");

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
    
    let key = format!("uploads/{}/{}", Utc::now().timestamp(), payload.file_name);
    
    let expires_in = Duration::from_secs(3600);
    let presigned_request = client
        .put_object()
        .bucket(bucket)
        .key(&key)
        .content_type(payload.content_type)
        .presigned(PresigningConfig::expires_in(expires_in).unwrap())
        .await
        .unwrap();

    Json(R2PresignedUrlResponse {
        url: presigned_request.uri().to_string(),
        public_url: format!("{}/{}", public_base_url, key),
    })
}
