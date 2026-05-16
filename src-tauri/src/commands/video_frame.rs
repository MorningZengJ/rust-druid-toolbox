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
    output_dir: Option<String>,
    app_handle: tauri::AppHandle,
) -> Result<Vec<crate::model::video_frame_state::ExtractedFrame>, String> {
    let handle = app_handle.clone();
    // Run the CPU-intensive extraction on a blocking thread
    let frames = tokio::task::spawn_blocking(move || {
        VideoFrameEngine::extract_frames(&params, |progress| {
            let _ = handle.emit("video-frame://progress", progress);
        })
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;

    // Write frames to disk if output_dir is specified
    if let Some(dir) = output_dir {
        let output_path = std::path::Path::new(&dir);
        std::fs::create_dir_all(output_path).map_err(|e| e.to_string())?;
        for frame in &frames {
            let file_path = output_path.join(&frame.filename);
            std::fs::write(&file_path, &frame.image_data).map_err(|e| e.to_string())?;
        }
    }

    Ok(frames)
}

/// Export extracted frames to disk
#[tauri::command]
pub fn export_frames(
    frames: Vec<crate::model::video_frame_state::ExtractedFrame>,
    output_dir: String,
) -> Result<String, String> {
    let output_path = std::path::Path::new(&output_dir);
    std::fs::create_dir_all(output_path).map_err(|e| e.to_string())?;

    for frame in &frames {
        let file_path = output_path.join(&frame.filename);
        std::fs::write(&file_path, &frame.image_data).map_err(|e| e.to_string())?;
    }

    Ok(format!("Exported {} frames to {}", frames.len(), output_dir))
}
