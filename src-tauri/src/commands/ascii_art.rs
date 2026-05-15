use crate::model::ascii_art_state::AsciiArtParams;
use crate::utils::ascii_art_engine::{AsciiArtEngine, AsciiArtOutput};

/// Convert image bytes to ASCII art
#[tauri::command]
pub async fn convert_ascii_art(
    params: AsciiArtParams,
    image_bytes: Vec<u8>,
) -> Result<AsciiArtOutput, String> {
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
