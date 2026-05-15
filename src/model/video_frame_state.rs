use std::fmt;
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExtractMode {
    AllFrames,
    ByInterval,
    ByCount,
    ByTimePoints,
}

impl ExtractMode {
    #[allow(dead_code)]
    pub fn all() -> Vec<ExtractMode> {
        vec![
            ExtractMode::AllFrames,
            ExtractMode::ByInterval,
            ExtractMode::ByCount,
            ExtractMode::ByTimePoints,
        ]
    }
}

impl fmt::Display for ExtractMode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ExtractMode::AllFrames => write!(f, "全部帧"),
            ExtractMode::ByInterval => write!(f, "按间隔"),
            ExtractMode::ByCount => write!(f, "按数量"),
            ExtractMode::ByTimePoints => write!(f, "按时间点"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OutputFormat {
    Png,
    Jpeg,
}

impl OutputFormat {
    pub fn all() -> Vec<OutputFormat> {
        vec![OutputFormat::Png, OutputFormat::Jpeg]
    }

    #[allow(dead_code)]
    pub fn extension(&self) -> &str {
        match self {
            OutputFormat::Png => "png",
            OutputFormat::Jpeg => "jpg",
        }
    }
}

impl fmt::Display for OutputFormat {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            OutputFormat::Png => write!(f, "PNG"),
            OutputFormat::Jpeg => write!(f, "JPEG"),
        }
    }
}

#[derive(Debug, Clone)]
pub struct VideoInfo {
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub duration: f64,
    pub total_frames: u64,
}

#[derive(Debug, Clone)]
pub struct ExtractedFrame {
    pub index: usize,
    pub timestamp: f64,
    pub image_data: Vec<u8>,
    pub filename: String,
}

#[derive(Debug, Clone)]
pub struct ExtractParams {
    pub video_path: PathBuf,
    pub mode: ExtractMode,
    #[allow(dead_code)]
    pub interval_secs: f64,
    #[allow(dead_code)]
    pub frame_count: u32,
    pub time_points: Vec<f64>,
    pub output_format: OutputFormat,
    pub jpeg_quality: u8,
    pub resize_width: Option<u32>,
}

#[derive(Debug, Clone)]
pub struct VideoFrameState {
    // Input
    pub video_path: Option<PathBuf>,
    pub video_info: Option<VideoInfo>,

    // Parameters
    pub extract_mode: ExtractMode,
    pub interval_secs: f64,
    pub frame_count: u32,
    pub time_points_input: String,
    pub output_format: OutputFormat,
    pub jpeg_quality: u8,
    pub output_dir: Option<PathBuf>,
    pub resize_width: Option<u32>,

    // Results
    pub frames: Vec<ExtractedFrame>,
    pub selected_frame: Option<usize>,

    // Status
    pub is_extracting: bool,
    pub progress: f32,
    pub error_message: Option<String>,
    pub ffmpeg_available: bool,
}

impl Default for VideoFrameState {
    fn default() -> Self {
        Self {
            video_path: None,
            video_info: None,
            extract_mode: ExtractMode::AllFrames,
            interval_secs: 1.0,
            frame_count: 10,
            time_points_input: String::new(),
            output_format: OutputFormat::Png,
            jpeg_quality: 90,
            output_dir: None,
            resize_width: None,
            frames: Vec::new(),
            selected_frame: None,
            is_extracting: false,
            progress: 0.0,
            error_message: None,
            ffmpeg_available: false,
        }
    }
}
