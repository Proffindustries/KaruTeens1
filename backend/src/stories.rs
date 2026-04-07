use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use crate::db::AppState;
use crate::models::{
    Story, StoryView, StoryReply, UserStoryStats,
    StoryReport, StoryModeration, StorySchedule, StoryTemplate,
    User, Profile, Location
};
use crate::dto::{
    StoryResponse, StoryModerationQueueResponse, UserStoryStatsResponse,
    CreateStoryRequest, UpdateStoryRequest, CreateStoryViewRequest,
    CreateStoryReplyRequest, CreateStoryReportRequest, ModerateStoryRequest,
    StoryFilter, CreateStoryScheduleRequest, CreateStoryTemplateRequest
};
use crate::error::{AppResult, AppError};
use crate::auth::AuthUser;
use crate::utils::check_admin;
use futures::stream::StreamExt;

// --- Handlers ---

pub async fn get_stories_feed_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> AppResult<impl IntoResponse> {
    let stories_coll = state.mongo.collection::<Story>("stories");
    let profiles_coll = state.mongo.collection::<Profile>("profiles");

    let now = DateTime::now();
    let query = doc! {
        "expires_at": { "$gt": now },
        "is_deleted": false,
        "moderation_status": { "$in": ["approved", "pending"] },
        "$or": [
            { "is_private": false },
            { "user_id": user.user_id },
            { "allowed_users": user.user_id }
        ]
    };

    let find_options = mongodb::options::FindOptions::builder()
        .sort(doc! { "created_at": -1 })
        .build();

    let mut cursor = stories_coll.find(query, find_options).await?;

    let mut stories_by_user: std::collections::HashMap<ObjectId, Vec<serde_json::Value>> = std::collections::HashMap::new();
    let mut user_ids = std::collections::HashSet::new();

    while let Some(story_res) = cursor.next().await {
        if let Ok(s) = story_res {
            user_ids.insert(s.user_id);
            let rid = s.id.unwrap().to_hex();
            let story_val = json!({
                "id": rid.clone(),
                "media_url": s.media_url,
                "media_type": s.media_type,
                "caption": s.caption,
                "created_at": s.created_at.to_chrono().to_rfc3339(),
                "expires_at": s.expires_at.to_chrono().to_rfc3339(),
                "is_nsfw": s.is_nsfw,
                "is_viewed": false,
            });
            stories_by_user.entry(s.user_id).or_default().push(story_val);
        }
    }

    // Fetch user profiles for avatars
    let mut profiles_cursor = profiles_coll.find(doc! { "user_id": { "$in": user_ids.into_iter().collect::<Vec<_>>() } }, None).await?;
    
    let mut profile_map = std::collections::HashMap::new();
    while let Some(profile_res) = profiles_cursor.next().await {
        if let Ok(p) = profile_res {
            profile_map.insert(p.user_id, p);
        }
    }

    let mut response_data = Vec::new();
    for (user_id, stories) in stories_by_user {
        let profile = profile_map.get(&user_id);
        response_data.push(json!({
            "user_id": user_id.to_hex(),
            "username": profile.map(|p| p.username.clone()).unwrap_or_else(|| "Unknown".to_string()),
            "avatar_url": profile.and_then(|p| p.avatar_url.clone()),
            "stories": stories,
            "has_unviewed": true
        }));
    }

    Ok((StatusCode::OK, Json(response_data)))
}

pub async fn create_story_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateStoryRequest>,
) -> AppResult<impl IntoResponse> {
    let stories_coll = state.mongo.collection::<Story>("stories");
    let profiles_coll = state.mongo.collection::<Profile>("profiles");

    let profile = profiles_coll.find_one(doc! { "user_id": user.user_id }, None).await?
        .ok_or(AppError::NotFound("User profile not found".to_string()))?;

    let now = DateTime::now();
    let expires_at = DateTime::from_millis(now.timestamp_millis() + 24 * 60 * 60 * 1000);

    let mut allowed_user_ids = Vec::new();
    if let Some(ids) = payload.allowed_users {
        for id_str in ids {
            if let Ok(oid) = ObjectId::parse_str(&id_str) {
                allowed_user_ids.push(oid);
            }
        }
    }

    let new_story = Story {
        id: None,
        user_id: user.user_id,
        username: profile.username,
        user_avatar: profile.avatar_url,
        media_url: payload.media_url,
        media_type: payload.media_type,
        caption: payload.caption,
        location: payload.location,
        hashtags: payload.hashtags,
        mentions: payload.mentions,
        is_highlight: payload.is_highlight.unwrap_or(false),
        highlight_category: payload.highlight_category,
        created_at: now,
        expires_at,
        is_deleted: false,
        deleted_at: None,
        deleted_by: None,
        deleted_reason: None,
        moderation_status: "approved".to_string(),
        moderation_notes: None,
        spam_score: None,
        sentiment_score: None,
        reported_count: 0,
        view_count: 0,
        reply_count: 0,
        engagement_score: 0.0,
        is_private: payload.is_private.unwrap_or(false),
        allowed_users: if allowed_user_ids.is_empty() { None } else { Some(allowed_user_ids) },
        story_type: payload.story_type.unwrap_or_else(|| "normal".to_string()),
        story_data: payload.story_data,
        updated_at: now,
        is_nsfw: payload.is_nsfw.unwrap_or(false),
    };

    let result = stories_coll.insert_one(new_story, None).await?;

    Ok((StatusCode::CREATED, Json(json!({
        "id": result.inserted_id.as_object_id().unwrap().to_hex(),
        "message": "Story created successfully"
    }))))
}

pub async fn mark_story_viewed_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(story_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&story_id).map_err(|_| AppError::BadRequest("Invalid story ID".to_string()))?;

    let stories = state.mongo.collection::<Story>("stories");
    let views = state.mongo.collection::<StoryView>("story_views");
    let profiles = state.mongo.collection::<Profile>("profiles");

    let _story = stories.find_one(doc! { "_id": oid, "is_deleted": false }, None).await?
        .ok_or(AppError::NotFound("Story not found".to_string()))?;

    let existing_view = views.find_one(doc! { "story_id": oid, "viewer_id": user.user_id }, None).await?;

    if existing_view.is_none() {
        let profile = profiles.find_one(doc! { "user_id": user.user_id }, None).await?;

        let new_view = StoryView {
            id: None,
            story_id: oid,
            viewer_id: user.user_id,
            viewer_username: profile.as_ref().map(|p| p.username.clone()).unwrap_or_else(|| "Unknown".to_string()),
            viewer_avatar: profile.and_then(|p| p.avatar_url),
            viewed_at: DateTime::now(),
            view_duration: None,
            is_replay: false,
            location: None,
            device_info: None,
        };

        views.insert_one(new_view, None).await?;

        stories.update_one(
            doc! { "_id": oid },
            doc! { "$inc": { "view_count": 1 } },
            None
        ).await?;
    }

    Ok((StatusCode::OK, Json(json!({"message": "Story marked as viewed"}))))
}

pub async fn get_user_stories_handler(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(target_user_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&target_user_id).map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let stories_coll = state.mongo.collection::<Story>("stories");
    let now = DateTime::now();

    let query = doc! {
        "user_id": oid,
        "expires_at": { "$gt": now },
        "is_deleted": false,
        "moderation_status": "approved"
    };

    let find_options = mongodb::options::FindOptions::builder()
        .sort(doc! { "created_at": -1 })
        .build();

    let mut cursor = stories_coll.find(query, find_options).await?;

    let mut user_stories = Vec::new();
    while let Some(story_res) = cursor.next().await {
        if let Ok(s) = story_res {
            user_stories.push(json!({
                "id": s.id.unwrap().to_hex(),
                "media_url": s.media_url,
                "media_type": s.media_type,
                "caption": s.caption,
                "created_at": s.created_at.to_chrono().to_rfc3339(),
                "expires_at": s.expires_at.to_chrono().to_rfc3339(),
            }));
        }
    }

    Ok((StatusCode::OK, Json(user_stories)))
}

pub async fn get_story_viewers_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(story_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let oid = ObjectId::parse_str(&story_id).map_err(|_| AppError::BadRequest("Invalid story ID".to_string()))?;

    let stories = state.mongo.collection::<Story>("stories");
    let views = state.mongo.collection::<StoryView>("story_views");

    let story = stories.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Story not found".to_string()))?;

    if story.user_id != user.user_id {
        return Err(AppError::Forbidden("Only creator can view story viewers".to_string()));
    }

    let mut cursor = views.find(doc! { "story_id": oid }, None).await?;

    let mut viewers = Vec::new();
    while let Some(view_res) = cursor.next().await {
        if let Ok(v) = view_res {
            viewers.push(json!({
                "viewer_id": v.viewer_id.to_hex(),
                "username": v.viewer_username,
                "viewed_at": v.viewed_at.to_chrono().to_rfc3339(),
            }));
        }
    }

    Ok((StatusCode::OK, Json(viewers)))
}

pub async fn list_stories_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<StoryFilter>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let stories = state.mongo.collection::<Story>("stories");
    
    let mut query = doc! {};
    
    if let Some(status) = &params.status { query.insert("moderation_status", status); }
    if let Some(user_id_str) = &params.user_id {
        let oid = ObjectId::parse_str(user_id_str).map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;
        query.insert("user_id", oid);
    }
    if let Some(media_type) = &params.media_type { query.insert("media_type", media_type); }
    if let Some(story_type) = &params.story_type { query.insert("story_type", story_type); }
    if let Some(is_highlight) = params.is_highlight { query.insert("is_highlight", is_highlight); }
    if let Some(is_private) = params.is_private { query.insert("is_private", is_private); }

    let sort_by = params.sort_by.unwrap_or_else(|| "created_at".to_string());
    let sort_order = params.sort_order.unwrap_or_else(|| "desc".to_string());
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(20);
    let skip = (page - 1) * limit;

    let sort_doc = match sort_order.as_str() {
        "desc" => doc! { sort_by: -1 },
        _ => doc! { sort_by: 1 },
    };

    let total_count = stories.count_documents(query.clone(), None).await?;

    let find_options = mongodb::options::FindOptions::builder()
        .sort(sort_doc)
        .skip(Some(skip as u64))
        .limit(Some(limit))
        .build();

    let mut cursor = stories.find(query, find_options).await?;

    let mut paginated_stories = Vec::new();
    while let Some(story_res) = cursor.next().await {
        if let Ok(s) = story_res {
            let story_info: crate::dto::StoryResponse = build_story_response(&s, &state).await?;
            paginated_stories.push(story_info);
        }
    }

    Ok((StatusCode::OK, Json(json!({
        "stories": paginated_stories,
        "pagination": {
            "current_page": page,
            "total_pages": (total_count as f64 / limit as f64).ceil() as i64,
            "total_items": total_count,
            "items_per_page": limit,
            "has_next": (skip + limit) < total_count as i64,
            "has_prev": page > 1
        }
    }))))
}

pub async fn get_story_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(story_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&story_id).map_err(|_| AppError::BadRequest("Invalid story ID".to_string()))?;

    let stories = state.mongo.collection::<Story>("stories");
    let story = stories.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Story not found".to_string()))?;

    let story_info: crate::dto::StoryResponse = build_story_response(&story, &state).await?;
    Ok((StatusCode::OK, Json(story_info)))
}

pub async fn moderate_story_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(story_id): Path<String>,
    Json(payload): Json<ModerateStoryRequest>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&story_id).map_err(|_| AppError::BadRequest("Invalid story ID".to_string()))?;

    let stories = state.mongo.collection::<Story>("stories");
    let story = stories.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Story not found".to_string()))?;

    let mut update_doc = doc! {};
    let mut new_status = story.moderation_status.clone();

    match payload.action.as_str() {
        "approve" => {
            new_status = "approved".to_string();
            update_doc.insert("moderation_status", "approved");
            update_doc.insert("moderation_notes", payload.notes.clone());
        },
        "reject" => {
            new_status = "rejected".to_string();
            update_doc.insert("moderation_status", "rejected");
            update_doc.insert("moderation_notes", payload.reason.clone());
        },
        "delete" => {
            new_status = "removed".to_string();
            update_doc.insert("moderation_status", "removed");
            update_doc.insert("is_deleted", true);
            update_doc.insert("deleted_at", DateTime::now());
            update_doc.insert("deleted_by", user.user_id);
            update_doc.insert("deleted_reason", payload.reason.clone());
            update_doc.insert("moderation_notes", payload.notes.clone());
        },
        "edit" => {
            if let Some(new_caption) = &payload.after_caption {
                update_doc.insert("caption", new_caption);
            }
            update_doc.insert("moderation_notes", payload.notes.clone());
        },
        "warn" => {
            update_doc.insert("moderation_notes", format!("Warning: {}", payload.reason.clone().unwrap_or_default()));
        },
        _ => return Err(AppError::BadRequest("Invalid moderation action".to_string())),
    }

    update_doc.insert("updated_at", DateTime::now());

    stories.update_one(doc! { "_id": oid }, doc! { "$set": update_doc }, None).await?;

    let moderation = state.mongo.collection::<StoryModeration>("story_moderation");
    let moderation_record = StoryModeration {
        id: None,
        story_id: oid,
        moderator_id: user.user_id,
        moderator_name: "Admin".to_string(),
        action: payload.action,
        reason: payload.reason,
        notes: payload.notes,
        created_at: DateTime::now(),
    };

    moderation.insert_one(moderation_record, None).await?;

    update_user_story_stats(&state, story.user_id).await?;

    Ok((StatusCode::OK, Json(json!({"message": format!("Story {} successfully", new_status)}))))
}

pub async fn delete_story_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(story_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&story_id).map_err(|_| AppError::BadRequest("Invalid story ID".to_string()))?;

    let stories = state.mongo.collection::<Story>("stories");
    
    let story = stories.find_one(doc! { "_id": oid }, None).await?
        .ok_or(AppError::NotFound("Story not found".to_string()))?;

    stories.update_one(
        doc! { "_id": oid },
        doc! { 
            "$set": { 
                "moderation_status": "removed",
                "is_deleted": true,
                "deleted_at": DateTime::now(),
                "deleted_by": user.user_id,
                "deleted_reason": "Admin deletion",
                "updated_at": DateTime::now()
            }
        },
        None
    ).await?;

    update_user_story_stats(&state, story.user_id).await?;

    Ok((StatusCode::OK, Json(json!({"message": "Story deleted successfully"}))))
}

pub async fn get_moderation_queue_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<StoryFilter>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let stories = state.mongo.collection::<Story>("stories");
    
    let mut query = doc! {
        "$or": [
            doc! { "moderation_status": "pending" },
            doc! { "moderation_status": "rejected" },
            doc! { "reported_count": { "$gt": 0 } }
        ]
    };
    
    if let Some(media_type) = &params.media_type { query.insert("media_type", media_type); }

    let mut cursor = stories.find(query, None).await?;

    let mut queue_items = Vec::new();
    while let Some(story_res) = cursor.next().await {
        if let Ok(s) = story_res {
            queue_items.push(StoryModerationQueueResponse {
                id: s.id.unwrap().to_hex(),
                story_id: s.id.unwrap().to_hex(),
                user_id: s.user_id.to_hex(),
                username: s.username,
                media_url: s.media_url,
                caption: s.caption,
                media_type: s.media_type,
                status: s.moderation_status,
                spam_score: s.spam_score.unwrap_or(0.0),
                sentiment_score: s.sentiment_score.unwrap_or(0.0),
                reported_count: s.reported_count,
                priority: determine_priority(s.spam_score.unwrap_or(0.0), s.reported_count),
                assigned_to: None,
                assigned_at: None,
                created_at: s.created_at.to_chrono().to_rfc3339(),
            });
        }
    }

    Ok((StatusCode::OK, Json(queue_items)))
}

pub async fn get_user_story_stats_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(user_id_str): Path<String>,
) -> AppResult<impl IntoResponse> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&user_id_str).map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let stats = state.mongo.collection::<UserStoryStats>("user_story_stats");
    let user_stats = stats.find_one(doc! { "user_id": oid }, None).await?;

    if let Some(stats) = user_stats {
        let stats_response = UserStoryStatsResponse {
            user_id: stats.user_id.to_hex(),
            username: stats.username,
            total_stories: stats.total_stories,
            active_stories: stats.active_stories,
            expired_stories: stats.expired_stories,
            highlights: stats.highlights,
            total_views: stats.total_views,
            total_replies: stats.total_replies,
            avg_completion_rate: stats.avg_completion_rate,
            avg_engagement_rate: stats.avg_engagement_rate,
            avg_view_duration: stats.avg_view_duration,
            last_story_at: stats.last_story_at.map(|dt| dt.to_chrono().to_rfc3339()),
            created_at: stats.created_at.to_chrono().to_rfc3339(),
            updated_at: stats.updated_at.to_chrono().to_rfc3339(),
        };
        Ok((StatusCode::OK, Json(stats_response)))
    } else {
        Err(AppError::NotFound("User stats not found".to_string()))
    }
}

// --- Helper Functions ---

async fn build_story_response(
    story: &Story,
    state: &Arc<AppState>,
) -> AppResult<StoryResponse> {
    let sid = story.id.unwrap();
    
    let views_coll = state.mongo.collection::<StoryView>("story_views");
    let replies_coll = state.mongo.collection::<StoryReply>("story_replies");
    let reports_coll = state.mongo.collection::<StoryReport>("story_reports");
    let mod_history_coll = state.mongo.collection::<StoryModeration>("story_moderation");
    
    let (views_res, replies_res, reports_res, moderation_res) = tokio::try_join!(
        views_coll.find(doc! { "story_id": sid }, None),
        replies_coll.find(doc! { "story_id": sid }, None),
        reports_coll.find(doc! { "story_id": sid }, None),
        mod_history_coll.find(doc! { "story_id": sid }, None),
    )?;

    let mut views = Vec::new();
    let mut cursor = views_res;
    while let Some(Ok(v)) = cursor.next().await { views.push(v); }

    let mut replies = Vec::new();
    let mut cursor = replies_res;
    while let Some(Ok(r)) = cursor.next().await { replies.push(r); }

    let mut reports = Vec::new();
    let mut cursor = reports_res;
    while let Some(Ok(r)) = cursor.next().await { reports.push(r); }

    let mut moderation_history = Vec::new();
    let mut cursor = moderation_res;
    while let Some(Ok(m)) = cursor.next().await { moderation_history.push(m); }

    Ok(StoryResponse {
        id: sid.to_hex(),
        user_id: story.user_id.to_hex(),
        username: story.username.clone(),
        user_avatar: story.user_avatar.clone(),
        media_url: story.media_url.clone(),
        media_type: story.media_type.clone(),
        caption: story.caption.clone(),
        location: story.location.clone(),
        hashtags: story.hashtags.clone(),
        mentions: story.mentions.clone(),
        is_highlight: story.is_highlight,
        highlight_category: story.highlight_category.clone(),
        created_at: story.created_at.to_chrono().to_rfc3339(),
        expires_at: story.expires_at.to_chrono().to_rfc3339(),
        is_deleted: story.is_deleted,
        deleted_at: story.deleted_at.map(|dt| dt.to_chrono().to_rfc3339()),
        deleted_by: story.deleted_by.map(|id| id.to_hex()),
        deleted_reason: story.deleted_reason.clone(),
        moderation_status: story.moderation_status.clone(),
        moderation_notes: story.moderation_notes.clone(),
        spam_score: story.spam_score,
        sentiment_score: story.sentiment_score,
        reported_count: story.reported_count,
        view_count: story.view_count,
        reply_count: story.reply_count,
        engagement_score: story.engagement_score,
        is_private: story.is_private,
        allowed_users: story.allowed_users.clone().map(|ids| ids.iter().map(|id| id.to_hex()).collect()),
        story_type: story.story_type.clone(),
        story_data: story.story_data.clone(),
        updated_at: story.updated_at.to_chrono().to_rfc3339(),
        views: Some(views.iter().map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null)).collect()),
        replies: Some(replies.iter().map(|r| serde_json::to_value(r).unwrap_or(serde_json::Value::Null)).collect()),
        reports: Some(reports.iter().map(|r| serde_json::to_value(r).unwrap_or(serde_json::Value::Null)).collect()),
        moderation_history: Some(moderation_history.iter().map(|m| serde_json::to_value(m).unwrap_or(serde_json::Value::Null)).collect()),
    })
}

async fn update_user_story_stats(
    state: &Arc<AppState>,
    user_id: ObjectId,
) -> AppResult<()> {
    let stories = state.mongo.collection::<Story>("stories");
    
    let total_stories = stories.count_documents(doc! { "user_id": user_id }, None).await?;
    let active_stories = stories.count_documents(doc! { "user_id": user_id, "is_deleted": false, "expires_at": { "$gt": DateTime::now() } }, None).await?;
    let expired_stories = stories.count_documents(doc! { "user_id": user_id, "is_deleted": false, "expires_at": { "$lt": DateTime::now() } }, None).await?;
    let highlights = stories.count_documents(doc! { "user_id": user_id, "is_highlight": true }, None).await?;

    let mut cursor = stories.find(doc! { "user_id": user_id }, None).await?;
    let mut total_views = 0;
    let mut total_replies = 0;
    while let Some(Ok(s)) = cursor.next().await {
        total_views += s.view_count;
        total_replies += s.reply_count;
    }

    let profile = state.mongo.collection::<Profile>("profiles").find_one(doc! { "user_id": user_id }, None).await?
        .ok_or(AppError::NotFound("Profile not found".to_string()))?;

    let stats = UserStoryStats {
        id: None,
        user_id,
        username: profile.username,
        total_stories: total_stories as i32,
        active_stories: active_stories as i32,
        expired_stories: expired_stories as i32,
        highlights: highlights as i32,
        total_views: total_views as i32,
        total_replies: total_replies as i32,
        avg_completion_rate: 0.0,
        avg_engagement_rate: 0.0,
        avg_view_duration: 0.0,
        last_story_at: None,
        created_at: DateTime::now(),
        updated_at: DateTime::now(),
    };

    state.mongo.collection::<UserStoryStats>("user_story_stats")
        .update_one(doc! { "user_id": user_id }, doc! { "$set": mongodb::bson::to_document(&stats).unwrap() }, Some(mongodb::options::UpdateOptions::builder().upsert(true).build()))
        .await?;

    Ok(())
}

fn determine_priority(spam_score: f64, reported_count: i32) -> i32 {
    if spam_score > 0.8 || reported_count > 5 { 1 }
    else if spam_score > 0.5 || reported_count > 2 { 2 }
    else { 3 }
}

pub fn story_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/feed", get(get_stories_feed_handler))
        .route("/", get(list_stories_handler).post(create_story_handler))
        .route("/:id", get(get_story_handler).delete(delete_story_handler))
        .route("/:id/view", post(mark_story_viewed_handler))
        .route("/:id/viewers", get(get_story_viewers_handler))
        .route("/user/:user_id", get(get_user_stories_handler))
        .route("/:id/moderate", post(moderate_story_handler))
        .route("/queue", get(get_moderation_queue_handler))
        .route("/stats/:user_id", get(get_user_story_stats_handler))
}
