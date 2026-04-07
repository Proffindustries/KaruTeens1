use mongodb::{bson::{doc, oid::ObjectId}, Client, options::ClientOptions};
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let uri = env::var("MONGO_URI").unwrap_or_else(|_| "mongodb://localhost:27017".to_string());
    let client_options = ClientOptions::parse(uri).await?;
    let client = Client::with_options(client_options)?;
    let db = client.database("karuteens");
    
    let total = db.collection::<mongodb::bson::Document>("posts").count_documents(None, None).await?;
    println!("Total posts: {}", total);
    
    let group_posts = db.collection::<mongodb::bson::Document>("posts").count_documents(doc! { "group_id": { "$ne": null } }, None).await?;
    println!("Group posts: {}", group_posts);
    
    let sample = db.collection::<mongodb::bson::Document>("posts").find_one(doc! { "group_id": { "$ne": null } }, None).await?;
    if let Some(s) = sample {
        println!("Sample group post group_id: {:?}", s.get("group_id"));
    }
    
    Ok(())
}
