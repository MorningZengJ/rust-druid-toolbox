use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::model::file_info::FileInfo;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadFilesProgress {
    pub phase: String,
    pub processed: usize,
    pub total: usize,
    pub path: String,
}

pub struct FileUtils;

impl FileUtils {
    pub fn list_files<P: AsRef<Path>>(path: P) -> Vec<FileInfo> {
        let entries = match fs::read_dir(&path) {
            Ok(entries) => entries,
            Err(_) => return Vec::new(),
        };

        let mut files: Vec<FileInfo> = entries
            .filter_map(|entry| entry.ok())
            .map(|entry| {
                let file_type = entry.file_type().ok();
                let metadata = entry.metadata().ok();
                let name = entry.file_name().to_string_lossy().to_string();
                let path = entry.path().to_string_lossy().to_string();
                let parent_path = entry
                    .path()
                    .parent()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default();
                let is_dir = file_type.map(|ft| ft.is_dir()).unwrap_or(false);
                let extension = if is_dir {
                    String::new()
                } else {
                    Path::new(&name)
                        .extension()
                        .map(|e| e.to_string_lossy().to_string())
                        .unwrap_or_default()
                };
                let (size, size_bytes) = if is_dir {
                    let bytes = Self::calculate_dir_size(&entry.path());
                    (Self::format_size(bytes), bytes)
                } else {
                    let bytes = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                    (Self::format_size(bytes), bytes)
                };
                let created_time = metadata
                    .as_ref()
                    .and_then(|m| m.created().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);
                let modified_time = metadata
                    .as_ref()
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);

                FileInfo {
                    name,
                    path,
                    parent_path,
                    is_dir,
                    extension,
                    size,
                    size_bytes,
                    created_time,
                    modified_time,
                }
            })
            .collect();

        // Sort: directories first, then by name
        files.sort_by(|a, b| {
            b.is_dir
                .cmp(&a.is_dir)
                .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });

        files
    }

    /// List files without calculating directory sizes (fast).
    pub fn list_files_quick<P: AsRef<Path>>(path: P) -> Vec<FileInfo> {
        let entries = match fs::read_dir(&path) {
            Ok(entries) => entries,
            Err(_) => return Vec::new(),
        };

        let mut files: Vec<FileInfo> = entries
            .filter_map(|entry| entry.ok())
            .map(|entry| {
                let file_type = entry.file_type().ok();
                let metadata = entry.metadata().ok();
                let name = entry.file_name().to_string_lossy().to_string();
                let path = entry.path().to_string_lossy().to_string();
                let parent_path = entry
                    .path()
                    .parent()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default();
                let is_dir = file_type.map(|ft| ft.is_dir()).unwrap_or(false);
                let extension = if is_dir {
                    String::new()
                } else {
                    Path::new(&name)
                        .extension()
                        .map(|e| e.to_string_lossy().to_string())
                        .unwrap_or_default()
                };
                let (size, size_bytes) = if is_dir {
                    (String::new(), 0)
                } else {
                    let bytes = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                    (Self::format_size(bytes), bytes)
                };
                let created_time = metadata
                    .as_ref()
                    .and_then(|m| m.created().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);
                let modified_time = metadata
                    .as_ref()
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);

                FileInfo {
                    name,
                    path,
                    parent_path,
                    is_dir,
                    extension,
                    size,
                    size_bytes,
                    created_time,
                    modified_time,
                }
            })
            .collect();

        files.sort_by(|a, b| {
            b.is_dir
                .cmp(&a.is_dir)
                .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });

        files
    }

    /// Calculate directory sizes in batches, emitting progress events.
    pub fn list_files_with_size(
        app: &AppHandle,
        mut files: Vec<FileInfo>,
        dir_path: &str,
        cancelled: Arc<AtomicBool>,
    ) -> Vec<FileInfo> {
        let dir_indices: Vec<usize> = files
            .iter()
            .enumerate()
            .filter(|(_, f)| f.is_dir)
            .map(|(i, _)| i)
            .collect();
        let total = dir_indices.len();
        let batch_size = 20;

        for (batch_num, chunk) in dir_indices.chunks(batch_size).enumerate() {
            if cancelled.load(Ordering::Relaxed) {
                break;
            }

            for &idx in chunk {
                let dir_path_inner = files[idx].path.clone();
                let bytes = Self::calculate_dir_size(Path::new(&dir_path_inner));
                files[idx].size = Self::format_size(bytes);
                files[idx].size_bytes = bytes;
            }

            let processed = ((batch_num + 1) * batch_size).min(total);
            let _ = app.emit(
                "load-files-progress",
                LoadFilesProgress {
                    phase: "calculating".to_string(),
                    processed,
                    total,
                    path: dir_path.to_string(),
                },
            );
        }

        files
    }

    fn calculate_dir_size(path: &Path) -> u64 {
        let mut total: u64 = 0;
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_dir() {
                        total += Self::calculate_dir_size(&entry.path());
                    } else {
                        total += metadata.len();
                    }
                }
            }
        }
        total
    }

    pub fn format_size(size: u64) -> String {
        const KB: u64 = 1024;
        const MB: u64 = KB * 1024;
        const GB: u64 = MB * 1024;

        if size >= GB {
            format!("{:.2} GB", size as f64 / GB as f64)
        } else if size >= MB {
            format!("{:.2} MB", size as f64 / MB as f64)
        } else if size >= KB {
            format!("{:.2} KB", size as f64 / KB as f64)
        } else {
            format!("{} B", size)
        }
    }
}
