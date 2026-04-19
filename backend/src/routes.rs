use axum::{
    routing::get,
    Router,
};
use std::sync::Arc;
use crate::features::infrastructure::db::AppState;
use crate::features::{
    ads, ai, auth::user, content,
    social::{ably, confessions, events, follows, groups, hookup, messages, notifications, pages, ws},
    academic::{revision_materials, study_rooms, timetable},
    monetization::{marketplace, payments},
    infrastructure::{admin, stats, media},
};
use crate::features::content::{comments, playlist, reels, stories};

pub fn create_router(state: Arc<AppState>) -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(health_check))
        .route("/ws", get(ws::ws_handler))
        .route("/api/config", get(admin::get_public_settings_handler))
        .route("/api/leaderboards", get(stats::get_leaderboards_handler))
        .nest("/api/auth", crate::features::auth::auth_service::auth_routes())
        .nest("/api/posts", content::content_routes())
        .nest("/api/comments", comments::comment_routes())
        .nest("/api/users", user::user_routes())
        .nest("/api/media", media::media_routes())
        .nest("/api/ably", ably::ably_routes())
        .nest("/api/marketplace", marketplace::marketplace_routes())
        .nest("/api/messages", messages::message_routes())
        .nest("/api/notifications", notifications::notification_routes())
        .nest("/api/payments", payments::payment_routes())
        .nest("/api/ai", ai::ai_routes())
        .nest("/api/hookup", hookup::hookup_routes())
        .nest("/api/study-rooms", study_rooms::study_room_routes())
        .nest("/api/revision-materials", revision_materials::revision_material_routes())
        .nest("/api/playlists", playlist::playlist_routes())
        .nest("/api/stories", stories::story_routes())
        .nest("/api/reels", reels::reel_routes())
        .nest("/api/groups", groups::group_routes())
        .nest("/api/events", events::event_routes())
        .nest("/api/pages", pages::page_routes())
        .nest("/api/ads", ads::ad_routes())
        .nest("/api/stats", stats::stats_routes())
        .nest("/api/follows", follows::follows_routes())
        .nest("/api/timetable", timetable::timetable_routes())
        .nest("/api/confessions", confessions::confessions_routes())
        .nest("/api/admin", admin::admin_routes())
        .with_state(state)
}

async fn health_check() -> &'static str {
    "KaruTeens Backend is Running!"
}
