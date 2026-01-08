use axum::{
    extract::{State, FromRequestParts, FromRef},
    http::{StatusCode, request::Parts},
    response::{IntoResponse, Json},
    routing::post,
    Router,
    async_trait,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use crate::db::AppState;
use crate::models::{User, Profile};
use redis::AsyncCommands;
use argon2::{
    password_hash::{
        rand_core::OsRng,
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2
};
use jsonwebtoken::{encode, decode, EncodingKey, DecodingKey, Header, Validation};
use chrono::{Utc, Duration};
use mongodb::bson::doc;
use bson::oid::ObjectId;
use rand::Rng;

// --- DTOs ---
#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub username: String,
    pub full_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub school: Option<String>,
    pub year_of_study: Option<i32>,
    pub age: Option<i32>,
    pub gender: Option<String>,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Serialize)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
    pub role: String,
    pub username: Option<String>,
    pub is_verified: bool,
    pub is_premium: bool,
    pub premium_expires_at: Option<String>,
}

#[derive(Deserialize)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Deserialize)]
pub struct ResetPasswordRequest {
    pub email: String,
    pub code: String,
    pub new_password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // User ID (ObjectId hex)
    pub exp: usize,
    pub role: String,
}

pub struct AuthUser {
    pub user_id: ObjectId,
    #[allow(dead_code)]
    pub role: String,
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    Arc<AppState>: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, Json<serde_json::Value>);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = Arc::from_ref(state);

        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .and_then(|s| s.strip_prefix("Bearer "))
            .ok_or((StatusCode::UNAUTHORIZED, Json(json!({"error": "Missing token"}))))?;

        let token_data = decode::<Claims>(
            auth_header,
            &DecodingKey::from_secret(app_state.jwt_secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|e| {
            tracing::error!("Token decode error: {}", e);
            (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid token"})))
        })?;

        let user_id = ObjectId::parse_str(&token_data.claims.sub)
            .map_err(|_| (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid user ID in token"}))))?;

        // --- Presence Tracking (Redis) ---
        let mut conn = app_state.redis.get_async_connection().await
            .map_err(|e| {
                tracing::error!("Redis connection error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Resource error"})))
            })?;
        
        let presence_key = format!("user:presence:{}", user_id.to_hex());
        let _: () = conn.set_ex(&presence_key, "online", 300).await.unwrap_or_default();

        // Throttled MongoDB update for last_seen_at
        let mongo_update_key = format!("user:last_seen_mongo_update:{}", user_id.to_hex());
        let needs_mongo_update: bool = conn.get::<_, Option<String>>(&mongo_update_key).await.map(|v| v.is_none()).unwrap_or(true);
        
        if needs_mongo_update {
            let mongo = app_state.mongo.clone();
            let user_id_clone = user_id;
            tokio::spawn(async move {
                let profiles = mongo.collection::<Profile>("profiles");
                let _ = profiles.update_one(
                    doc! { "user_id": user_id_clone },
                    doc! { "$set": { "last_seen_at": mongodb::bson::DateTime::now() } },
                    None
                ).await;
            });
            let _: () = conn.set_ex(&mongo_update_key, "1", 60).await.unwrap_or_default();
        }

        Ok(AuthUser {
            user_id,
            role: token_data.claims.role,
        })
    }
}

// --- Handlers ---
pub async fn register_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let users_collection = state.mongo.collection::<User>("users");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    // 1. Validate Username (Alphanumeric only)
    if !payload.username.chars().all(|c| c.is_alphanumeric()) {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Username must only contain alphanumeric characters"}))));
    }

    // 2. Check if user exists


    let existing_user = users_collection
        .find_one(doc! { "email": &payload.email }, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    if existing_user.is_some() {
        return Err((StatusCode::CONFLICT, Json(json!({"error": "Email already registered"}))));
    }

    // 2. Hash Password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(payload.password.as_bytes(), &salt)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Hashing failed"}))))?
        .to_string();

    // 3. Insert User
    let new_user = User {
        id: None,
        email: payload.email.clone(),
        password_hash,
        role: "student".to_string(),
        is_verified: false,
        is_premium: false,
        premium_expires_at: None,
        is_banned: false,
        banned_at: None,
        banned_by: None,
        created_at: mongodb::bson::DateTime::now(),
    };

    let insert_result = users_collection
        .insert_one(new_user, None)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to create user"}))))?;

    let user_id = insert_result.inserted_id.as_object_id().unwrap();

    // 4. Create Profile
    let new_profile = Profile {
        id: None,
        user_id,
        username: payload.username.clone(),
        full_name: payload.full_name,
        bio: payload.bio,
        avatar_url: payload.avatar_url,
        school: payload.school,
        year_of_study: payload.year_of_study,
        age: payload.age,
        gender: payload.gender,
        social_links: None,
        last_seen_at: None,
        last_location: None,
        public_key: None,
        blocked_users: None,
        muted_chats: None,
        created_at: Some(mongodb::bson::DateTime::now()),
    };

    profiles_collection
        .insert_one(new_profile, None)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to create profile"}))))?;

    Ok((StatusCode::CREATED, Json(json!({"message": "User registered successfully"}))))
}

pub async fn login_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    tracing::info!("Attempting login for email: {}", payload.email);
    let users_collection = state.mongo.collection::<User>("users");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    let user = users_collection
        .find_one(doc! { "email": &payload.email }, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let user = match user {
        Some(u) => u,
        None => return Err((StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid email or password"})))),
    };

    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Invalid hash format"}))))?;
    
    if Argon2::default().verify_password(payload.password.as_bytes(), &parsed_hash).is_err() {
        return Err((StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid email or password"}))));
    }

    let user_id = user.id.unwrap();

    // Check Premium Expiry
    let mut current_role = user.role.clone();
    let mut current_is_premium = user.is_premium;
    if user.is_premium {
        if let Some(expiry) = user.premium_expires_at {
            if expiry.to_chrono() < Utc::now() {
                current_role = "student".to_string();
                current_is_premium = false;
                let users_clone = users_collection.clone();
                let uid_clone = user_id;
                tokio::spawn(async move {
                    let _ = users_clone.update_one(
                        doc! { "_id": uid_clone },
                        doc! { "$set": { "is_premium": false, "role": "student" } },
                        None
                    ).await;
                });
            }
        }
    }

    let expiration = Utc::now().checked_add_signed(Duration::hours(24)).unwrap().timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_hex(),
        exp: expiration,
        role: current_role.clone(),
    };

    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(state.jwt_secret.as_bytes()))
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Token creation failed"}))))?;

    let profile = profiles_collection.find_one(doc! { "user_id": user_id }, None).await.unwrap_or(None);

    let auth_response = AuthResponse {
        token,
        user: UserResponse {
            id: user_id.to_hex(),
            email: user.email,
            role: current_role,
            username: profile.map(|p| p.username),
            is_verified: user.is_verified,
            is_premium: current_is_premium,
            premium_expires_at: user.premium_expires_at.map(|dt| dt.to_chrono().to_rfc3339()),
        }
    };
    
    Ok((StatusCode::OK, Json(auth_response)))
}

pub async fn forgot_password_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ForgotPasswordRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let users_collection = state.mongo.collection::<User>("users");
    
    // 1. Check if user exists
    let user = users_collection.find_one(doc! { "email": &payload.email }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    if user.is_none() {
        // Return 200 anyway for security (don't reveal if email exists)
        return Ok(Json(json!({"message": "If this email is registered, you will receive a reset code."})));
    }

    // 2. Generate 6-digit OTP
    let otp_str = {
        let mut rng = rand::thread_rng();
        rng.gen_range(100000..999999).to_string()
    };

    // 3. Store in Redis with 15min expiry
    let mut conn = state.redis.get_async_connection().await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Redis error"}))))?;
    
    let redis_key = format!("reset_otp:{}", payload.email);
    let _: () = conn.set_ex(&redis_key, &otp_str, 900).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to store OTP"}))))?;

    tracing::info!("🔑 Reset code for {}: {}", payload.email, otp_str);

    // 4. Send Email via Brevo
    if state.brevo_api_key.is_empty() {
        tracing::warn!("⚠️ BREVO_API_KEY not set! Reset code for {}: {}", payload.email, otp_str);
    } else {
        let email_payload = json!({
            "sender": { "name": "Karu teens", "email": "no-reply@karuteens.site" },
            "to": [{ "email": payload.email }],
            "subject": "Reset Your KaruTeens Password",
            "htmlContent": format!(
                "<html><body><h1>Password Reset</h1><p>Your password reset code is: <strong>{}</strong></p><p>This code expires in 15 minutes.</p></body></html>",
                otp_str
            )
        });

        let response = state.http_client.post("https://api.brevo.com/v3/smtp/email")
            .header("api-key", &state.brevo_api_key)
            .json(&email_payload)
            .send()
            .await;

        match response {
            Ok(resp) => {
                if !resp.status().is_success() {
                    let err_body = resp.text().await.unwrap_or_default();
                    tracing::error!("❌ Brevo Error ({}): {}", payload.email, err_body);
                    // Still return success to front-end for security, but we know it failed
                } else {
                    tracing::info!("✅ Reset email sent to {}", payload.email);
                }
            }
            Err(e) => {
                tracing::error!("❌ Failed to reach Brevo: {}", e);
            }
        }
    }

    Ok(Json(json!({"message": "Reset code sent successfully"})))
}

pub async fn reset_password_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ResetPasswordRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // 1. Verify OTP in Redis
    let mut conn = state.redis.get_async_connection().await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Redis error"}))))?;
    
    let redis_key = format!("reset_otp:{}", payload.email);
    let stored_otp: Option<String> = conn.get(&redis_key).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Redis error"}))))?;

    match stored_otp {
        Some(otp) if otp == payload.code => {
            // OTP matches! 
            // 2. Hash new password
            let salt = SaltString::generate(&mut OsRng);
            let argon2 = Argon2::default();
            let password_hash = argon2.hash_password(payload.new_password.as_bytes(), &salt)
                .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Hashing failed"}))))?
                .to_string();

            // 3. Update user in Mongo
            let users_collection = state.mongo.collection::<User>("users");
            users_collection.update_one(
                doc! { "email": &payload.email },
                doc! { "$set": { "password_hash": password_hash } },
                None
            ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

            // 4. Clear OTP
            let _: () = conn.del(&redis_key).await.unwrap_or_default();

            Ok(Json(json!({"message": "Password reset successfully. You can now login with your new password."})))
        },
        _ => Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid or expired reset code"}))))
    }
}

pub async fn verify_free_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // 1. Check if payments are disabled
    let settings_collection = state.mongo.collection::<serde_json::Value>("settings");
    let settings = settings_collection.find_one(doc! {}, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let is_payment_enabled = match settings {
        Some(s) => s.get("is_payment_enabled").and_then(|v| v.as_bool()).unwrap_or(true),
        None => true,
    };

    if is_payment_enabled {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Free verification is not available at this time. Please use M-Pesa."}))));
    }

    // 2. Verify the user
    let users_collection = state.mongo.collection::<User>("users");
    users_collection.update_one(
        doc! { "_id": user.user_id },
        doc! { "$set": { "is_verified": true } },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(json!({"message": "Verification successful! You are now a verified KaruTeen."})))
}

pub fn auth_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/register", post(register_handler))
        .route("/login", post(login_handler))
        .route("/forgot-password", post(forgot_password_handler))
        .route("/reset-password", post(reset_password_handler))
        .route("/verify-free", post(verify_free_handler))
}

pub fn decode_token(token: &str, secret: &str) -> Result<jsonwebtoken::TokenData<Claims>, jsonwebtoken::errors::Error> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
}
