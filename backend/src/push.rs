use mongodb::bson::{doc, oid::ObjectId};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::db::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PushNotificationPayload {
    pub title: String,
    pub body: String,
    pub icon: Option<String>,
    pub badge: Option<String>,
    pub tag: Option<String>,
    pub data: Option<serde_json::Value>,
    pub actions: Option<Vec<PushAction>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PushAction {
    pub action: String,
    pub title: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PushNotificationData {
    pub notification_type: String,
    pub actor_id: String,
    pub actor_name: String,
    pub target_id: String,
    pub target_type: String,
    pub thread_id: Option<String>,
}

pub async fn send_push_notification(
    _state: &Arc<AppState>,
    _user_id: ObjectId,
    _payload: PushNotificationPayload,
) -> Result<(), String> {
    // Push subscription feature not implemented yet
    // This is a placeholder that does nothing but returns success
    Ok(())
}

async fn send_webpush_notification(
    endpoint: &str,
    _p256dh: &str,
    _auth: &str,
    payload: &PushNotificationPayload,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    
    let body = serde_json::to_string(payload).map_err(|e| e.to_string())?;

    let vapid_key = std::env::var("VAPID_PUBLIC_KEY").unwrap_or_else(|_| "".to_string());
    
    let mut request = client.post(endpoint)
        .header("Content-Type", "application/json")
        .header("TTL", "86400")
        .header("Authorization", format!("vapid t={}", vapid_key));

    if !vapid_key.is_empty() {
        request = request.header("Authorization", format!("vapid t={}, k={}", vapid_key, vapid_key));
    }

    request.body(body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn notify_like_post(
    state: &Arc<AppState>,
    post_author_id: ObjectId,
    liker_id: ObjectId,
    liker_name: String,
    post_id: ObjectId,
) {
    if post_author_id == liker_id {
        return;
    }

    let payload = PushNotificationPayload {
        title: "New Like".to_string(),
        body: format!("{} liked your post", liker_name),
        icon: None,
        badge: None,
        tag: Some(format!("like-{}", post_id)),
        data: Some(serde_json::json!({
            "type": "like",
            "post_id": post_id.to_hex(),
            "user_id": liker_id.to_hex(),
        })),
        actions: None,
    };

    if let Err(e) = send_push_notification(state, post_author_id, payload).await {
        tracing::warn!("Failed to send like notification: {}", e);
    }
}

pub async fn notify_comment_post(
    state: &Arc<AppState>,
    post_author_id: ObjectId,
    commenter_id: ObjectId,
    commenter_name: String,
    post_id: ObjectId,
    comment_preview: String,
) {
    if post_author_id == commenter_id {
        return;
    }

    let body = if comment_preview.len() > 50 {
        format!("{}: {}...", commenter_name, &comment_preview[..50])
    } else {
        format!("{}: {}", commenter_name, comment_preview)
    };

    let payload = PushNotificationPayload {
        title: "New Comment".to_string(),
        body,
        icon: None,
        badge: None,
        tag: Some(format!("comment-{}", post_id)),
        data: Some(serde_json::json!({
            "type": "comment",
            "post_id": post_id.to_hex(),
            "user_id": commenter_id.to_hex(),
        })),
        actions: None,
    };

    if let Err(e) = send_push_notification(state, post_author_id, payload).await {
        tracing::warn!("Failed to send comment notification: {}", e);
    }
}

pub async fn notify_new_follower(
    state: &Arc<AppState>,
    followed_id: ObjectId,
    follower_id: ObjectId,
    follower_name: String,
) {
    if followed_id == follower_id {
        return;
    }

    let payload = PushNotificationPayload {
        title: "New Follower".to_string(),
        body: format!("{} started following you", follower_name),
        icon: None,
        badge: None,
        tag: Some(format!("follow-{}", follower_id)),
        data: Some(serde_json::json!({
            "type": "follow",
            "user_id": follower_id.to_hex(),
        })),
        actions: None,
    };

    if let Err(e) = send_push_notification(state, followed_id, payload).await {
        tracing::warn!("Failed to send follow notification: {}", e);
    }
}
