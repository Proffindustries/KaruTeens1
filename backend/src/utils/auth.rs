//! Authentication and authorization utilities

use mongodb::bson::oid::ObjectId;
use std::sync::Arc;
use crate::features::infrastructure::db::AppState;
use crate::features::infrastructure::error::{AppError, AppResult};

/// Check if user is a system administrator
pub async fn check_admin(
    user_id: ObjectId,
    state: &Arc<AppState>,
) -> AppResult<()> {
    let users = state.mongo.collection::<crate::models::User>("users");
    let user = users.find_one(
        mongodb::bson::doc! { "_id": user_id, "role": "admin" }, 
        None
    ).await?
    .ok_or(AppError::Forbidden("Admin access required".to_string()))?;
    
    if user.role != "admin" {
        return Err(AppError::Forbidden("Admin access required".to_string()));
    }
    
    Ok(())
}
