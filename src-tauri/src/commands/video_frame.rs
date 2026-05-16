use crate::model::video_frame_state::{ExtractParams, VideoInfo};
use crate::utils::video_frame_engine::VideoFrameEngine;
use tauri::Emitter;


/// Check if FFmpeg is available
#[tauri::command]
pub fn check_ffmpeg() -> bool {
    VideoFrameEngine::check_ffmpeg()
}

/// Probe video file for metadata
#[tauri::command]
pub fn probe_video(path: String) -> Result<VideoInfo, String> {
    VideoFrameEngine::probe_video(std::path::Path::new(&path)).map_err(|e| e.to_string())
}

/// Extract frames from video
#[tauri::command]
pub async fn extract_frames(
    params: ExtractParams,
    output_dir: String,
    app_handle: tauri::AppHandle,
) -> Result<Vec<crate::model::video_frame_state::ExtractedFrame>, String> {
    let handle = app_handle.clone();
    let out_dir = std::path::PathBuf::from(&output_dir);
    // Run the CPU-intensive extraction on a blocking thread
    let frames = tokio::task::spawn_blocking(move || {
        VideoFrameEngine::extract_frames(&params, &out_dir, |progress| {
            let _ = handle.emit("video-frame://progress", progress);
        })
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;

    Ok(frames)
}
