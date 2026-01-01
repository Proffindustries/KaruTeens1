use axum::{
    extract::{State, Path, Json},
    http::StatusCode,
    response::IntoResponse,
    routing::{post, get},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use crate::db::AppState;
use crate::auth::AuthUser;
use crate::models::{Transaction, HookupAlias};
use mongodb::bson::{doc, DateTime};
use chrono::Utc;
use base64::{Engine as _, engine::general_purpose};

// --- DTOs ---

#[derive(Deserialize)]
pub struct StkPushRequest {
    pub phone: String,
    pub amount: f64,
    pub tx_type: String, // "verification" or "premium"
    pub premium_duration: Option<String>, 
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MpesaCallback {
    #[serde(rename = "Body")]
    pub body: StkCallbackBody,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct StkCallbackBody {
    #[serde(rename = "stkCallback")]
    pub stk_callback: StkCallback,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct StkCallback {
    #[serde(rename = "MerchantRequestID")]
    pub merchant_request_id: String,
    #[serde(rename = "CheckoutRequestID")]
    pub checkout_request_id: String,
    #[serde(rename = "ResultCode")]
    pub result_code: i32,
    #[serde(rename = "ResultDesc")]
    pub result_desc: String,
    #[serde(rename = "CallbackMetadata")]
    pub callback_metadata: Option<CallbackMetadata>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CallbackMetadata {
    #[serde(rename = "Item")]
    pub item: Vec<MetadataItem>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MetadataItem {
    #[serde(rename = "Name")]
    pub name: String,
    #[serde(rename = "Value")]
    pub value: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct StkQueryResponse {
    #[serde(rename = "ResponseCode")]
    pub response_code: String,
    #[serde(rename = "ResponseDescription")]
    pub response_description: String,
    #[serde(rename = "MerchantRequestID")]
    pub merchant_request_id: String,
    #[serde(rename = "CheckoutRequestID")]
    pub checkout_request_id: String,
    #[serde(rename = "ResultCode")]
    pub result_code: Option<String>,
    #[serde(rename = "ResultDesc")]
    pub result_desc: Option<String>,
}

// --- OAuth Response ---
#[derive(Deserialize)]
struct MpesaAuthResponse {
    access_token: String,
}

// --- Handler Functions ---

async fn get_mpesa_token(state: &AppState) -> Result<String, String> {
    // Check cache first
    let mpesa_env = std::env::var("MPESA_ENV").unwrap_or_else(|_| "sandbox".to_string()).trim().to_lowercase();
    if let Some(entry) = state.mpesa_token.get(&mpesa_env) {
        let (token, expires_at) = entry.value();
        if Utc::now().timestamp_millis() < *expires_at {
            return Ok(token.clone());
        }
    }

    let consumer_key = std::env::var("MPESA_CONSUMER_KEY").map_err(|_| "Missing MPESA_CONSUMER_KEY")?.trim().to_string();
    let consumer_secret = std::env::var("MPESA_CONSUMER_SECRET").map_err(|_| "Missing MPESA_CONSUMER_SECRET")?.trim().to_string();

    let client = reqwest::Client::new();
    let auth = general_purpose::STANDARD.encode(format!("{}:{}", consumer_key, consumer_secret));

    let url = if mpesa_env == "live" {
        "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    } else {
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    };

    tracing::trace!("Requesting new M-Pesa token from {}", url);

    let res = client.get(url)
        .header("Authorization", format!("Basic {}", auth))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("M-Pesa OAuth failed: {}", err_text));
    }

    let data: MpesaAuthResponse = res.json().await.map_err(|e| e.to_string())?;
    
    // Cache the token (standard expiry is 3600s, we use 3000s for safety)
    let expires_at = Utc::now().timestamp_millis() + 3000 * 1000;
    state.mpesa_token.insert(mpesa_env, (data.access_token.clone(), expires_at));
    
    Ok(data.access_token)
}

async fn query_stk_status_mpesa(state: &AppState, checkout_id: &str) -> Option<(String, String)> {
    let token = get_mpesa_token(state).await.ok()?;
    let shortcode = std::env::var("MPESA_BUSINESS_SHORTCODE").ok()?;
    let passkey = std::env::var("MPESA_PASSKEY").ok()?;
    let timestamp = Utc::now().format("%Y%m%d%H%M%S").to_string();
    let password = general_purpose::STANDARD.encode(format!("{}{}{}", shortcode, passkey, timestamp));

    let mpesa_env = std::env::var("MPESA_ENV").unwrap_or_else(|_| "sandbox".to_string()).trim().to_lowercase();
    let url = if mpesa_env == "live" {
        "https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query"
    } else {
        "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query"
    };

    tracing::trace!("Pinging Safaricom for {}", checkout_id);

    let client = reqwest::Client::new();
    let res = client.post(url)
        .header("Authorization", format!("Bearer {}", token))
        .json(&json!({
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_id
        }))
        .send()
        .await
        .ok()?;

    let data: StkQueryResponse = res.json().await.ok()?;
    tracing::trace!("Safaricom Response for {}: {:?}", checkout_id, data);
    
    // Check for explicit result code (meaning the user finished on their phone)
    if let Some(code) = data.result_code {
        if code == "0" {
            return Some(("completed".to_string(), "Success".to_string()));
        } else if code == "4999" {
            // Processing - return None to keep it pending
            return None;
        } else {
            let desc = data.result_desc.unwrap_or_else(|| "Unknown error".to_string());
            return Some(("failed".to_string(), desc));
        }
    }
    
    // Specific check for pending vs other errors
    if data.response_code == "0" && data.result_code.is_none() {
        // Still pending on phone
        return None;
    }

    // Handled explicit error from Safaricom response
    Some(("failed".to_string(), data.response_description))
}

pub async fn initiate_verification_payment(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<StkPushRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let token = get_mpesa_token(&state).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))))?;

    let shortcode = std::env::var("MPESA_BUSINESS_SHORTCODE").unwrap_or_else(|_| "174379".to_string());
    let passkey = std::env::var("MPESA_PASSKEY").unwrap_or_default();
    let transaction_type = std::env::var("MPESA_TRANSACTION_TYPE").unwrap_or_else(|_| "CustomerPayBillOnline".to_string());
    let party_b = std::env::var("MPESA_PARTYB").unwrap_or_else(|_| shortcode.clone());
    
    let timestamp = Utc::now().format("%Y%m%d%H%M%S").to_string();
    let password = general_purpose::STANDARD.encode(format!("{}{}{}", shortcode, passkey, timestamp));

    let base_url = std::env::var("BASE_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());
    let callback_url = format!("{}/api/payments/callback", base_url.trim_end_matches('/'));
    
    tracing::info!("Using callback URL: {}", callback_url);

    let client = reqwest::Client::new();
    let mpesa_env = std::env::var("MPESA_ENV").unwrap_or_else(|_| "sandbox".to_string()).trim().to_lowercase();
    let url = if mpesa_env == "live" {
        "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    } else {
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    };

    tracing::info!("Initiating STK Push at {} (Env: {}) for {}", url, mpesa_env, payload.phone);

    let mpesa_res = client.post(url)
        .header("Authorization", format!("Bearer {}", token))
        .json(&json!({
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": transaction_type,
            "Amount": payload.amount.round() as i32,
            "PartyA": payload.phone,
            "PartyB": party_b,
            "PhoneNumber": payload.phone,
            "CallBackURL": callback_url,
            "AccountReference": "KaruTeens",
            "TransactionDesc": match payload.tx_type.as_str() {
                "premium" => "Premium Upgrade",
                "hookup" => "Hookup Alias Activation",
                _ => "Account Verification"
            }
        }))
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mpesa_data: serde_json::Value = mpesa_res.json().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    if mpesa_data["ResponseCode"] != "0" {
        tracing::error!("M-Pesa STK Push error: {:?}", mpesa_data);
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": mpesa_data["ResponseDescription"]}))));
    }

    let checkout_request_id = mpesa_data["CheckoutRequestID"].as_str().unwrap().to_string();

    // Save pending transaction to MongoDB
    let collection = state.mongo.collection::<Transaction>("transactions");
    let new_tx = Transaction {
        id: None,
        user_id: user.user_id,
        phone_number: payload.phone,
        amount: payload.amount,
        mpesa_receipt_number: None,
        checkout_request_id: checkout_request_id.clone(),
        status: "pending".to_string(),
        transaction_type: payload.tx_type,
        premium_duration: payload.premium_duration,
        created_at: DateTime::now(),
        updated_at: DateTime::now(),
    };

    collection.insert_one(new_tx, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({
        "message": "STK Push initiated",
        "checkout_request_id": checkout_request_id
    }))))
}

pub async fn mpesa_callback_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<MpesaCallback>,
) -> impl IntoResponse {
    let callback = payload.body.stk_callback;
    let checkout_id = &callback.checkout_request_id;
    let result_code = callback.result_code;

    let tx_collection = state.mongo.collection::<Transaction>("transactions");

    if result_code == 0 {
        // Success
        let mut receipt = String::new();
        if let Some(meta) = callback.callback_metadata {
            for item in meta.item {
                if item.name == "MpesaReceiptNumber" {
                    receipt = item.value.and_then(|v| v.as_str().map(|s| s.to_string())).unwrap_or_default();
                }
            }
        }

        // Update Transaction
        let filter = doc! { "checkout_request_id": checkout_id };
        let update = doc! { 
            "$set": { 
                "status": "completed", 
                "mpesa_receipt_number": receipt,
                "updated_at": DateTime::now()
            } 
        };
        
        if let Ok(Some(tx)) = tx_collection.find_one_and_update(filter, update, None).await {
            // Update User Status
            let users = state.mongo.collection::<crate::models::User>("users");
            
            // ANY successful payment verifies the account for posting/commenting
            let _ = users.update_one(
                doc! { "_id": tx.user_id },
                doc! { "$set": { "is_verified": true } },
                None
            ).await;

            if tx.transaction_type == "premium" {
                let now = Utc::now();
                let duration = match tx.premium_duration.as_deref() {
                    Some("weekly") => chrono::Duration::days(7),
                    Some("monthly") => chrono::Duration::days(30),
                    Some("semi-annual") => chrono::Duration::days(157), // 5 months + 1 week
                    _ => chrono::Duration::days(30),
                };
                let expires_at = now + duration;

                let _ = users.update_one(
                    doc! { "_id": tx.user_id },
                    doc! { 
                        "$set": { 
                            "is_premium": true, 
                            "role": "premium",
                            "premium_expires_at": DateTime::from_chrono(expires_at)
                        } 
                    },
                    None
                ).await;
                tracing::info!("User {} upgraded to PREMIUM & verified. Expires: {}", tx.user_id, expires_at);
            } else if tx.transaction_type == "hookup" {
                let hookup_collection = state.mongo.collection::<HookupAlias>("hookup_aliases");
                let _ = hookup_collection.update_one(
                    doc! { "user_id": tx.user_id },
                    doc! { "$set": { "is_verified": true } },
                    None
                ).await;
                tracing::info!("User {} activated Hookup Alias & verified account", tx.user_id);
            } else {
                tracing::info!("User {} verified via M-Pesa", tx.user_id);
            }
        }
    } else {
        // Failed
        let filter = doc! { "checkout_request_id": checkout_id };
        let update = doc! { "$set": { "status": "failed", "updated_at": DateTime::now() } };
        let _ = tx_collection.update_one(filter, update, None).await;
    }

    StatusCode::OK
}

pub async fn get_transaction_status(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.mongo.collection::<Transaction>("transactions");
    
    let tx = collection.find_one(doc! { "checkout_request_id": &id, "user_id": user.user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    match tx {
        Some(mut row) => {
            let mut error_msg = None;

            // 1. Check for manual timeout (90s + 10s = 100s)
            let created_at_ms = row.created_at.timestamp_millis();
            let now_ms = Utc::now().timestamp_millis();
            let elapsed_sec = (now_ms - created_at_ms) / 1000;

            if row.status == "pending" && elapsed_sec > 100 {
                tracing::warn!("Checkout {} timed out after {}s", id, elapsed_sec);
                row.status = "failed".to_string();
                error_msg = Some("Transaction timed out. Please try again.".to_string());
                
                let filter = doc! { "checkout_request_id": &id };
                let update = doc! { "$set": { "status": "failed", "updated_at": DateTime::now() } };
                let _ = collection.update_one(filter, update, None).await;
            }

            // 2. If it's still pending, try querying M-Pesa directly
            if row.status == "pending" {
                if let Some((new_status, desc)) = query_stk_status_mpesa(&state, &id).await {
                    row.status = new_status.clone();
                    error_msg = if row.status == "failed" { Some(desc) } else { None };
                    
                    // Update DB with new status from query
                    let filter = doc! { "checkout_request_id": &id };
                    let update = doc! { "$set": { "status": &row.status, "updated_at": DateTime::now() } };
                    let _ = collection.update_one(filter, update, None).await;

                    // If it just completed, update user
                    if row.status == "completed" {
                        let users = state.mongo.collection::<crate::models::User>("users");
                        
                        // ANY successful payment verifies the account
                        let _ = users.update_one(
                            doc! { "_id": row.user_id },
                            doc! { "$set": { "is_verified": true } },
                            None
                        ).await;

                        if row.transaction_type == "premium" {
                            let now = Utc::now();
                            let duration = match row.premium_duration.as_deref() {
                                Some("weekly") => chrono::Duration::days(7),
                                Some("monthly") => chrono::Duration::days(30),
                                Some("semi-annual") => chrono::Duration::days(157),
                                _ => chrono::Duration::days(30),
                            };
                            let expires_at = now + duration;

                            let _ = users.update_one(
                                doc! { "_id": row.user_id },
                                doc! { 
                                    "$set": { 
                                        "is_premium": true, 
                                        "role": "premium",
                                        "premium_expires_at": DateTime::from_chrono(expires_at)
                                    } 
                                },
                                None
                            ).await;
                        } else if row.transaction_type == "hookup" {
                            let hookup_collection = state.mongo.collection::<HookupAlias>("hookup_aliases");
                            let _ = hookup_collection.update_one(
                                doc! { "user_id": row.user_id },
                                doc! { "$set": { "is_verified": true } },
                                None
                            ).await;
                        }
                    }
                }
            }

            Ok(Json(json!({
                "status": row.status,
                "receipt": row.mpesa_receipt_number,
                "error_message": error_msg
            })))
        },
        None => Err((StatusCode::NOT_FOUND, Json(json!({"error": "Transaction not found"})))),
    }
}

pub fn payment_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/verify", post(initiate_verification_payment))
        .route("/callback", post(mpesa_callback_handler))
        .route("/status/:id", get(get_transaction_status))
}
