use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum RecordingStatus {
    Connecting,
    Recording,
    Stopping,
    Stopped,
    Error,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ContainerFormat {
    Mp4,
    Mkv,
    Flv,
    Ts,
}

impl ContainerFormat {
    pub fn extension(&self) -> &str {
        match self {
            Self::Mp4 => "mp4",
            Self::Mkv => "mkv",
            Self::Flv => "flv",
            Self::Ts => "ts",
        }
    }

    pub fn ffmpeg_format(&self) -> &str {
        match self {
            Self::Mp4 => "mp4",
            Self::Mkv => "matroska",
            Self::Flv => "flv",
            Self::Ts => "mpegts",
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordParams {
    pub url: String,
    pub output_dir: String,
    pub filename_prefix: String,
    pub container_format: ContainerFormat,
    pub stream_copy: bool,
    pub segment_duration_secs: Option<u32>,
    pub preview_enabled: bool,
    pub preview_interval_ms: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordProgressInfo {
    pub task_id: String,
    pub status: RecordingStatus,
    pub duration_secs: f64,
    pub file_size_bytes: u64,
    pub bitrate_kbps: f64,
    pub current_segment: u32,
    pub output_path: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewFrame {
    pub task_id: String,
    pub jpeg_data: Vec<u8>,
    pub width: u32,
    pub height: u32,
    pub timestamp: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveRecordLogEntry {
    pub task_id: String,
    pub level: String,
    pub message: String,
    pub timestamp: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingTaskInfo {
    pub task_id: String,
    pub url: String,
    pub status: RecordingStatus,
    pub params: RecordParams,
    pub duration_secs: f64,
    pub file_size_bytes: u64,
    pub output_path: String,
    pub current_segment: u32,
    pub start_time_ms: u64,
}
