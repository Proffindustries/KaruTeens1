use bson::doc;
use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct CacheConfig {
    pub trending_ttl: u64, // 5 minutes
    pub feed_ttl: u64,     // 1 minute
    pub profile_ttl: u64,  // 10 minutes
    pub user_ttl: u64,     // 15 minutes
    pub list_ttl: u64,     // 5 minutes
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            trending_ttl: 300, // 5 min
            feed_ttl: 60,      // 1 min
            profile_ttl: 600,  // 10 min
            user_ttl: 900,     // 15 min
            list_ttl: 300,     // 5 min
        }
    }
}

impl CacheConfig {
    pub fn from_env() -> Self {
        Self {
            trending_ttl: std::env::var("CACHE_TRENDING_TTL")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(300),
            feed_ttl: std::env::var("CACHE_FEED_TTL")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(60),
            profile_ttl: std::env::var("CACHE_PROFILE_TTL")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(600),
            user_ttl: std::env::var("CACHE_USER_TTL")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(900),
            list_ttl: std::env::var("CACHE_LIST_TTL")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(300),
        }
    }
}

pub struct CacheKeys;

impl CacheKeys {
    // Feed keys
    pub fn global_feed(page: i32) -> String {
        format!("feed:global:{}", page)
    }

    pub fn for_you_feed(user_id: &str, page: i32) -> String {
        format!("feed:foryou:{}:{}", user_id, page)
    }

    pub fn group_feed(group_id: &str, page: i32) -> String {
        format!("feed:group:{}:{}", group_id, page)
    }

    // Trending keys
    pub fn trending_posts(page: i32) -> String {
        format!("trending:posts:{}", page)
    }

    pub fn trending_topics() -> String {
        "trending:topics".to_string()
    }

    // Profile keys
    pub fn profile(user_id: &str) -> String {
        format!("profile:{}", user_id)
    }

    pub fn profile_username(username: &str) -> String {
        format!("profile:un:{}", username)
    }

    // User keys
    pub fn user(user_id: &str) -> String {
        format!("user:{}", user_id)
    }

    // List keys (for infinite scroll)
    pub fn user_posts(user_id: &str, page: i32) -> String {
        format!("user:{}:posts:{}", user_id, page)
    }

    pub fn comments(post_id: &str, page: i32) -> String {
        format!("comments:{}:{}", post_id, page)
    }

    pub fn notifications(user_id: &str, page: i32) -> String {
        format!("notifications:{}:{}", user_id, page)
    }

    // Invalidation patterns
    pub fn user_posts_pattern(user_id: &str) -> String {
        format!("user:{}:posts:*", user_id)
    }

    pub fn feed_pattern() -> String {
        "feed:*".to_string()
    }
}

pub struct QueryOptimizer;

impl QueryOptimizer {
    /// Batch fetch profiles in single query instead of N queries
    pub fn batch_get_profiles(
        profile_collection: &mongodb::Collection<mongodb::bson::Document>,
        user_ids: &[mongodb::bson::oid::ObjectId],
    ) -> mongodb::Collection<mongodb::bson::Document> {
        // This is handled in the query itself via $in operator
        // Just a placeholder for documentation
        std::hint::black_box(profile_collection);
        std::hint::black_box(user_ids);
        profile_collection.clone()
    }

    /// Optimize LIKE check - use $in query instead of individual checks
    pub fn build_like_check_query(
        user_id: mongodb::bson::oid::ObjectId,
        post_ids: &[mongodb::bson::oid::ObjectId],
    ) -> mongodb::bson::Document {
        doc! {
            "user_id": user_id,
            "post_id": { "$in": post_ids }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedPage<T> {
    pub data: Vec<T>,
    pub page: i32,
    pub has_more: bool,
    pub cached_at: i64,
}

impl<T> CachedPage<T> {
    pub fn new(data: Vec<T>, page: i32, page_size: i32) -> Self {
        Self {
            has_more: data.len() as i32 >= page_size,
            data,
            page,
            cached_at: chrono::Utc::now().timestamp(),
        }
    }

    pub fn is_fresh(&self, ttl_seconds: u64) -> bool {
        chrono::Utc::now().timestamp() - self.cached_at < ttl_seconds as i64
    }
}
