use crate::model::video_frame_state::{
    ExtractParams, ExtractedFrame, LogEntry, ProgressInfo, VideoInfo,
};
use crate::utils::video_frame_engine::VideoFrameEngine;
use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::{Arc, Mutex};
use tauri::Emitter;

pub struct FrameWatcherState {
    watcher: Arc<Mutex<Option<RecommendedWatcher>>>,
}

impl FrameWatcherState {
    pub fn new() -> Self {
        Self {
            watcher: Arc::new(Mutex::new(None)),
        }
    }
}

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
) -> Result<Vec<ExtractedFrame>, String> {
    let handle = app_handle.clone();
    let log_handle = app_handle.clone();
    let frame_handle = app_handle.clone();
    let out_dir = std::path::PathBuf::from(&output_dir);
    // Run the CPU-intensive extraction on a blocking thread
    let frames = tokio::task::spawn_blocking(move || {
        VideoFrameEngine::extract_frames(
            &params,
            &out_dir,
            |progress: ProgressInfo| {
                let _ = handle.emit("video-frame://progress", progress);
            },
            |log: LogEntry| {
                let _ = log_handle.emit("video-frame://log", log);
            },
            |frame: ExtractedFrame| {
                let _ = frame_handle.emit("video-frame://frame", frame);
            },
        )
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;

    Ok(frames)
}

/// Start watching output directory for frame file deletions
#[tauri::command]
pub fn start_frame_watcher(
    output_dir: String,
    app_handle: tauri::AppHandle,
    state: tauri::State<FrameWatcherState>,
) -> Result<(), String> {
    // Stop existing watcher first
    let mut guard = state.watcher.lock().map_err(|e| e.to_string())?;
    *guard = None;

    let handle = app_handle.clone();
    let path = std::path::PathBuf::from(&output_dir);

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                if matches!(event.kind, EventKind::Remove(_)) {
                    let _ = handle.emit("video-frame://frames-deleted", ());
                }
            }
        },
        notify::Config::default(),
    )
    .map_err(|e| e.to_string())?;

    watcher
        .watch(&path, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    *guard = Some(watcher);
    Ok(())
}

/// Stop watching output directory
#[tauri::command]
pub fn stop_frame_watcher(state: tauri::State<FrameWatcherState>) -> Result<(), String> {
    let mut guard = state.watcher.lock().map_err(|e| e.to_string())?;
    *guard = None;
    Ok(())
}
