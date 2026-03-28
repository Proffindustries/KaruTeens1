use std::env;
use std::sync::Arc;

fn main() {
    // Initialize logger
    println!("Testing ABLY_API_KEY reading...");
    
    // Load .env file manually
    let ably_key = env::var("ABLY_API_KEY").unwrap_or_else(|_| "NOT_SET".to_string());
    println!("ABLY_API_KEY from env: '{}'", ably_key);
    
    if ably_key == "NOT_SET" {
        println!("ABLY_API_KEY is not set in environment");
        return;
    }
    
    // Check if it's empty
    let trimmed = ably_key.trim();
    println!("Trimmed ABLY_API_KEY: '{}'", trimmed);
    println!("Length: {}", trimmed.len());
    
    // Split by colon
    let parts: Vec<&str> = trimmed.split(':').collect();
    println!("Parts count: {}", parts.len());
    
    if parts.len() != 2 {
        println!("ERROR: Expected exactly 2 parts separated by ':', got {}", parts.len());
        return;
    }
    
    let key_name = parts[0].trim();
    let key_secret = parts[1].trim();
    
    println!("Key name: '{}'", key_name);
    println!("Key secret: '{}'", key_secret);
    println!("Key secret length: {}", key_secret.len());
    println!("Key secret is empty: {}", key_secret.is_empty());
    
    if key_secret.is_empty() {
        println!("ERROR: Key secret is empty after trimming");
        return;
    }
    
    println!("SUCCESS: ABLY_API_KEY appears to be valid");
}
