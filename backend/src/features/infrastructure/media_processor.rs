use std::sync::Arc;
use tokio::time::{sleep, Duration};
use tokio::sync::Semaphore;
use crate::features::infrastructure::db::AppState;
use crate::models::MediaJobRecord;
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

            let mut conn = match client.get_multiplexed_async_connection().await {
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

    // 3. Process media based on type
    let processed_files = match job.media_type.as_str() {
        "video" => process_video(&input_path, &temp_dir).await?,
        "audio" | "voice_note" => process_audio(&input_path, &temp_dir, &job.media_type).await?,
        "image" => process_image(&state, job.temp_url.clone()).await?,
        _ => {
            tracing::warn!("Unsupported media type for processing: {}", job.media_type);
            vec![]
        }
    };

    // 4. Upload processed files back to R2
    if !processed_files.is_empty() {
        let upload_results = upload_to_r2(&state, &processed_files).await?;
        let final_url = upload_results.first().map(|(url, _)| url.clone()).unwrap_or(job.temp_url.clone());

        coll.update_one(
            doc! { "_id": &job.job_id },
            doc! { "$set": { "status": "completed", "final_url": final_url, "updated_at": Utc::now().timestamp() } },
            None
        ).await?;

        tracing::info!("Job {} completed. Files uploaded: {:?}", job.job_id, upload_results);
    } else {
        // No processing needed or failed, mark as completed with original URL
        coll.update_one(
            doc! { "_id": &job.job_id },
            doc! { "$set": { "status": "completed", "updated_at": Utc::now().timestamp() } },
            None
        ).await?;
    }

    // 5. Cleanup
    let _ = fs::remove_dir_all(&temp_dir).await;

    Ok(())
}

#[derive(Debug)]
struct ProcessedFile {
    local_path: std::path::PathBuf,
    r2_key: String,
    content_type: String,
}

async fn upload_to_r2(
    _state: &Arc<AppState>,
    files: &[ProcessedFile],
) -> anyhow::Result<Vec<(String, String)>> {
    let account_id = std::env::var("R2_ACCOUNT_ID")?;
    let access_key_id = std::env::var("R2_ACCESS_KEY_ID")?;
    let secret_access_key = std::env::var("R2_SECRET_ACCESS_KEY")?;
    let bucket = std::env::var("R2_BUCKET")?;
    let public_base_url = std::env::var("R2_PUBLIC_BASE_URL")?;

    let endpoint = format!("https://{}.r2.cloudflarestorage.com", account_id);
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id,
        secret_access_key,
        None,
        None,
        "Static",
    );

    let config = aws_sdk_s3::config::Builder::new()
        .behavior_version(aws_sdk_s3::config::BehaviorVersion::latest())
        .endpoint_url(endpoint)
        .region(aws_sdk_s3::config::Region::new("auto"))
        .credentials_provider(credentials)
        .build();

    let client = aws_sdk_s3::Client::from_conf(config);
    let mut results = Vec::new();

    for file in files {
        let body = aws_sdk_s3::primitives::ByteStream::from_path(&file.local_path).await?;

        let mut req = client
            .put_object()
            .bucket(&bucket)
            .key(&file.r2_key)
            .content_type(&file.content_type)
            .body(body);

        // Add cache-control header for CDN caching (1 year for processed media)
        if file.r2_key.contains("/uploads/") {
            req = req.cache_control("public, max-age=31536000, immutable");
        }

        req.send().await?;

        let public_url = format!("{}/{}", public_base_url, file.r2_key);
        results.push((public_url, file.r2_key.clone()));
    }

    Ok(results)
}

async fn mark_as_failed(coll: &mongodb::Collection<MediaJobRecord>, job_id: &str, error: &str) -> anyhow::Result<()> {
    coll.update_one(
        doc! { "_id": job_id },
        doc! { "$set": { "status": "failed", "error": error, "updated_at": Utc::now().timestamp() } },
        None
    ).await?;
    Ok(())
}

async fn process_video(input: &Path, out_dir: &Path) -> anyhow::Result<Vec<ProcessedFile>> {
    let base_name = input.file_name().and_then(|n| n.to_str()).unwrap_or("video");
    let mut processed = Vec::new();

    // Mobile 480p
    let out_480p = out_dir.join("video_480p.mp4");
    let status = Command::new("ffmpeg")
        .args(&[
            "-i", input.to_str().unwrap(),
            "-c:v", "libx264", "-crf", "28", "-preset", "veryfast",
            "-vf", "scale=w=854:h=480:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart",
            "-threads", "0",
            out_480p.to_str().unwrap()
        ])
        .status()?;

    if status.success() {
        processed.push(ProcessedFile {
            local_path: out_480p.clone(),
            r2_key: format!("uploads/{}_480p.mp4", base_name),
            content_type: "video/mp4".to_string(),
        });
    } else {
        tracing::warn!("FFmpeg 480p failed, skipping");
    }

    // HD 720p
    let out_720p = out_dir.join("video_720p.mp4");
    let status = Command::new("ffmpeg")
        .args(&[
            "-i", input.to_str().unwrap(),
            "-c:v", "libx264", "-crf", "26", "-preset", "veryfast",
            "-vf", "scale=w=1280:h=720:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
            "-threads", "0",
            out_720p.to_str().unwrap()
        ])
        .status()?;

    if status.success() {
        processed.push(ProcessedFile {
            local_path: out_720p.clone(),
            r2_key: format!("uploads/{}_720p.mp4", base_name),
            content_type: "video/mp4".to_string(),
        });
    } else {
        tracing::warn!("FFmpeg 720p failed, skipping");
    }

    // Generate HLS playlist for adaptive streaming
    let hls_dir = out_dir.join("hls");
    tokio::fs::create_dir_all(&hls_dir).await?;
    let hls_output = hls_dir.join("stream.m3u8");

    let status = Command::new("ffmpeg")
        .args(&[
            "-i", input.to_str().unwrap(),
            "-c:v", "libx264", "-crf", "28", "-preset", "veryfast",
            "-profile:v", "main", "-level", "3.1",
            "-vf", "scale=w=854:h=480:force_original_aspect_ratio=decrease",
            "-b:v", "800k", "-maxrate", "800k", "-bufsize", "1200k",
            "-c:a", "aac", "-b:a", "96k", "-ac", "2",
            "-f", "hls",
            "-hls_time", "6",
            "-hls_playlist_type", "vod",
            "-hls_flags", "delete_segments",
            "-hls_segment_filename", hls_dir.join("segment%03d.ts").to_str().unwrap(),
            hls_output.to_str().unwrap()
        ])
        .status()?;

    if status.success() {
        // Upload all HLS segments and playlist
        if let Ok(mut entries) = tokio::fs::read_dir(&hls_dir).await {
            while let Ok(Some(entry)) = entries.next_entry().await {
                let path = entry.path();
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    if ext == "ts" || ext == "m3u8" {
                        let seg_key = format!("uploads/{}_hls/{}", base_name,
                            path.file_name().and_then(|n| n.to_str()).unwrap_or(""));
                        processed.push(ProcessedFile {
                            local_path: path.clone(),
                            r2_key: seg_key,
                            content_type: if ext == "m3u8" { "application/vnd.apple.mpegurl" } else { "video/MP2T" }.to_string(),
                        });
                    }
                }
            }
        }
    } else {
        tracing::warn!("HLS generation failed, skipping");
    }

    Ok(processed)
}

async fn process_audio(input: &Path, out_dir: &Path, media_type: &str) -> anyhow::Result<Vec<ProcessedFile>> {
    let out_file = if media_type == "voice_note" {
        out_dir.join("voice_note.webm")
    } else {
        out_dir.join("audio_optimized.mp3")
    };

    let mut args = vec!["-i", input.to_str().unwrap()];

    if media_type == "voice_note" {
        args.extend(&["-c:a", "libopus", "-b:a", "32k", "-ac", "1", "-ar", "48000", "-threads", "0"]);
    } else {
        args.extend(&["-c:a", "libmp3lame", "-b:a", "128k", "-ac", "2", "-threads", "0"]);
    }

    args.push(out_file.to_str().unwrap());

    let status = Command::new("ffmpeg")
        .args(&args)
        .status()?;

    if !status.success() {
        return Err(anyhow::anyhow!("FFmpeg audio failed"));
    }

    let content_type = if media_type == "voice_note" { "audio/webm" } else { "audio/mpeg" };
    let base_name = input.file_name().and_then(|n| n.to_str()).unwrap_or("audio");

    Ok(vec![ProcessedFile {
        local_path: out_file,
        r2_key: format!("uploads/{}", base_name),
        content_type: content_type.to_string(),
    }])
}

async fn process_image(state: &Arc<AppState>, temp_url: String) -> anyhow::Result<Vec<ProcessedFile>> {
    // For images, we use the generate_image_variants logic
    // We need to extract the key from temp_url
    let public_base_url = std::env::var("R2_PUBLIC_BASE_URL")?;
    let key = temp_url.replace(&format!("{}/", public_base_url), "");
    
    // Call the existing logic (we'll move it or keep it in media.rs)
    // For now, I'll just implement it here since it's cleaner for the worker
    let _variants = crate::features::infrastructure::media::generate_image_variants(state, &key).await?;
    
    // Variants are already uploaded to R2 by generate_image_variants, 
    // so we return empty vec to avoid double upload in the worker loop
    // or we could refactor generate_image_variants to return ProcessedFiles.
    // Let's keep it simple: generate_image_variants handles its own uploads.
    Ok(vec![])
}
