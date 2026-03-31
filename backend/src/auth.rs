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

pub enum AuthError {
    Mongo(mongodb::error::Error),
    Redis(redis::RedisError),
    PasswordHash(argon2::password_hash::Error),
    Jwt(jsonwebtoken::errors::Error),
    InvalidToken,
    UserNotFound,
    EmailExists,
    UsernameExists,
    WrongPassword,
    TokenCreation,
    InvalidHash,
    InvalidUserIdInToken,
    MissingToken,
    AlphanumericUsername,
    PasswordTooShort,
    FreeVerificationNotAvailable,
    Bson(bson::ser::Error),
    BsonOid(bson::oid::Error),
    BrevoError,
}

impl From<mongodb::error::Error> for AuthError {
    fn from(err: mongodb::error::Error) -> Self {
        AuthError::Mongo(err)
    }
}

impl From<redis::RedisError> for AuthError {
    fn from(err: redis::RedisError) -> Self {
        AuthError::Redis(err)
    }
}

impl From<argon2::password_hash::Error> for AuthError {
    fn from(err: argon2::password_hash::Error) -> Self {
        AuthError::PasswordHash(err)
    }
}

impl From<jsonwebtoken::errors::Error> for AuthError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        AuthError::Jwt(err)
    }
}

impl From<bson::ser::Error> for AuthError {
    fn from(err: bson::ser::Error) -> Self {
        AuthError::Bson(err)
    }
}

impl From<bson::oid::Error> for AuthError {
    fn from(err: bson::oid::Error) -> Self {
        AuthError::BsonOid(err)
    }
}

impl IntoResponse for AuthError {
    fn into_response(self) -> axum::response::Response {
        let (status, error_message) = match self {
            AuthError::Mongo(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)),
            AuthError::Redis(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Cache error. Please try again.".to_string()),
            AuthError::PasswordHash(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Hashing error: {}", e)),
            AuthError::Jwt(e) => (StatusCode::UNAUTHORIZED, format!("Token error: {}", e)),
            AuthError::InvalidToken => (StatusCode::UNAUTHORIZED, "Invalid token".to_string()),
            AuthError::UserNotFound => (StatusCode::NOT_FOUND, "User not found".to_string()),
            AuthError::EmailExists => (StatusCode::CONFLICT, "Email already registered".to_string()),
            AuthError::UsernameExists => (StatusCode::CONFLICT, "Username already taken".to_string()),
            AuthError::WrongPassword => (StatusCode::UNAUTHORIZED, "Invalid email or password".to_string()),
            AuthError::TokenCreation => (StatusCode::INTERNAL_SERVER_ERROR, "Token creation failed".to_string()),
            AuthError::InvalidHash => (StatusCode::INTERNAL_SERVER_ERROR, "Invalid hash format".to_string()),
            AuthError::InvalidUserIdInToken => (StatusCode::UNAUTHORIZED, "Invalid user ID in token".to_string()),
            AuthError::MissingToken => (StatusCode::UNAUTHORIZED, "Missing token".to_string()),
            AuthError::AlphanumericUsername => (StatusCode::BAD_REQUEST, "Username must only contain alphanumeric characters".to_string()),
            AuthError::PasswordTooShort => (StatusCode::BAD_REQUEST, "Password must be at least 8 characters long".to_string()),
            AuthError::FreeVerificationNotAvailable => (StatusCode::FORBIDDEN, "Free verification is not available at this time. Please use M-Pesa.".to_string()),
            AuthError::Bson(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("BSON serialization error: {}", e)),
            AuthError::BsonOid(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("BSON OID error: {}", e)),
            AuthError::BrevoError => (StatusCode::INTERNAL_SERVER_ERROR, "Failed to send reset email. Please try again later.".to_string()),
        };
        (status, Json(json!({ "error": error_message }))).into_response()
    }
}

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
    pub onboarded: bool,
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

#[derive(Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
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
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = Arc::from_ref(state);

        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .and_then(|s| s.strip_prefix("Bearer "))
            .ok_or(AuthError::MissingToken)?;

        let token_data = decode::<Claims>(
            auth_header,
            &DecodingKey::from_secret(app_state.jwt_secret.as_bytes()),
            &Validation::default(),
        )?;

        let user_id = ObjectId::parse_str(&token_data.claims.sub)
            .map_err(|_| AuthError::InvalidUserIdInToken)?;

        // --- Check if token is blacklisted ---
        let blacklist_key = format!("blacklist:{}", user_id.to_hex());
        let mut redis_conn = app_state.redis.clone();
        let is_blacklisted: Option<String> = redis_conn.get(&blacklist_key).await?;
        if is_blacklisted.is_some() {
            return Err(AuthError::InvalidToken);
        }

        // --- Presence Tracking (Redis) ---
        let presence_key = format!("user:presence:{}", user_id.to_hex());
        let mut redis_conn = app_state.redis.clone();
        redis_conn.set_ex::<_, _, ()>(&presence_key, "online", app_state.redis_presence_ttl).await?;

        // Throttled MongoDB update for last_seen_at
        let mongo_update_key = format!("user:last_seen_mongo_update:{}", user_id.to_hex());
        let mut redis_conn = app_state.redis.clone();
        let needs_mongo_update: bool = redis_conn.get::<_, Option<String>>(&mongo_update_key).await?.is_none();
        
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
             let mut redis_conn = app_state.redis.clone();
             redis_conn.set_ex::<_, _, ()>(&mongo_update_key, "1", app_state.redis_mongo_update_ttl).await?;
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
) -> Result<impl IntoResponse, AuthError> {
    let users_collection = state.mongo.collection::<User>("users");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    // 1. Validate Username (Alphanumeric only)
    if !payload.username.chars().all(|c| c.is_alphanumeric()) {
        return Err(AuthError::AlphanumericUsername);
    }

    // 2. Validate Password Length (minimum 8 characters)
    if payload.password.len() < 8 {
        return Err(AuthError::PasswordTooShort);
    }

    // 3. Check if user exists
    let existing_user = users_collection
        .find_one(doc! { "email": &payload.email }, None)
        .await?;

    if existing_user.is_some() {
        return Err(AuthError::EmailExists);
    }
    
    // Check if username exists
    let existing_profile = profiles_collection
        .find_one(doc! { "username": &payload.username }, None)
        .await?;
        
    if existing_profile.is_some() {
        return Err(AuthError::UsernameExists);
    }

    // 3. Hash Password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(payload.password.as_bytes(), &salt)?
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

    let user_id = insert_result.inserted_id.as_object_id().ok_or(AuthError::InvalidUserIdInToken)?;

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
) -> Result<impl IntoResponse, AuthError> {
    tracing::info!("Attempting login for email: {}", payload.email);
    let users_collection = state.mongo.collection::<User>("users");
    let profiles_collection = state.mongo.collection::<Profile>("profiles");

    let user = users_collection
        .find_one(doc! { "email": &payload.email }, None)
        .await?
        .ok_or(AuthError::WrongPassword)?; // Use WrongPassword for security

    let parsed_hash = PasswordHash::new(&user.password_hash)?;
    
    if Argon2::default().verify_password(payload.password.as_bytes(), &parsed_hash).is_err() {
        return Err(AuthError::WrongPassword);
    }

    let user_id = user.id.ok_or(AuthError::UserNotFound)?;

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
) -> Result<impl IntoResponse, AuthError> {
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
                    return Err(AuthError::BrevoError);
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
) -> Result<impl IntoResponse, AuthError> {
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
            let password_hash = argon2.hash_password(payload.new_password.as_bytes(), &salt)?
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
        _ => Err(AuthError::InvalidToken)
    }
}

pub async fn change_password_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<ChangePasswordRequest>,
) -> Result<impl IntoResponse, AuthError> {
    let users_collection = state.mongo.collection::<User>("users");

    let user_doc = users_collection.find_one(doc! { "_id": user.user_id }, None).await?
        .ok_or(AuthError::UserNotFound)?;

    // Verify current password
    let parsed_hash = PasswordHash::new(&user_doc.password_hash)?;
    
    if Argon2::default().verify_password(payload.current_password.as_bytes(), &parsed_hash).is_err() {
        return Err(AuthError::WrongPassword);
    }

    // Hash new password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(payload.new_password.as_bytes(), &salt)?
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
) -> Result<impl IntoResponse, AuthError> {
    let mut conn = state.redis.clone();
    let token_key = format!("blacklist:{}", user.user_id.to_hex());
    let ttl = 86400;
    conn.set_ex::<_, _, ()>(&token_key, "1", ttl).await?;
    Ok(Json(json!({"message": "Logged out successfully"})))
}

pub async fn verify_free_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<impl IntoResponse, AuthError> {
    // 1. Check if payments are disabled
    let settings_collection = state.mongo.collection::<serde_json::Value>("settings");
    let settings = settings_collection.find_one(doc! {}, None).await?;

    let is_payment_enabled = match settings {
        Some(s) => s.get("is_payment_enabled").and_then(|v| v.as_bool()).unwrap_or(true), // unwrap_or(true) means if setting not found, payment is enabled by default
        None => true, // if no settings document, payment is enabled
    };

    if is_payment_enabled {
        return Err(AuthError::FreeVerificationNotAvailable);
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
