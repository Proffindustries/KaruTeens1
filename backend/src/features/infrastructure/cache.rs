use redis::{aio::ConnectionManager, AsyncCommands};
use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct CacheService {
    conn: ConnectionManager,
}

impl CacheService {
    pub fn new(conn: ConnectionManager) -> Self {
        Self { conn }
    }

    pub async fn get<T: for<'de> Deserialize<'de>>(&self, key: &str) -> Option<T> {
        let mut conn = self.conn.clone();
        let res = tokio::time::timeout(
            std::time::Duration::from_secs(2),
            conn.get::<_, Option<String>>(key)
        ).await;

        match res {
            Ok(Ok(Some(value))) => serde_json::from_str::<T>(&value).ok(),
            _ => None,
        }
    }

    pub async fn set<T: Serialize>(&self, key: &str, value: &T, ttl_seconds: u64) -> bool {
        let mut conn = self.conn.clone();
        match serde_json::to_string(value) {
            Ok(json) => {
                let res = tokio::time::timeout(
                    std::time::Duration::from_secs(2),
                    conn.set_ex::<&str, String, ()>(key, json, ttl_seconds)
                ).await;

                match res {
                    Ok(Ok(_)) => true,
                    _ => false,
                }
            }
            Err(_) => false,
        }
    }

    pub async fn delete(&self, key: &str) -> bool {
        let mut conn = self.conn.clone();
        match conn.del::<&str, ()>(key).await {
            Ok(_) => true,
            Err(_) => false,
        }
    }

    pub async fn exists(&self, key: &str) -> bool {
        let mut conn = self.conn.clone();
        match conn.exists::<&str, bool>(key).await {
            Ok(exists) => exists,
            Err(_) => false,
        }
    }

    pub async fn invalidate_pattern(&self, pattern: &str) -> bool {
        let mut conn = self.conn.clone();
        let mut cursor = 0u64;
        loop {
            let (next_cursor, keys): (u64, Vec<String>) = match redis::cmd("SCAN")
                .arg(cursor)
                .arg("MATCH")
                .arg(pattern)
                .arg("COUNT")
                .arg(100)
                .query_async(&mut conn)
                .await
            {
                Ok(result) => result,
                Err(_) => break,
            };

            if !keys.is_empty() {
                let _: Vec<()> = redis::cmd("DEL")
                    .arg(&keys)
                    .query_async(&mut conn)
                    .await
                    .unwrap_or_default();
            }

            cursor = next_cursor;
            if cursor == 0 {
                break;
            }
        }
        true
    }

    pub async fn increment(&self, key: &str) -> i64 {
        let mut conn = self.conn.clone();
        match conn.incr::<&str, i64, i64>(key, 1).await {
            Ok(count) => count,
            Err(_) => 0,
        }
    }

    pub async fn publish<T: Serialize>(&self, channel: &str, message: &T) -> bool {
        let mut conn = self.conn.clone();
        match serde_json::to_string(message) {
            Ok(json) => {
                let _: Result<i64, _> = redis::cmd("PUBLISH")
                    .arg(channel)
                    .arg(json)
                    .query_async(&mut conn)
                    .await;
                true
            }
            Err(_) => false,
        }
    }

    pub async fn get_with_ttl(&self, key: &str) -> (Option<String>, Option<i64>) {
        let mut conn = self.conn.clone();
        let result: (Option<String>, Option<i64>) = redis::cmd("GETEX")
            .arg(key)
            .arg("EX")
            .query_async(&mut conn)
            .await
            .unwrap_or((None, None));
        result
    }
}

#[derive(Clone)]
pub struct CacheKeys;

impl CacheKeys {
    pub fn user(id: &str) -> String {
        format!("user:{}", id)
    }

    pub fn profile(id: &str) -> String {
        format!("profile:{}", id)
    }

    pub fn post(id: &str) -> String {
        format!("post:{}", id)
    }

    pub fn feed() -> String {
        "feed:latest".to_string()
    }

    pub fn for_you_feed(user_id: &str) -> String {
        format!("feed:for-you:{}", user_id)
    }

    pub fn trending_posts() -> String {
        "posts:trending".to_string()
    }

    pub fn trending_topics() -> String {
        "topics:trending".to_string()
    }

    pub fn group(id: &str) -> String {
        format!("group:{}", id)
    }

    pub fn event(id: &str) -> String {
        format!("event:{}", id)
    }

    pub fn marketplace_item(id: &str) -> String {
        format!("marketplace:{}", id)
    }

    pub fn user_posts(user_id: &str) -> String {
        format!("user:{}:posts", user_id)
    }

    pub fn notifications(user_id: &str) -> String {
        format!("notifications:{}", user_id)
    }

    pub fn rate_limit(key: &str) -> String {
        format!("ratelimit:{}", key)
    }
}

#[derive(Serialize, Deserialize)]
pub struct CachedResponse<T> {
    pub data: T,
    pub cached_at: i64,
    pub ttl: u64,
}

impl<T> CachedResponse<T> {
    pub fn new(data: T, ttl_seconds: u64) -> Self {
        Self {
            data,
            cached_at: chrono::Utc::now().timestamp(),
            ttl: ttl_seconds,
        }
    }

    pub fn is_expired(&self) -> bool {
        let now = chrono::Utc::now().timestamp();
        (now - self.cached_at) > self.ttl as i64
    }
}