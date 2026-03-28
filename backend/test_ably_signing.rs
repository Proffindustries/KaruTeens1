use hmac::{Hmac, Mac};
use sha2::Sha256;
use base64::engine::general_purpose;
use base64::Engine;
use chrono::Utc;
use uuid::Uuid;

type HmacSha256 = Hmac<Sha256>;

fn main() {
    // Test data matching what's in ably.rs
    let ably_api_key = "FJsROg.yxz1Bg:duzxgRDNCDe8AFbPTGQ0PAteShJAM49QjLhG7RyjAzQ";
    let parts: Vec<&str> = ably_api_key.split(':').collect();
    if parts.len() != 2 {
        println!("Invalid ABLY_API_KEY format");
        return;
    }
    
    let key_name = parts[0].trim();
    let key_secret = parts[1].trim();
    
    println!("Key name: {}", key_name);
    println!("Key secret: {}", key_secret);
    
    // Generate test values
    let client_id = "69ac7e603b5a0416bfbaf71f"; // From the logs
    let timestamp = Utc::now().timestamp_millis();
    let nonce = Uuid::new_v4().to_string().replace("-", "").to_lowercase();
    let capability = "{\"*\":[\"*\"]}";
    let ttl = "3600000"; // 1 hour in ms
    
    println!("Client ID: {}", client_id);
    println!("Timestamp: {}", timestamp);
    println!("Nonce: {}", nonce);
    println!("Capability: {}", capability);
    println!("TTL: {}", ttl);
    
    // Sign the token request
    let sign_data = format!(
        "{}\n{}\n{}\n{}\n{}\n{}\n",
        key_name, ttl, capability, client_id, timestamp, nonce
    );
    
    println!("Sign data: {}", sign_data);
    
    // Create HMAC
    let mut mac_hasher = match HmacSha256::new_from_slice(key_secret.as_bytes()) {
        Ok(m) => m,
        Err(e) => {
            println!("Error creating HMAC: {}", e);
            return;
        }
    };
    mac_hasher.update(sign_data.as_bytes());
    let mac_base64 = general_purpose::STANDARD.encode(mac_hasher.finalize().into_bytes());
    
    println!("MAC base64: {}", mac_base64);
    
    // Show what would be returned
    println!("\nExpected response:");
    println!("{{");
    println!("  \"keyName\": \"{}\",", key_name);
    println!("  \"nonce\": \"{}\",", nonce);
    println!("  \"timestamp\": {},", timestamp);
    println!("  \"capability\": \"{}\",", capability);
    println!("  \"clientId\": \"{}\",", client_id);
    println!("  \"ttl\": 3600000,");
    println!("  \"mac\": \"{}\"", mac_base64);
    println!("}}");
}
