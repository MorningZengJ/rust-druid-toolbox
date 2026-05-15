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
    files
        .iter()
        .map(|f| {
            let new_name = rename_logic::apply_replace_rules(&f.name, &rules);
            (f.name.clone(), new_name)
        })
        .collect()
}

/// Detect conflicts in rename results
#[tauri::command]
pub fn detect_conflicts(files: Vec<FileInfo>, rules: Vec<ReplaceInfo>) -> Vec<(String, Vec<usize>)> {
    let mut target_map: std::collections::HashMap<String, Vec<usize>> =
        std::collections::HashMap::new();

    for (i, file) in files.iter().enumerate() {
        let new_name = rename_logic::apply_replace_rules(&file.name, &rules);
        target_map.entry(new_name).or_default().push(i);
    }

    target_map
        .into_iter()
        .filter(|(_, indices)| indices.len() > 1)
        .collect()
}

/// Execute rename operations
#[tauri::command]
pub fn execute_renames(
    dir_path: String,
    files: Vec<FileInfo>,
    rules: Vec<ReplaceInfo>,
) -> RenameResult {
    let mut result = RenameResult {
        total: files.len(),
        success: 0,
        errors: vec![],
    };

    for file in &files {
        let new_name = rename_logic::apply_replace_rules(&file.name, &rules);
        if new_name == file.name {
            result.success += 1;
            continue;
        }

        let old_path = CommonUtils::join_path(&dir_path, &file.name);
        let new_path = CommonUtils::join_path(&dir_path, &new_name);

        match std::fs::rename(&old_path, &new_path) {
            Ok(()) => result.success += 1,
            Err(e) => result.errors.push(crate::model::rename_result::RenameError {
                file_name: file.name.clone(),
                error: e.to_string(),
            }),
        }
    }

    result
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
