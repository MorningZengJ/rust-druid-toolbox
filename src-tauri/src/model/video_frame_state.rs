use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ExtractMode {
    AllFrames,
    ByInterval,
    ByCount,
    ByTimePoints,
}

impl ExtractMode {
    pub fn all() -> Vec<Self> {
        vec![
            Self::AllFrames,
            Self::ByInterval,
            Self::ByCount,
            Self::ByTimePoints,
        ]
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OutputFormat {
    Png,
    Jpeg,
}

impl OutputFormat {
    pub fn all() -> Vec<Self> {
        vec![Self::Png, Self::Jpeg]
    }

    pub fn extension(&self) -> &str {
        match self {
            Self::Png => "png",
            Self::Jpeg => "jpg",
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub duration: f64,
    pub total_frames: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedFrame {
    pub index: usize,
    pub timestamp: f64,
    pub image_data: Vec<u8>,
    pub filename: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractParams {
    pub video_path: PathBuf,
    pub mode: ExtractMode,
    pub interval_secs: f64,
    pub frame_count: u32,
    pub time_points: Vec<f64>,
    pub output_format: OutputFormat,
    pub jpeg_quality: u8,
    pub resize_width: Option<u32>,
}
