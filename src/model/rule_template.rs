use crate::model::replace_info::ReplaceInfo;

#[derive(Debug, Clone, PartialEq)]
pub enum RuleTemplate {
    AddPrefixNumber,
    AddSuffixNumber,
    SpaceToUnderscore,
    ToLowercase,
    RemoveDigitsBeforeExt,
    Custom,
}

impl RuleTemplate {
    pub fn all() -> Vec<RuleTemplate> {
        vec![
            RuleTemplate::AddPrefixNumber,
            RuleTemplate::AddSuffixNumber,
            RuleTemplate::SpaceToUnderscore,
            RuleTemplate::ToLowercase,
            RuleTemplate::RemoveDigitsBeforeExt,
            RuleTemplate::Custom,
        ]
    }

    pub fn display_name(&self) -> &str {
        match self {
            RuleTemplate::AddPrefixNumber => "添加序号前缀",
            RuleTemplate::AddSuffixNumber => "添加序号后缀",
            RuleTemplate::SpaceToUnderscore => "替换空格为下划线",
            RuleTemplate::ToLowercase => "转小写",
            RuleTemplate::RemoveDigitsBeforeExt => "删除扩展名前的数字",
            RuleTemplate::Custom => "自定义...",
        }
    }

    pub fn to_replace_info(&self) -> ReplaceInfo {
        match self {
            RuleTemplate::AddPrefixNumber => ReplaceInfo {
                content: "^".to_string(),
                target: "{n}_".to_string(),
                is_regex: true,
                ..ReplaceInfo::new()
            },
            RuleTemplate::AddSuffixNumber => ReplaceInfo {
                content: "$".to_string(),
                target: "_{n}".to_string(),
                is_regex: true,
                ..ReplaceInfo::new()
            },
            RuleTemplate::SpaceToUnderscore => ReplaceInfo {
                content: " ".to_string(),
                target: "_".to_string(),
                is_regex: false,
                ..ReplaceInfo::new()
            },
            RuleTemplate::ToLowercase => ReplaceInfo {
                content: "(.+)".to_string(),
                target: "\\L$1".to_string(),
                is_regex: true,
                ..ReplaceInfo::new()
            },
            RuleTemplate::RemoveDigitsBeforeExt => ReplaceInfo {
                content: r"\d+(?=\.\w+$)".to_string(),
                target: "".to_string(),
                is_regex: true,
                ..ReplaceInfo::new()
            },
            RuleTemplate::Custom => ReplaceInfo::new(),
        }
    }
}

impl std::fmt::Display for RuleTemplate {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.display_name())
    }
}
