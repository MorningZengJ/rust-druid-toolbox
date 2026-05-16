use crate::model::ascii_art_state::AsciiArtParams;
use crate::utils::ascii_art_engine::AsciiArtEngine;

/// Convert image bytes to ASCII art
#[tauri::command]
pub async fn convert_ascii_art(
    params: AsciiArtParams,
    image_bytes: Vec<u8>,
) -> Result<crate::model::ascii_art_state::AsciiArtOutput, String> {
    // Run the CPU-intensive conversion on a blocking thread
    tokio::task::spawn_blocking(move || {
        let img = image::load_from_memory(&image_bytes).map_err(|e| e.to_string())?;
        AsciiArtEngine::convert_from_image(&params, &img)
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
    image_bytes: Vec<u8>,
    format: String,
    path: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let img = image::load_from_memory(&image_bytes).map_err(|e| e.to_string())?;
        let output = AsciiArtEngine::convert_from_image(&params, &img)?;

        let content = match format.as_str() {
            "png" => {
                std::fs::write(&path, &output.image_data).map_err(|e| e.to_string())?;
                return Ok(());
            }
            "svg" => output.svg_data,
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

        std::fs::write(&path, content).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
