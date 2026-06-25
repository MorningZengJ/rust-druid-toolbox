use crate::model::video_tool_state::VideoToolLog;

/// 获取当前时间戳（毫秒）
pub(crate) fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

pub(crate) fn log_info(log_cb: &mut impl FnMut(VideoToolLog), task_id: &str, msg: &str) {
    log_cb(VideoToolLog {
        task_id: task_id.to_string(),
        level: "info".to_string(),
        message: msg.to_string(),
        timestamp: now_ms(),
    });
}

pub(crate) fn log_warn(log_cb: &mut impl FnMut(VideoToolLog), task_id: &str, msg: &str) {
    log_cb(VideoToolLog {
        task_id: task_id.to_string(),
        level: "warn".to_string(),
        message: msg.to_string(),
        timestamp: now_ms(),
    });
}

pub(crate) fn log_error(log_cb: &mut impl FnMut(VideoToolLog), task_id: &str, msg: &str) {
    log_cb(VideoToolLog {
        task_id: task_id.to_string(),
        level: "error".to_string(),
        message: msg.to_string(),
        timestamp: now_ms(),
    });
}
