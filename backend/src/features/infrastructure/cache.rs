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

    pub async fn publish<T: Serialize>(&self, channel: &str, message: &T) -> bool {
        let mut conn = self.conn.clone();
        match serde_json::to_string(message) {
            Ok(json) => {
                let res = tokio::time::timeout(
                    std::time::Duration::from_secs(2),
                    async {
                        let _: Result<i64, _> = redis::cmd("PUBLISH")
                            .arg(channel)
                            .arg(json)
                            .query_async(&mut conn)
                            .await;
                    }
                ).await;
                res.is_ok()
            }
            Err(_) => false,
        }
    }

}

#[derive(Clone)]
pub struct CacheKeys;

impl CacheKeys {
    pub fn trending_topics() -> String {
        "topics:trending".to_string()
    }
}