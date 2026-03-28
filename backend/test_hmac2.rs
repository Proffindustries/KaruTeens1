use hmac::{Hmac, Mac};
use sha2::Sha256;
use base64::engine::general_purpose;
use base64::Engine;

type HmacSha256 = Hmac<Sha256>;

fn main() {
    // Get the actual key from .env file
    let key_secret = "duzxgRDNCDe8AFbPTGQ0PAteShJAM49QjLhG7RyjAzQ";
    println!("Key secret: {}", key_secret);
    println!("Key secret length: {}", key_secret.len());
    
    // Check for whitespace
    let trimmed = key_secret.trim();
    println!("Trimmed: {}", trimmed);
    println!("Trimmed length: {}", trimmed.len());
    println!("Are they equal? {}", key_secret == trimmed);
    
    // Try to create HMAC
    let mut mac_hasher = match HmacSha256::new_from_slice(trimmed.as_bytes()) {
        Ok(m) => {
            println!("HMAC created successfully");
            m
        },
        Err(e) => {
            println!("Error creating HMAC: {}", e);
            return;
        }
    };
    
    let sign_data = "test\n";
    mac_hasher.update(sign_data.as_bytes());
    let result = mac_hasher.finalize();
    let mac_base64 = general_purpose::STANDARD.encode(result.into_bytes());
    println!("MAC base64: {}", mac_base64);
}
