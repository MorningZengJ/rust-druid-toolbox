use std::fs;
use std::path::Path;

use crate::model::file_info::FileInfo;

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
                let size = if is_dir {
                    String::new()
                } else {
                    metadata
                        .as_ref()
                        .map(|m| Self::format_size(m.len()))
                        .unwrap_or_default()
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
