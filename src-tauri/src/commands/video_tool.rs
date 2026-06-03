use crate::model::video_tool_state::*;
use crate::utils::video_tool_engine::VideoToolEngine;
use tauri::Emitter;

#[tauri::command]
pub fn check_video_encoders() -> Vec<(String, bool)> {
    VideoToolEngine::check_encoder_availability()
        .into_iter()
        .map(|(name, available)| (name.to_string(), available))
        .collect()
}

/// 检查音频编码器可用性，返回格式名称和是否可用的列表
#[tauri::command]
pub fn check_audio_encoders() -> Vec<(String, bool)> {
    let format_encoders: &[(&str, &[&str])] = &[
        ("mp3", &["libmp3lame", "mp3"]),
        ("aac", &["aac", "libfdk_aac"]),
        ("wav", &["pcm_s16le"]),
        ("flac", &["flac"]),
        ("ogg", &["libvorbis", "vorbis"]),
        ("opus", &["libopus", "opus"]),
        ("alac", &["alac"]),
        ("ac3", &["ac3"]),
    ];
    format_encoders
        .iter()
        .map(|(format, encoders)| {
            let available = encoders.iter().any(|&name| {
                ffmpeg_next::codec::encoder::find_by_name(name).is_some()
            });
            (format.to_string(), available)
        })
        .collect()
}

#[tauri::command]
pub async fn merge_videos(
    params: MergeVideosParams,
    app_handle: tauri::AppHandle,
) -> Result<MergeVideosResult, String> {
    let handle = app_handle.clone();
    let log_handle = app_handle.clone();

    tokio::task::spawn_blocking(move || {
        VideoToolEngine::merge_videos(
            &params,
            |progress| {
                let _ = handle.emit("video-tool://progress", progress);
            },
            |log| {
                let _ = log_handle.emit("video-tool://log", log);
            },
        )
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn images_to_video(
    params: ImagesToVideoParams,
    app_handle: tauri::AppHandle,
) -> Result<ImagesToVideoResult, String> {
    let handle = app_handle.clone();
    let log_handle = app_handle.clone();

    tokio::task::spawn_blocking(move || {
        VideoToolEngine::images_to_video(
            &params,
            |progress| {
                let _ = handle.emit("video-tool://progress", progress);
            },
            |log| {
                let _ = log_handle.emit("video-tool://log", log);
            },
        )
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn convert_format(
    params: ConvertFormatParams,
    app_handle: tauri::AppHandle,
) -> Result<ConvertFormatResult, String> {
    let handle = app_handle.clone();
    let log_handle = app_handle.clone();

    tokio::task::spawn_blocking(move || {
        VideoToolEngine::convert_format(
            &params,
            |progress| {
                let _ = handle.emit("video-tool://progress", progress);
            },
            |log| {
                let _ = log_handle.emit("video-tool://log", log);
            },
        )
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn batch_convert_format(
    params: BatchConvertParams,
    app_handle: tauri::AppHandle,
) -> Result<BatchConvertResult, String> {
    let handle = app_handle.clone();
    let log_handle = app_handle.clone();
    let batch_handle = app_handle.clone();

    tokio::task::spawn_blocking(move || {
        VideoToolEngine::batch_convert_format(
            &params,
            |progress| {
                let _ = handle.emit("video-tool://progress", progress);
            },
            |log| {
                let _ = log_handle.emit("video-tool://log", log);
            },
            |batch_progress| {
                let _ = batch_handle.emit("video-tool://batch-progress", batch_progress);
            },
        )
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}
