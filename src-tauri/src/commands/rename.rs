use crate::model::{
    file_info::FileInfo, rename_result::RenameResult, replace_info::ReplaceInfo,
    rule_template::RuleTemplate,
};
use crate::utils::{common_utils::CommonUtils, file_utils::FileUtils, rename_logic};

/// List files in a directory
#[tauri::command]
pub fn list_files(path: String) -> Vec<FileInfo> {
    FileUtils::list_files(&path)
}

/// Preview rename results for a set of files and rules
#[tauri::command]
pub fn preview_renames(files: Vec<FileInfo>, rules: Vec<ReplaceInfo>) -> Vec<(String, String)> {
    rename_logic::preview_renames(&files, &rules)
}

/// Detect conflicts in rename results
#[tauri::command]
pub fn detect_conflicts(files: Vec<FileInfo>, rules: Vec<ReplaceInfo>) -> Vec<(String, Vec<usize>)> {
    rename_logic::detect_conflicts(&files, &rules)
}

/// Execute rename operations
#[tauri::command]
pub fn execute_renames(
    dir_path: String,
    files: Vec<FileInfo>,
    rules: Vec<ReplaceInfo>,
) -> RenameResult {
    rename_logic::execute_renames(&dir_path, &files, &rules)
}

/// Validate a regex pattern
#[tauri::command]
pub fn validate_regex(pattern: String) -> bool {
    rename_logic::validate_regex(&pattern)
}

/// Get a ReplaceInfo from a rule template
#[tauri::command]
pub fn apply_rule_template(template: RuleTemplate) -> ReplaceInfo {
    template.to_replace_info()
}

/// Get parent path
#[tauri::command]
pub fn parent_path(path: String) -> String {
    CommonUtils::parent_path(&path)
}
