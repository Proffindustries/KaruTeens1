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


