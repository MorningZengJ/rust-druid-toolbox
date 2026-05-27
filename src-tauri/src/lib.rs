mod commands;
mod model;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|_app| {
            // Clean up ASCII art temp directory on startup
            let temp_dir = std::env::temp_dir().join("druid_ascii_art");
            if temp_dir.exists() {
                if let Err(e) = std::fs::remove_dir_all(&temp_dir) {
                    eprintln!("清理临时目录失败: {}", e);
                }
            }
            Ok(())
        });

    // R9: Feature-gate managed state
    #[cfg(feature = "video-frame")]
    let builder = builder.manage(commands::video_frame::FrameWatcherState::new());

    // R9: Feature-gate commands in handler
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
        commands::ascii_art::convert_ascii_art_from_path,
        commands::ascii_art::save_temp_image_and_convert,
        commands::ascii_art::load_image_from_file,
        commands::ascii_art::export_ascii_art,
        commands::ascii_art::write_binary_file,
        commands::ascii_art::cleanup_ascii_art_file,
        // Video frame commands
        commands::video_frame::check_ffmpeg,
        commands::video_frame::probe_video,
        commands::video_frame::extract_frames,
        commands::video_frame::start_frame_watcher,
        commands::video_frame::stop_frame_watcher,
        // Video tool commands
        commands::video_tool::check_video_encoders,
        commands::video_tool::merge_videos,
        commands::video_tool::images_to_video,
        commands::video_tool::convert_format,
        commands::video_tool::batch_convert_format,
        commands::video_utils::list_images_in_folder,
        commands::video_utils::list_media_files_in_folder,
    ]);

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
        commands::ascii_art::convert_ascii_art_from_path,
        commands::ascii_art::save_temp_image_and_convert,
        commands::ascii_art::load_image_from_file,
        commands::ascii_art::export_ascii_art,
        commands::ascii_art::write_binary_file,
        commands::ascii_art::cleanup_ascii_art_file,
        // Video tool commands
        commands::video_utils::list_images_in_folder,
        commands::video_utils::list_media_files_in_folder,
    ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
