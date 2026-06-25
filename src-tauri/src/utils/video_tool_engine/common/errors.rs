/// 视频工具统一错误类型
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) enum VideoToolError {
    FFmpeg(String),
    Io(std::io::Error),
    InvalidInput(String),
    UnsupportedFormat(String),
    EventEmit(String),
}

impl std::fmt::Display for VideoToolError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::FFmpeg(msg) => write!(f, "FFmpeg 错误: {}", msg),
            Self::Io(e) => write!(f, "I/O 错误: {}", e),
            Self::InvalidInput(msg) => write!(f, "无效输入: {}", msg),
            Self::UnsupportedFormat(fmt) => write!(f, "不支持的格式: {}", fmt),
            Self::EventEmit(msg) => write!(f, "事件发送失败: {}", msg),
        }
    }
}

impl std::error::Error for VideoToolError {}

impl From<std::io::Error> for VideoToolError {
    fn from(e: std::io::Error) -> Self {
        Self::Io(e)
    }
}

// 当前阶段不替换 anyhow::Result，保持 backward-compatible。
// 新增 helper 用于统一转换（脚手架，后续替换 anyhow 时使用）。
impl VideoToolError {
    #[allow(dead_code)]
    pub fn to_anyhow(self) -> anyhow::Error {
        anyhow::anyhow!("{}", self)
    }
}
