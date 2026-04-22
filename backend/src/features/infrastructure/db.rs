use mongodb::{options::{ClientOptions, IndexOptions}, Client, Database, IndexModel};
use dashmap::DashMap;
use tokio::sync::mpsc;
use axum::extract::ws::Message;
use mongodb::bson::oid::ObjectId;
use redis::{Client as RedisClient, AsyncCommands};
use redis::aio::ConnectionManager;
use std::env;
use std::sync::Arc;
use crate::features::infrastructure::cache::CacheService;

#[derive(Clone)]
pub struct AppState {
    pub mongo: Database,
    pub redis: ConnectionManager,
    pub cache: CacheService,
    pub redis_url: String,
    pub jwt_secret: String,
    pub ws_connections: Arc<DashMap<ObjectId, Vec<mpsc::UnboundedSender<Message>>>>,
    pub mpesa_token: Arc<DashMap<String, (String, i64)>>,
    pub ai_models: Arc<DashMap<String, Vec<serde_json::Value>>>,
    pub model_health: Arc<DashMap<String, serde_json::Value>>,
    pub http_client: reqwest::Client,
    pub brevo_api_key: String,
    pub redis_presence_ttl: u64,
    pub redis_mongo_update_ttl: u64,
}

pub async fn init_mongo() -> Database {
    let client_uri = env::var("MONGO_URI").unwrap_or_else(|_| {
        eprintln!("❌ MONGO_URI is missing. Please check your environment variables.");
        std::process::exit(1);
    });
    let mut options = ClientOptions::parse(&client_uri).await.expect("Failed to parse Mongo URI");
    
    // Increased pool sizes for better concurrency
    options.max_pool_size = Some(env::var("MONGO_MAX_POOL_SIZE")
        .unwrap_or_else(|_| "200".to_string()) // Increased from 100
        .parse()
        .unwrap_or(200));
    options.min_pool_size = Some(env::var("MONGO_MIN_POOL_SIZE")
        .unwrap_or_else(|_| "20".to_string()) // Increased from 10
        .parse()
        .unwrap_or(20));
    
    // Connection timeout and idle time
    options.connect_timeout = Some(std::time::Duration::from_secs(10));
    options.max_idle_time = Some(std::time::Duration::from_secs(60)); // Increased from 30
    
    // Enable retry writes and reads for better resilience
    options.retry_writes = Some(true);
    options.retry_reads = Some(true);
    
    let client = Client::with_options(options).expect("Failed to create Mongo Client");
        
    // Ping the server to verify connection
    client
        .database("admin")
        .run_command(bson::doc! {"ping": 1}, None)
        .await
        .expect("Failed to ping MongoDB");
        
    println!("✅ Connected to MongoDB Atlas");
    let db = client.database("karuteens_db");

    // Enforce Compound Indexes
    tracing::info!("Ensuring database indexes...");
    
    // Posts Index: { author_id: 1, created_at: -1 }
    let posts_coll: mongodb::Collection<mongodb::bson::Document> = db.collection("posts");
    let post_index = IndexModel::builder()
        .keys(bson::doc! { "author_id": 1, "created_at": -1 })
        .options(IndexOptions::builder().background(Some(true)).build())
        .build();
    let _ = posts_coll.create_index(post_index, None).await;

    // Messages Index: { conversation_id: 1, created_at: -1 }
    let messages_coll: mongodb::Collection<mongodb::bson::Document> = db.collection("messages");
    let msg_index = IndexModel::builder()
        .keys(bson::doc! { "conversation_id": 1, "created_at": -1 })
        .options(IndexOptions::builder().background(Some(true)).build())
        .build();
    let _ = messages_coll.create_index(msg_index, None).await;

    tracing::info!("Database indexes verified.");
    
    db
}

pub async fn init_redis() -> ConnectionManager {
    let client_uri = env::var("REDIS_URL").unwrap_or_else(|_| {
        eprintln!("❌ REDIS_URL is missing. Please check your environment variables.");
        std::process::exit(1);
    });
    let client = RedisClient::open(client_uri).expect("Failed to create Redis Client");
    
    // Configure connection manager for better performance
    let connection_manager = ConnectionManager::new(client)
        .await
        .expect("Failed to create Redis connection manager");
    
     // Test basic connection
     let mut conn = connection_manager.clone();
     match conn.get::<&str, Option<String>>("ping_test").await {
         Ok(_) => println!("✅ Connected to Redis"),
         Err(e) => eprintln!("⚠️  Redis connection failed: {}", e),
     }
    
    connection_manager
}