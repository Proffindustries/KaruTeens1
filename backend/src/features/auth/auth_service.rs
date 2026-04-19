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
use crate::features::infrastructure::db::AppState;
use crate::models::{User, Profile};
use crate::features::infrastructure::dto::{AuthResponse, UserResponse, RegisterRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest};
use crate::features::infrastructure::error::{AppResult, AppError};
use tracing::{info, warn, error};
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
    pub token: String,
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    Arc<AppState>: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = Arc::from_ref(state);

        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .and_then(|s| s.strip_prefix("Bearer "))
            .ok_or(AppError::Unauthorized("Missing token".to_string()))?;

        let token_data = decode::<Claims>(
            auth_header,
            &DecodingKey::from_secret(app_state.jwt_secret.as_bytes()),
            &Validation::default(),
        ).map_err(|e| AppError::Unauthorized(format!("Invalid token: {}", e)))?;

        let user_id = ObjectId::parse_str(&token_data.claims.sub)
            .map_err(|_| AppError::Unauthorized("Invalid user ID in token".to_string()))?;

        // --- Check if token is blacklisted (fail gracefully on Redis error) ---
        let blacklist_key = format!("blacklist:{}", auth_header);
        let mut redis_conn = app_state.redis.clone();
        match redis_conn.get::<_, Option<String>>(&blacklist_key).await {
            Ok(Some(_)) => return Err(AppError::Unauthorized("Token is blacklisted".to_string())),
            Ok(None) => {},
            Err(_) => {
                tracing::warn!("Redis unavailable for blacklist check, allowing request through");
            }
        }

        // --- Presence Tracking & last_seen (non-fatal) ---
        let user_id_clone = user_id;
        let state_clone = app_state.clone();
        tokio::spawn(async move {
            let mut redis_conn = state_clone.redis.clone();
            let presence_key = format!("user:presence:{}", user_id_clone.to_hex());
            let _ = redis_conn.set_ex::<_, _, ()>(&presence_key, "online", state_clone.redis_presence_ttl).await;

            let mongo_update_key = format!("user:last_seen_mongo_update:{}", user_id_clone.to_hex());
            if let Ok(None) = redis_conn.get::<_, Option<String>>(&mongo_update_key).await {
                let mongo = state_clone.mongo.clone();
                tokio::spawn(async move {
                    let profiles = mongo.collection::<Profile>("profiles");
                    let _ = profiles.update_one(
                        doc! { "user_id": user_id_clone },
                        doc! { "$set": { "last_seen_at": mongodb::bson::DateTime::now() } },
                        None
                    ).await;
                });
                let mut redis_conn2 = state_clone.redis.clone();
                let _ = redis_conn2.set_ex::<_, _, ()>(&mongo_update_key, "1", state_clone.redis_mongo_update_ttl).await;
            }
        });

        Ok(AuthUser {
            user_id,
            role: token_data.claims.role,
            token: auth_header.to_string(),
        })
    }
}

// --- Handlers ---
pub async fn register_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterRequest>,
) -> AppResult<impl IntoResponse> {
    let users_collection = state.mongo.collection::<User>("users");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    // 1. Validate Username (Alphanumeric only)
    if !payload.username.chars().all(|c| c.is_alphanumeric()) {
        return Err(AppError::BadRequest("Username must only contain alphanumeric characters".to_string()));
    }

    // 2. Validate Password Length (minimum 8 characters)
    if payload.password.len() < 8 {
        return Err(AppError::BadRequest("Password must be at least 8 characters long".to_string()));
    }

    // 3. Check if user exists
    let existing_user = users_collection
        .find_one(doc! { "email": &payload.email }, None)
        .await?;

    if existing_user.is_some() {
        return Err(AppError::Conflict("Email already registered".to_string()));
    }
    
    // Check if username exists
    let existing_profile = profiles_collection
        .find_one(doc! { "username": &payload.username }, None)
        .await?;
        
    if existing_profile.is_some() {
        return Err(AppError::Conflict("Username already taken".to_string()));
    }

    // 3. Hash Password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(payload.password.as_bytes(), &salt)
        .map_err(|e| AppError::InternalServerError(format!("Hashing error: {}", e)))?
        .to_string();

    // 4. Insert User
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
        .await?;

    let user_id = insert_result.inserted_id.as_object_id().ok_or(AppError::InternalServerError("Failed to get inserted ID".to_string()))?;

      // 5. Create Profile
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
          quote: None,
          location: None,
          is_locked: false,
          social_links: None,
          last_seen_at: None,
          last_location: None,
          public_key: None,
          blocked_users: None,
          muted_chats: None,
          interests: None,
          notification_settings: None,
          onboarded: false,
          follower_count: 0,
          following_count: 0,
          points: 0,
          streak: 0,
          longest_streak: 0,
          profile_views: 0,
          level: 0,
          next_level_points: 0,
          badges: None,
          created_at: Some(mongodb::bson::DateTime::now()),
      };

    profiles_collection
        .insert_one(new_profile, None)
        .await?;

    Ok((StatusCode::CREATED, Json(json!({"message": "User registered successfully"}))))
}

pub async fn login_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> AppResult<impl IntoResponse> {
    tracing::info!("Attempting login for email: {}", payload.email);
    let users_collection = state.mongo.collection::<User>("users");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    // 1. Find user
    let user = users_collection
        .find_one(doc! { "email": &payload.email }, None)
        .await?
        .ok_or(AppError::Unauthorized("Invalid email or password".to_string()))?;

    // 2. Verify Password
    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|_| AppError::InternalServerError("Invalid hash format".to_string()))?;

    if Argon2::default().verify_password(payload.password.as_bytes(), &parsed_hash).is_err() {
        return Err(AppError::Unauthorized("Invalid email or password".to_string()));
    }

    let user_id = user.id.ok_or(AppError::NotFound("User not found".to_string()))?;

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

    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(state.jwt_secret.as_bytes()))?;

    // Try to get profile from cache first
    let mut profile = None;
    let profile_key = format!("profile:{}", user_id.to_hex());
    if let Some(cached_profile) = state.cache.get::<Profile>(&profile_key).await {
        profile = Some(cached_profile);
    } else {
        // Fetch from DB if not in cache
        if let Ok(Some(p)) = profiles_collection.find_one(doc! { "user_id": user_id }, None).await {
            profile = Some(p);
            // Cache the profile for 5 minutes
            let _ = state.cache.set(&profile_key, &profile.as_ref().unwrap(), 300).await;
        }
    }

    let auth_response = AuthResponse {
        token,
        user: UserResponse {
            id: user_id.to_hex(),
            email: user.email,
            role: current_role,
            username: profile.as_ref().map(|p| p.username.clone()),
            is_verified: user.is_verified,
            is_premium: current_is_premium,
            premium_expires_at: user.premium_expires_at.map(|dt| dt.to_chrono().to_rfc3339()),
            onboarded: profile.as_ref().map(|p| p.onboarded).unwrap_or(false),
        }
    };
    
    Ok((StatusCode::OK, Json(auth_response)))
}

pub async fn forgot_password_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ForgotPasswordRequest>,
) -> AppResult<impl IntoResponse> {
    let users_collection = state.mongo.collection::<User>("users");
    
    // 1. Check if user exists
    let user = users_collection.find_one(doc! { "email": &payload.email }, None).await?;
    
    if user.is_none() {
        // Return 200 anyway for security (don't reveal if email exists)
        return Ok(Json(json!({"message": "If this email is registered, you will receive a reset code."})));
    }

    // 2. Generate 6-digit OTP using cryptographically secure RNG
    let otp_str = {
        let mut rng = rand::rngs::OsRng;
        let otp: u32 = rng.gen_range(100000..999999);
        otp.to_string()
    };

    // 3. Store in Redis with 15min expiry
    let redis_key = format!("reset_otp:{}", payload.email);
    let mut conn = state.redis.clone();
    conn.set_ex::<_, _, ()>(&redis_key, &otp_str, 900).await?;

    tracing::info!("🔑 Reset code sent to {}", payload.email);

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
                    return Err(AppError::InternalServerError("Failed to send reset email. Please try again later.".to_string()));
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
) -> AppResult<impl IntoResponse> {
     // 1. Verify OTP in Redis
     let redis_key = format!("reset_otp:{}", payload.email);
     let mut redis_conn = state.redis.clone();
     let stored_otp: Option<String> = redis_conn.get(&redis_key).await?;

    match stored_otp {
        Some(otp) if otp == payload.code => {
            // OTP matches! 
            // 2. Hash new password
            let salt = SaltString::generate(&mut OsRng);
            let argon2 = Argon2::default();
            let password_hash = argon2.hash_password(payload.new_password.as_bytes(), &salt)
                .map_err(|e| AppError::InternalServerError(format!("Hashing error: {}", e)))?
                .to_string();

            // 3. Update user in Mongo
            let users_collection = state.mongo.collection::<User>("users");
            users_collection.update_one(
                doc! { "email": &payload.email },
                doc! { "$set": { "password_hash": password_hash } },
                None
            ).await?;

             // 4. Clear OTP
             let mut conn = state.redis.clone();
             conn.del::<_, ()>(&redis_key).await?;

            Ok(Json(json!({"message": "Password reset successfully. You can now login with your new password."})))
        },
        _ => Err(AppError::Unauthorized("Invalid or expired reset code".to_string()))
    }
}

pub async fn change_password_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<ChangePasswordRequest>,
) -> AppResult<impl IntoResponse> {
    let users_collection = state.mongo.collection::<User>("users");

    let user_doc = users_collection.find_one(doc! { "_id": user.user_id }, None).await?
        .ok_or(AppError::NotFound("User not found".to_string()))?;

    // Verify current password
    let parsed_hash = PasswordHash::new(&user_doc.password_hash)
        .map_err(|_| AppError::InternalServerError("Invalid hash format".to_string()))?;
    
    if Argon2::default().verify_password(payload.current_password.as_bytes(), &parsed_hash).is_err() {
        return Err(AppError::Unauthorized("Invalid current password".to_string()));
    }

    // Hash new password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(payload.new_password.as_bytes(), &salt)
        .map_err(|e| AppError::InternalServerError(format!("Hashing error: {}", e)))?
        .to_string();

    // Update in Mongo
    users_collection.update_one(
        doc! { "_id": user.user_id },
        doc! { "$set": { "password_hash": password_hash } },
        None
    ).await?;

    Ok(Json(json!({"message": "Password updated successfully"})))
}

pub async fn logout_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> AppResult<impl IntoResponse> {
    let mut conn = state.redis.clone();
    let token_key = format!("blacklist:{}", user.token);
    let ttl = 86400;
    let _ = conn.set_ex::<_, _, ()>(&token_key, "1", ttl).await;
    Ok(Json(json!({"message": "Logged out successfully"})))
}

pub async fn verify_free_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> AppResult<impl IntoResponse> {
    // 1. Check if payments are disabled
    let settings_collection = state.mongo.collection::<serde_json::Value>("settings");
    let settings = settings_collection.find_one(doc! {}, None).await?;

    let is_payment_enabled = match settings {
        Some(s) => s.get("is_payment_enabled").and_then(|v| v.as_bool()).unwrap_or(true), 
        None => true, 
    };

    if is_payment_enabled {
        return Err(AppError::Forbidden("Free verification is not available at this time. Please use M-Pesa.".to_string()));
    }

    // 2. Verify the user
    let users_collection = state.mongo.collection::<User>("users");
    users_collection.update_one(
        doc! { "_id": user.user_id },
        doc! { "$set": { "is_verified": true } },
        None
    ).await?;

    Ok(Json(json!({"message": "Verification successful! You are now a verified KaruTeen."})))
}

pub fn auth_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/register", post(register_handler))
        .route("/login", post(login_handler))
        .route("/forgot-password", post(forgot_password_handler))
        .route("/reset-password", post(reset_password_handler))
        .route("/change-password", post(change_password_handler))
        .route("/verify-free", post(verify_free_handler))
        .route("/logout", post(logout_handler))
}

pub fn decode_token(token: &str, secret: &str) -> Result<jsonwebtoken::TokenData<Claims>, jsonwebtoken::errors::Error> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
}
