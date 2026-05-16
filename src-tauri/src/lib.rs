mod commands;
mod model;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init());

    #[cfg(not(feature = "video-frame"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        // Rename commands
        commands::rename::list_files,
        commands::rename::preview_renames,
        commands::rename::detect_conflicts,
        commands::rename::execute_renames,
        commands::rename::validate_regex,
        commands::rename::apply_rule_template,
        commands::rename::parent_path,
        // ASCII art commands
        commands::ascii_art::convert_ascii_art,
        commands::ascii_art::load_image_from_file,
        commands::ascii_art::export_ascii_art,
        commands::ascii_art::write_binary_file,
    ]);

    #[cfg(feature = "video-frame")]
    let builder = builder.invoke_handler(tauri::generate_handler![
        // Rename commands
        commands::rename::list_files,
        commands::rename::preview_renames,
        commands::rename::detect_conflicts,
        commands::rename::execute_renames,
        commands::rename::validate_regex,
        commands::rename::apply_rule_template,
        commands::rename::parent_path,
        // ASCII art commands
        commands::ascii_art::convert_ascii_art,
        commands::ascii_art::load_image_from_file,
        commands::ascii_art::export_ascii_art,
        commands::ascii_art::write_binary_file,
        // Video frame commands
        commands::video_frame::check_ffmpeg,
        commands::video_frame::probe_video,
        commands::video_frame::extract_frames,
        commands::video_frame::export_frames,
    ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
