use mongodb::{options::ClientOptions, Client, Database};
use dashmap::DashMap;
use tokio::sync::mpsc;
use axum::extract::ws::Message;
use mongodb::bson::oid::ObjectId;
use redis::Client as RedisClient;
use std::env;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub mongo: Database,
    pub redis: RedisClient,
    pub jwt_secret: String,
    pub ws_connections: Arc<DashMap<ObjectId, Vec<mpsc::UnboundedSender<Message>>>>,
    pub mpesa_token: Arc<DashMap<String, (String, i64)>>,
    pub ai_models: Arc<DashMap<String, Vec<serde_json::Value>>>, // "free" -> [...]
    pub model_health: Arc<DashMap<String, serde_json::Value>>, // id -> { status: "ok"|"fail", latency: 1.2 }
    pub http_client: reqwest::Client,
    pub brevo_api_key: String,
}

pub async fn init_mongo() -> Database {
    let client_uri = env::var("MONGO_URI").expect("MONGO_URI must be set");
    let options = ClientOptions::parse(&client_uri).await.expect("Failed to parse Mongo URI");
    let client = Client::with_options(options).expect("Failed to create Mongo Client");
    
    // Ping the server to verify connection
    client
        .database("admin")
        .run_command(bson::doc! {"ping": 1}, None)
        .await
        .expect("Failed to ping MongoDB");
        
    println!("✅ Connected to MongoDB Atlas");
    client.database("karuteens_db")
}

pub async fn init_redis() -> RedisClient {
    let client_uri = env::var("REDIS_URL").expect("REDIS_URL must be set");
    let client = RedisClient::open(client_uri).expect("Failed to create Redis Client");
    println!("✅ Connected to Redis");
    client
}
