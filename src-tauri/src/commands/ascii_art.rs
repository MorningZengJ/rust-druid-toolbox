use crate::model::ascii_art_state::AsciiArtParams;
use crate::utils::ascii_art_engine::AsciiArtEngine;

/// Convert image from file path to ASCII art
#[tauri::command]
pub async fn convert_ascii_art_from_path(
    params: AsciiArtParams,
    image_path: String,
) -> Result<crate::model::ascii_art_state::AsciiArtOutput, String> {
    tokio::task::spawn_blocking(move || {
        let img = image::open(&image_path).map_err(|e| e.to_string())?;
        AsciiArtEngine::convert_from_image(&params, &img)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Save image bytes to temp file, convert, and return (temp_path, output)
#[tauri::command]
pub async fn save_temp_image_and_convert(
    params: AsciiArtParams,
    image_bytes: Vec<u8>,
) -> Result<(String, crate::model::ascii_art_state::AsciiArtOutput), String> {
    tokio::task::spawn_blocking(move || {
        let temp_dir = std::env::temp_dir();
        let filename = format!("ascii_art_{}.png", uuid::Uuid::new_v4());
        let temp_path = temp_dir.join(&filename);
        std::fs::write(&temp_path, &image_bytes).map_err(|e| e.to_string())?;

        let img = image::load_from_memory(&image_bytes).map_err(|e| e.to_string())?;
        let output = AsciiArtEngine::convert_from_image(&params, &img)?;
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
        let output = AsciiArtEngine::convert_from_image(&params, &img)?;

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

        std::fs::write(&path, content).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
