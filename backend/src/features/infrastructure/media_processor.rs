use std::sync::Arc;
use tokio::time::{sleep, Duration};
use tokio::sync::Semaphore;
use crate::features::infrastructure::db::AppState;
use crate::models::MediaJobRecord;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::Path;
use tokio::fs;
use mongodb::bson::doc;
use chrono::Utc;

#[derive(Debug, Deserialize, Serialize)]
struct MediaJobQueueItem {
    job_id: String,
    temp_url: String,
    media_type: String,
    original_name: String,
    user_id: String,
}

pub fn spawn_media_worker(state: Arc<AppState>) {
    // Limit to 8 concurrent FFmpeg processes to prevent CPU/RAM exhaustion
    let semaphore = Arc::new(Semaphore::new(8));

    tokio::spawn(async move {
        tracing::info!("Media Worker started with concurrency limit of 8");
        let redis_url = state.redis_url.clone();
        
        loop {
            // Use a dedicated connection for blocking BLPOP instead of the shared manager
            let client = match redis::Client::open(redis_url.clone()) {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!("Failed to open Redis client for worker: {}", e);
                    sleep(Duration::from_secs(5)).await;
                    continue;
                }
            };

            let mut conn = match client.get_async_connection().await {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!("Failed to get Redis connection for worker: {}", e);
                    sleep(Duration::from_secs(5)).await;
                    continue;
                }
            };

            loop {
                let result: Result<(String, String), _> = redis::Cmd::blpop("media_queue", 10.0)
                    .query_async(&mut conn)
                    .await;

                match result {
                    Ok((_, job_json)) => {
                        if let Ok(job) = serde_json::from_str::<MediaJobQueueItem>(&job_json) {
                            let state_clone = state.clone();
                            let permit = semaphore.clone().acquire_owned().await;
                            
                            tokio::spawn(async move {
                                // The permit is held until this task finishes
                                let _permit = permit; 
                                if let Err(e) = process_media_job(state_clone, job).await {
                                    tracing::error!("Media job processing failed: {}", e);
                                }
                            });
                        }
                    }
                    Err(e) => {
                        tracing::error!("Redis queue error: {}", e);
                        // Break the inner loop to reconnect
                        break;
                    }
                }
            }
            sleep(Duration::from_secs(5)).await;
        }
    });
}

async fn process_media_job(state: Arc<AppState>, job: MediaJobQueueItem) -> anyhow::Result<()> {
    tracing::info!("Processing media job: {} ({})", job.job_id, job.media_type);
    
    let coll = state.mongo.collection::<MediaJobRecord>("media_jobs");

    // 1. Update status to "processing"
    coll.update_one(
        doc! { "_id": &job.job_id },
        doc! { "$set": { "status": "processing", "updated_at": Utc::now().timestamp() } },
        None
    ).await?;

    // 2. Download file to local temp
    let temp_dir = std::env::temp_dir().join(format!("media_{}", job.job_id));
    if let Err(e) = fs::create_dir_all(&temp_dir).await {
        mark_as_failed(&coll, &job.job_id, &format!("Failed to create temp dir: {}", e)).await?;
        return Err(e.into());
    }
    
    let input_path = temp_dir.join(&job.original_name);
    let download_res = async {
        let response = state.http_client.get(&job.temp_url).send().await?;
        let content = response.bytes().await?;
        fs::write(&input_path, content).await?;
        Ok::<(), anyhow::Error>(())
    }.await;

    if let Err(e) = download_res {
        mark_as_failed(&coll, &job.job_id, &format!("Download failed: {}", e)).await?;
        let _ = fs::remove_dir_all(&temp_dir).await;
        return Err(e);
    }

    // 3. Perform Analysis & Transformation
    let transform_res = match job.media_type.as_str() {
        "video" => process_video(&input_path, &temp_dir).await,
        "audio" | "voice_note" => process_audio(&input_path, &temp_dir, &job.media_type).await,
        _ => {
            tracing::warn!("Unsupported media type for processing: {}", job.media_type);
            Ok(())
        }
    };

    if let Err(e) = transform_res {
        mark_as_failed(&coll, &job.job_id, &format!("Transformation failed: {}", e)).await?;
        let _ = fs::remove_dir_all(&temp_dir).await;
        return Err(e);
    }

    // 4. Upload variants back to R2 (Final Step)
    // For now, we update the status to "completed"
    coll.update_one(
        doc! { "_id": &job.job_id },
        doc! { "$set": { "status": "completed", "updated_at": Utc::now().timestamp() } },
        None
    ).await?;

    tracing::info!("Job {} completed successfully", job.job_id);

    // 5. Cleanup
    let _ = fs::remove_dir_all(&temp_dir).await;
    
    Ok(())
}

async fn mark_as_failed(coll: &mongodb::Collection<MediaJobRecord>, job_id: &str, error: &str) -> anyhow::Result<()> {
    coll.update_one(
        doc! { "_id": job_id },
        doc! { "$set": { "status": "failed", "error": error, "updated_at": Utc::now().timestamp() } },
        None
    ).await?;
    Ok(())
}

async fn process_video(input: &Path, out_dir: &Path) -> anyhow::Result<()> {
    // Mobile 480p
    let out_480p = out_dir.join("video_480p.mp4");
    let status = Command::new("ffmpeg")
        .args(&[
            "-i", input.to_str().unwrap(),
            "-c:v", "libx264", "-crf", "28", "-preset", "fast",
            "-vf", "scale=w=854:h=480:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart",
            out_480p.to_str().unwrap()
        ])
        .status()?;
    
    if !status.success() {
        return Err(anyhow::anyhow!("FFmpeg 480p failed"));
    }

    // HD 720p
    let out_720p = out_dir.join("video_720p.mp4");
    let status = Command::new("ffmpeg")
        .args(&[
            "-i", input.to_str().unwrap(),
            "-c:v", "libx264", "-crf", "26", "-preset", "fast",
            "-vf", "scale=w=1280:h=720:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
            out_720p.to_str().unwrap()
        ])
        .status()?;

    if !status.success() {
        return Err(anyhow::anyhow!("FFmpeg 720p failed"));
    }

    Ok(())
}

async fn process_audio(input: &Path, out_dir: &Path, media_type: &str) -> anyhow::Result<()> {
    let out_file = if media_type == "voice_note" {
        out_dir.join("voice_note.webm")
    } else {
        out_dir.join("audio_optimized.mp3")
    };

    let mut args = vec!["-i", input.to_str().unwrap()];

    if media_type == "voice_note" {
        args.extend(&["-c:a", "libopus", "-b:a", "32k", "-ac", "1", "-ar", "48000"]);
    } else {
        args.extend(&["-c:a", "libmp3lame", "-b:a", "128k", "-ac", "2"]);
    }

    args.push(out_file.to_str().unwrap());

    let status = Command::new("ffmpeg")
        .args(&args)
        .status()?;

    if !status.success() {
        return Err(anyhow::anyhow!("FFmpeg audio failed"));
    }

    Ok(())
}
