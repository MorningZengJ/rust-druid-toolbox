use std::path::Path;

use crate::utils::common_utils::natural_compare;

/// 列出文件夹中的图片文件路径，按文件名自然排序
#[tauri::command]
pub fn list_images_in_folder(folder_path: String) -> Vec<String> {
    let image_extensions: &[&str] = &["png", "jpg", "jpeg", "bmp", "gif", "webp"];

    let entries = match std::fs::read_dir(&folder_path) {
        Ok(entries) => entries,
        Err(_) => return Vec::new(),
    };

    let mut images: Vec<String> = entries
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            let file_type = entry.file_type().ok();
            file_type.map(|ft| ft.is_file()).unwrap_or(false)
        })
        .filter_map(|entry| {
            let path = entry.path();
            let ext = path
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase());
            if ext
                .map(|e| image_extensions.contains(&e.as_str()))
                .unwrap_or(false)
            {
                Some(path.to_string_lossy().to_string())
            } else {
                None
            }
        })
        .collect();

    images.sort_by(|a, b| {
        let name_a = Path::new(a)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");
        let name_b = Path::new(b)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");
        natural_compare(name_a, name_b)
    });

    images
}

/// 列出文件夹中的媒体文件路径（视频+音频），按文件名自然排序
#[tauri::command]
pub fn list_media_files_in_folder(folder_path: String) -> Vec<String> {
    let media_extensions: &[&str] = &[
        "mp4", "mkv", "avi", "webm", "mov", "flv", "ts", "mp3", "aac", "wav", "flac", "ogg", "opus",
    ];

    let entries = match std::fs::read_dir(&folder_path) {
        Ok(entries) => entries,
        Err(_) => return Vec::new(),
    };

    let mut files: Vec<String> = entries
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            let file_type = entry.file_type().ok();
            file_type.map(|ft| ft.is_file()).unwrap_or(false)
        })
        .filter_map(|entry| {
            let path = entry.path();
            let ext = path
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase());
            if ext
                .map(|e| media_extensions.contains(&e.as_str()))
                .unwrap_or(false)
            {
                Some(path.to_string_lossy().to_string())
            } else {
                None
            }
        })
        .collect();

    files.sort_by(|a, b| {
        let name_a = Path::new(a)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");
        let name_b = Path::new(b)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");
        natural_compare(name_a, name_b)
    });

    files
}
