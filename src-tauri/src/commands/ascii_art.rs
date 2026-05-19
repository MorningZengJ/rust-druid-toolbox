use std::path::PathBuf;
use tauri::Emitter;

use crate::model::ascii_art_state::{AsciiArtOutput, AsciiArtParams, AsciiArtProgress};
use crate::utils::ascii_art_engine::AsciiArtEngine;

fn get_ascii_art_temp_dir() -> PathBuf {
    std::env::temp_dir().join("druid_ascii_art")
}

fn cleanup_ascii_art_dir() {
    let dir = get_ascii_art_temp_dir();
    if dir.exists() {
        let _ = std::fs::remove_dir_all(&dir);
    }
}

fn write_output_png(png_bytes: &[u8], source_name: &str) -> Result<String, String> {
    let dir = get_ascii_art_temp_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let filename = format!("{}_ascii.png", source_name);
    let path = dir.join(&filename);
    std::fs::write(&path, png_bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

fn source_name_from_path(image_path: &str) -> String {
    std::path::Path::new(image_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("ascii_art")
        .to_string()
}

/// Convert image from file path to ASCII art
#[tauri::command]
pub async fn convert_ascii_art_from_path(
    params: AsciiArtParams,
    image_path: String,
    app_handle: tauri::AppHandle,
) -> Result<AsciiArtOutput, String> {
    tokio::task::spawn_blocking(move || {
        let start_time = std::time::Instant::now();
        let handle = app_handle.clone();
        let source_name = source_name_from_path(&image_path);

        let img = image::open(&image_path).map_err(|e| e.to_string())?;
        let mut output = AsciiArtEngine::convert_from_image(&params, &img, |progress: AsciiArtProgress| {
            let _ = handle.emit("ascii-art://progress", progress);
        })?;

        // PNG mode: write to temp file
        if let Some(ref png_bytes) = output.image_data {
            cleanup_ascii_art_dir();
            let path = write_output_png(png_bytes, &source_name)?;
            output.output_path = Some(path);
            output.image_data = None;
        }

        let _ = app_handle.emit("ascii-art://progress", AsciiArtProgress {
            stage: "encode".to_string(),
            progress: 1.0,
            elapsed_ms: start_time.elapsed().as_millis() as u64,
        });

        Ok(output)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Save image bytes to temp file, convert, and return (temp_path, output)
#[tauri::command]
pub async fn save_temp_image_and_convert(
    params: AsciiArtParams,
    image_bytes: Vec<u8>,
    app_handle: tauri::AppHandle,
) -> Result<(String, AsciiArtOutput), String> {
    tokio::task::spawn_blocking(move || {
        let start_time = std::time::Instant::now();
        let handle = app_handle.clone();

        let temp_dir = std::env::temp_dir();
        let filename = format!("ascii_art_{}.png", uuid::Uuid::new_v4());
        let temp_path = temp_dir.join(&filename);
        std::fs::write(&temp_path, &image_bytes).map_err(|e| e.to_string())?;

        let img = image::load_from_memory(&image_bytes).map_err(|e| e.to_string())?;
        let mut output = AsciiArtEngine::convert_from_image(&params, &img, |progress: AsciiArtProgress| {
            let _ = handle.emit("ascii-art://progress", progress);
        })?;

        // PNG mode: write to temp file
        if let Some(ref png_bytes) = output.image_data {
            cleanup_ascii_art_dir();
            let path = write_output_png(png_bytes, "ascii_art")?;
            output.output_path = Some(path);
            output.image_data = None;
        }

        let _ = app_handle.emit("ascii-art://progress", AsciiArtProgress {
            stage: "encode".to_string(),
            progress: 1.0,
            elapsed_ms: start_time.elapsed().as_millis() as u64,
        });

        Ok((temp_path.to_string_lossy().to_string(), output))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Load image from file path and return bytes
#[tauri::command]
pub fn load_image_from_file(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| e.to_string())
}

/// Write binary data to a file
#[tauri::command]
pub fn write_binary_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, &contents).map_err(|e| e.to_string())
}

/// Export ASCII art to file in specified format
#[tauri::command]
pub async fn export_ascii_art(
    params: AsciiArtParams,
    image_path: String,
    format: String,
    path: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let img = image::open(&image_path).map_err(|e| e.to_string())?;
        let output = AsciiArtEngine::convert_from_image(&params, &img, |_progress| {})?;

        let content = match format.as_str() {
            "png" => {
                let data = output.image_data.ok_or("PNG 数据未生成")?;
                std::fs::write(&path, &data).map_err(|e| e.to_string())?;
                return Ok(());
            }
            "svg" => output.svg_data.ok_or("SVG 数据未生成")?,
            "txt" => output.plain_text,
            "html" => {
                let bg_color = match params.background {
                    crate::model::ascii_art_state::Background::Black => "#000000",
                    crate::model::ascii_art_state::Background::White => "#ffffff",
                    crate::model::ascii_art_state::Background::Transparent => "transparent",
                };
                format!(
                    r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:{};font-family:monospace;white-space:pre;line-height:1.0;letter-spacing:1px;font-size:12px">
{}
</body>
</html>"#,
                    bg_color, output.plain_text
                )
            }
            _ => return Err(format!("不支持的导出格式: {}", format)),
        };

        std::fs::write(&path, &content).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Clean up ASCII art temporary directory
#[tauri::command]
pub fn cleanup_ascii_art_file(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if p.exists() {
        std::fs::remove_file(p).map_err(|e| e.to_string())?;
    }
    Ok(())
}
