use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// ── Merge Videos ──

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeVideosParams {
    pub input_paths: Vec<PathBuf>,
    pub output_path: PathBuf,
    pub output_format: String,
    pub reencode: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeVideosResult {
    pub output_path: String,
    pub duration_secs: f64,
    pub file_size_bytes: u64,
}

// ── Images to Video ──

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImagesToVideoParams {
    pub image_paths: Vec<PathBuf>,
    pub output_path: PathBuf,
    pub fps: f64,
    pub output_format: String,
    pub resolution: Option<(u32, u32)>,
    pub audio_path: Option<PathBuf>,
    pub loop_count: Option<i32>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImagesToVideoResult {
    pub output_path: String,
    pub duration_secs: f64,
    pub frame_count: u32,
    pub file_size_bytes: u64,
}

// ── Format Conversion ──

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ConversionTarget {
    VideoFormat(String),
    AudioFormat(String),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertFormatParams {
    pub input_path: PathBuf,
    pub output_path: PathBuf,
    pub target: ConversionTarget,
    pub audio_bitrate: Option<String>,
    pub video_bitrate: Option<String>,
    pub resolution: Option<(u32, u32)>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertFormatResult {
    pub output_path: String,
    pub file_size_bytes: u64,
}

// ── Shared progress/log types ──

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoToolProgress {
    pub task_id: String,
    pub progress: f32,
    pub current_step: String,
    pub elapsed_ms: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoToolLog {
    pub task_id: String,
    pub level: String,
    pub message: String,
    pub timestamp: u64,
}
