use fancy_regex::Regex;

use crate::model::replace_info::ReplaceInfo;

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
        assert_eq!(
            apply_replace_rules("my file.txt", &rules),
            "my_file.md"
        );
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
