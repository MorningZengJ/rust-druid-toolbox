use crate::model::replace_info::ReplaceInfo;
use fancy_regex::Regex;

/// 对单个文件名应用所有启用的替换规则
pub fn apply_replace_rules(name: &str, rules: &[ReplaceInfo]) -> String {
    let mut result = name.to_string();
    for rule in rules {
        if rule.enable {
            result = if rule.is_regex {
                match Regex::new(&rule.content) {
                    Ok(regex) => regex.replace_all(&result, rule.target.clone()).to_string(),
                    Err(_) => result,
                }
            } else {
                result.replace(&rule.content, &rule.target)
            };
        }
    }
    result
}

/// 验证正则表达式是否有效
pub fn validate_regex(pattern: &str) -> bool {
    Regex::new(pattern).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_rule(content: &str, target: &str, enable: bool, is_regex: bool) -> ReplaceInfo {
        ReplaceInfo {
            id: uuid::Uuid::new_v4(),
            content: content.to_string(),
            target: target.to_string(),
            enable,
            is_regex,
            is_error: false,
        }
    }

    #[test]
    fn test_replace_plain_text() {
        let rules = vec![make_rule("old", "new", true, false)];
        assert_eq!(apply_replace_rules("old_file.txt", &rules), "new_file.txt");
    }

    #[test]
    fn test_replace_regex() {
        let rules = vec![make_rule(r"\d+", "NUM", true, true)];
        assert_eq!(apply_replace_rules("file123.txt", &rules), "fileNUM.txt");
    }

    #[test]
    fn test_replace_disabled_rule() {
        let rules = vec![make_rule("old", "new", false, false)];
        assert_eq!(apply_replace_rules("old_file.txt", &rules), "old_file.txt");
    }

    #[test]
    fn test_replace_multiple_rules() {
        let rules = vec![
            make_rule("foo", "bar", true, false),
            make_rule("bar", "baz", true, false),
        ];
        assert_eq!(apply_replace_rules("foo.txt", &rules), "baz.txt");
    }

    #[test]
    fn test_replace_no_match() {
        let rules = vec![make_rule("xyz", "abc", true, false)];
        assert_eq!(apply_replace_rules("file.txt", &rules), "file.txt");
    }

    #[test]
    fn test_replace_empty_rules() {
        assert_eq!(apply_replace_rules("file.txt", &[]), "file.txt");
    }

    #[test]
    fn test_validate_regex_valid() {
        assert!(validate_regex(r"\d+"));
        assert!(validate_regex(r"[a-z]+"));
    }

    #[test]
    fn test_validate_regex_invalid() {
        assert!(!validate_regex(r"[invalid"));
        assert!(!validate_regex(r"(?P<>)"));
    }
}
