use hmac::{Hmac, Mac};
use sha2::Sha256;
use base64::engine::general_purpose;
use base64::Engine;

type HmacSha256 = Hmac<Sha256>;

fn main() {
    // Get the actual key from .env file exactly as it appears
    let key_secret = "duzxgRDNCDe8AFbPTGQ0PAteShJAM49QjLhG7RyjAzQ";
    
    // Print the secret with visible markers
    println!("Key secret: '{}'", key_secret);
    println!("Key secret length: {}", key_secret.len());
    
    // Try to create HMAC with the exact secret
    match HmacSha256::new_from_slice(key_secret.as_bytes()) {
        Ok(mut mac_hasher) => {
            println!("HMAC created successfully");
            let sign_data = "test\n";
            mac_hasher.update(sign_data.as_bytes());
            let result = mac_hasher.finalize();
            let mac_base64 = general_purpose::STANDARD.encode(result.into_bytes());
            println!("MAC base64: {}", mac_base64);
        }
        Err(e) => {
            println!("Error creating HMAC: {}", e);
            // Let's check each byte
            for (i, b) in key_secret.as_bytes().iter().enumerate() {
                println!("Byte {}: {} (0x{:02x})", i, *b as char, *b);
            }
        }
    }
}
