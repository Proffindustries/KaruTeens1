use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct CdnConfig {
    pub base_url: String,
    pub cdn_enabled: bool,
    pub image_optimization: bool,
    pub cache_ttl: u64,
}

impl CdnConfig {
    pub fn from_env() -> Self {
        let cdn_url = std::env::var("CDN_URL").unwrap_or_default();
        let cdn_enabled = !cdn_url.is_empty();

        Self {
            base_url: if cdn_enabled {
                cdn_url
            } else {
                std::env::var("MEDIA_URL").unwrap_or_else(|_| "/media".to_string())
            },
            cdn_enabled,
            image_optimization: std::env::var("CDN_IMAGE_OPTIMIZATION")
                .map(|v| v == "true")
                .unwrap_or(true),
            cache_ttl: std::env::var("CDN_CACHE_TTL")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(86400), // 24 hours default
        }
    }

    pub fn get_media_url(&self, path: &str) -> String {
        if self.cdn_enabled {
            format!(
                "{}/{}",
                self.base_url.trim_end_matches('/'),
                path.trim_start_matches('/')
            )
        } else {
            path.to_string()
        }
    }

    pub fn get_optimized_image_url(&self, path: &str, width: u32, height: u32) -> String {
        if self.cdn_enabled && self.image_optimization {
            // For CDNs that support image transformations
            format!(
                "{}/{}?w={}&h={}&q=80&fm=webp",
                self.base_url.trim_end_matches('/'),
                path.trim_start_matches('/'),
                width,
                height
            )
        } else {
            self.get_media_url(path)
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CdnUploadResponse {
    pub url: String,
    pub thumbnail_url: Option<String>,
    pub cdn: bool,
}

pub fn get_cache_headers(ttl: u64) -> Vec<(&'static str, String)> {
    vec![
        (
            "Cache-Control",
            format!("public, max-age={}, s-maxage={}", ttl, ttl),
        ),
        ("Vary", "Accept-Encoding, Origin".to_string()),
    ]
}
