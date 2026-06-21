use serde::Serialize;

/// 应用错误代码枚举
///
/// 用于前端国际化，前端根据错误代码显示翻译后的消息
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    // 文件相关
    FileNotFound,
    FilePermissionDenied,
    FileAlreadyExists,
    InvalidFilename,
    FilenameTooLong,

    // FFmpeg 相关
    FfmpegNotFound,
    EncoderUnavailable,
    DecoderUnavailable,
    InvalidVideoFormat,
    ProbeFailed,

    // 通用
    InvalidParams,
    OperationCancelled,
    UnknownError,
    NetworkError,
    TimeoutError,
    DiskFull,
    UnsupportedFormat,
}

/// 应用错误结构体
///
/// 包含错误代码、技术性消息和可选的翻译参数
#[derive(Debug, Clone, Serialize)]
pub struct AppError {
    /// 错误代码，用于前端翻译
    pub code: ErrorCode,
    /// 技术性消息（英文或中文均可，主要用于调试）
    pub message: String,
    /// 翻译所需的参数
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
}

impl AppError {
    /// 创建新的应用错误
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            params: None,
        }
    }

    /// 创建带参数的应用错误
    pub fn with_params(code: ErrorCode, message: impl Into<String>, params: serde_json::Value) -> Self {
        Self {
            code,
            message: message.into(),
            params: Some(params),
        }
    }

    /// 创建文件未找到错误
    pub fn file_not_found(path: &str) -> Self {
        Self::with_params(
            ErrorCode::FileNotFound,
            format!("File not found: {}", path),
            serde_json::json!({ "path": path }),
        )
    }

    /// 创建编码器不可用错误
    pub fn encoder_unavailable(name: &str) -> Self {
        Self::with_params(
            ErrorCode::EncoderUnavailable,
            format!("Encoder unavailable: {}", name),
            serde_json::json!({ "name": name }),
        )
    }

    /// 创建解码器不可用错误
    pub fn decoder_unavailable(name: &str) -> Self {
        Self::with_params(
            ErrorCode::DecoderUnavailable,
            format!("Decoder unavailable: {}", name),
            serde_json::json!({ "name": name }),
        )
    }

    /// 创建无效参数错误
    pub fn invalid_params(details: &str) -> Self {
        Self::with_params(
            ErrorCode::InvalidParams,
            format!("Invalid parameters: {}", details),
            serde_json::json!({ "details": details }),
        )
    }

    /// 创建探测失败错误
    pub fn probe_failed(reason: &str) -> Self {
        Self::with_params(
            ErrorCode::ProbeFailed,
            format!("Failed to probe video info: {}", reason),
            serde_json::json!({ "reason": reason }),
        )
    }

    /// 创建不支持格式错误
    pub fn unsupported_format(format: &str) -> Self {
        Self::with_params(
            ErrorCode::UnsupportedFormat,
            format!("Unsupported format: {}", format),
            serde_json::json!({ "format": format }),
        )
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{:?}] {}", self.code, self.message)
    }
}

impl std::error::Error for AppError {}

/// 从 anyhow::Error 转换为 AppError
impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::new(ErrorCode::UnknownError, err.to_string())
    }
}

/// 从 String 转换为 AppError
impl From<String> for AppError {
    fn from(err: String) -> Self {
        AppError::new(ErrorCode::UnknownError, err)
    }
}

/// 从 &str 转换为 AppError
impl From<&str> for AppError {
    fn from(err: &str) -> Self {
        AppError::new(ErrorCode::UnknownError, err)
    }
}
