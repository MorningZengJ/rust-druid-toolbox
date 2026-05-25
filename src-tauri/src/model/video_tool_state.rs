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
    /// 视频模式下用户选择的音频编码器名称（如 "aac"、"mp3"）
    pub audio_codec: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertFormatResult {
    pub output_path: String,
    pub file_size_bytes: u64,
}

// ── Batch Format Conversion ──

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchConvertParams {
    pub items: Vec<ConvertFormatParams>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchConvertResult {
    pub results: Vec<BatchConvertItemResult>,
    pub total_files: u32,
    pub success_count: u32,
    pub fail_count: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchConvertItemResult {
    pub input_path: String,
    pub output_path: String,
    pub file_size_bytes: u64,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchProgress {
    pub current_index: u32,
    pub total_count: u32,
    pub overall_progress: f32,
    pub current_file_name: String,
}

// ── Shared progress/log types ──

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoToolProgress {
    pub task_id: String,
    pub progress: f32,
    pub current_step: String,
    pub elapsed_ms: u64,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_file_index: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_files: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_file_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speed: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub eta_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frames_processed: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_frames: Option<u64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoToolLog {
    pub task_id: String,
    pub level: String,
    pub message: String,
    pub timestamp: u64,
}
