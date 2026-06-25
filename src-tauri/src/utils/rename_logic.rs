use std::collections::HashMap;

use fancy_regex::Regex;

use crate::model::{
    file_info::FileInfo, rename_result::RenameError, rename_result::RenameResult,
    replace_info::ReplaceInfo,
};
use crate::utils::common_utils::CommonUtils;

/// Apply a list of replace rules to a filename sequentially
pub fn apply_replace_rules(name: &str, rules: &[ReplaceInfo]) -> String {
    let mut result = name.to_string();

    for rule in rules {
        if !rule.enable {
            continue;
        }

        if rule.is_regex {
            if let Ok(re) = Regex::new(&rule.content) {
                result = re.replace_all(&result, rule.target.as_str()).to_string();
            }
        } else {
            result = result.replace(&rule.content, &rule.target);
        }
    }

    result
}

/// Validate a regex pattern
pub fn validate_regex(pattern: &str) -> bool {
    Regex::new(pattern).is_ok()
}

/// Preview rename results for a set of files and rules
pub fn preview_renames(files: &[FileInfo], rules: &[ReplaceInfo]) -> Vec<(String, String)> {
    files
        .iter()
        .map(|f| {
            let new_name = apply_replace_rules(&f.name, rules);
            (f.name.clone(), new_name)
        })
        .collect()
}

/// Detect conflicts in rename results
pub fn detect_conflicts(files: &[FileInfo], rules: &[ReplaceInfo]) -> Vec<(String, Vec<usize>)> {
    let mut target_map: HashMap<String, Vec<usize>> = HashMap::new();

    for (i, file) in files.iter().enumerate() {
        let new_name = apply_replace_rules(&file.name, rules);
        target_map.entry(new_name).or_default().push(i);
    }

    target_map
        .into_iter()
        .filter(|(_, indices)| indices.len() > 1)
        .collect()
}

/// Execute rename operations
pub fn execute_renames(dir_path: &str, files: &[FileInfo], rules: &[ReplaceInfo]) -> RenameResult {
    let mut result = RenameResult {
        total: files.len(),
        success: 0,
        errors: vec![],
    };

    for file in files {
        let new_name = apply_replace_rules(&file.name, rules);
        if new_name == file.name {
            result.success += 1;
            continue;
        }

        let old_path = CommonUtils::join_path(dir_path, &file.name);
        let new_path = CommonUtils::join_path(dir_path, &new_name);

        match std::fs::rename(&old_path, &new_path) {
            Ok(()) => result.success += 1,
            Err(e) => result.errors.push(RenameError {
                file_name: file.name.clone(),
                error: e.to_string(),
            }),
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    fn make_rule(content: &str, target: &str, is_regex: bool, enable: bool) -> ReplaceInfo {
        ReplaceInfo {
            id: Uuid::new_v4(),
            content: content.to_string(),
            target: target.to_string(),
            enable,
            is_regex,
            is_error: false,
        }
    }

    #[test]
    fn test_plain_replace() {
        let rules = vec![make_rule("old", "new", false, true)];
        assert_eq!(apply_replace_rules("old_file.txt", &rules), "new_file.txt");
    }

    #[test]
    fn test_regex_replace() {
        let rules = vec![make_rule(r"\d+", "X", true, true)];
        assert_eq!(apply_replace_rules("file123.txt", &rules), "fileX.txt");
    }

    #[test]
    fn test_disabled_rule() {
        let rules = vec![make_rule("old", "new", false, false)];
        assert_eq!(apply_replace_rules("old_file.txt", &rules), "old_file.txt");
    }

    #[test]
    fn test_multiple_rules() {
        let rules = vec![
            make_rule(" ", "_", false, true),
            make_rule(".txt", ".md", false, true),
        ];
        assert_eq!(apply_replace_rules("my file.txt", &rules), "my_file.md");
    }

    #[test]
    fn test_no_match() {
        let rules = vec![make_rule("xyz", "abc", false, true)];
        assert_eq!(apply_replace_rules("file.txt", &rules), "file.txt");
    }

    #[test]
    fn test_empty_rules() {
        let rules = vec![];
        assert_eq!(apply_replace_rules("file.txt", &rules), "file.txt");
    }

    #[test]
    fn test_validate_regex_valid() {
        assert!(validate_regex(r"\d+"));
    }

    #[test]
    fn test_validate_regex_invalid() {
        assert!(!validate_regex("[invalid"));
    }
}
