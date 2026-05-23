use crate::model::live_record_state::{
    LiveRecordLogEntry, PreviewFrame, RecordParams, RecordProgressInfo, RecordingStatus,
    RecordingTaskInfo,
};
use crate::utils::live_record_engine::LiveRecordEngine;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Emitter;

pub struct LiveRecordManager {
    tasks: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}

impl LiveRecordManager {
    pub fn new() -> Self {
        Self {
            tasks: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[tauri::command]
pub async fn start_recording(
    params: RecordParams,
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, LiveRecordManager>,
) -> Result<RecordingTaskInfo, String> {
    let task_id = uuid::Uuid::new_v4().to_string();
    let stop_flag = Arc::new(AtomicBool::new(false));

    // Register the task
    {
        let mut tasks = state.tasks.lock().map_err(|e| e.to_string())?;
        tasks.insert(task_id.clone(), stop_flag.clone());
    }

    let start_time_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let initial_output_path = {
        let ext = params.container_format.extension();
        let filename = match params.segment_duration_secs {
            Some(d) if d > 0 => format!("{}_{:04}.{}", params.filename_prefix, 1, ext),
            _ => format!("{}.{}", params.filename_prefix, ext),
        };
        std::path::PathBuf::from(&params.output_dir)
            .join(filename)
            .to_string_lossy()
            .to_string()
    };

    let task_info = RecordingTaskInfo {
        task_id: task_id.clone(),
        url: params.url.clone(),
        status: RecordingStatus::Connecting,
        params: params.clone(),
        duration_secs: 0.0,
        file_size_bytes: 0,
        output_path: initial_output_path,
        current_segment: 1,
        start_time_ms,
    };

    // Spawn recording in background
    let progress_handle = app_handle.clone();
    let log_handle = app_handle.clone();
    let preview_handle = app_handle.clone();
    let status_handle = app_handle.clone();
    let manager_tasks = state.tasks.clone();
    let tid = task_id.clone();

    tokio::task::spawn_blocking(move || {
        let result = LiveRecordEngine::start_recording(
            &params,
            &tid,
            stop_flag,
            move |progress: RecordProgressInfo| {
                let _ = progress_handle.emit("live-record://progress", progress);
            },
            move |log: LiveRecordLogEntry| {
                let _ = log_handle.emit("live-record://log", log);
            },
            move |frame: PreviewFrame| {
                let _ = preview_handle.emit("live-record://preview", frame);
            },
        );

        // Clean up task from manager
        if let Ok(mut tasks) = manager_tasks.lock() {
            tasks.remove(&tid);
        }

        let final_status = if result.is_ok() {
            RecordingStatus::Stopped
        } else {
            RecordingStatus::Error
        };

        let _ = status_handle.emit(
            "live-record://status",
            serde_json::json!({
                "taskId": tid,
                "status": final_status,
                "error": result.err().map(|e| e.to_string()),
            }),
        );
    });

    Ok(task_info)
}

#[tauri::command]
pub fn stop_recording(
    task_id: String,
    state: tauri::State<'_, LiveRecordManager>,
) -> Result<(), String> {
    let tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    if let Some(flag) = tasks.get(&task_id) {
        flag.store(true, Ordering::Relaxed);
        Ok(())
    } else {
        Err("录制任务不存在或已结束".to_string())
    }
}

#[tauri::command]
pub fn list_recordings(
    state: tauri::State<'_, LiveRecordManager>,
) -> Result<Vec<String>, String> {
    let tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    Ok(tasks.keys().cloned().collect())
}
