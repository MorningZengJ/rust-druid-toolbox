use serde::{Deserialize, Serialize};
use std::fmt;

use super::replace_info::ReplaceInfo;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RuleTemplate {
    AddPrefixNumber,
    AddSuffixNumber,
    SpaceToUnderscore,
    ToLowercase,
    RemoveDigitsBeforeExt,
    Custom,
}

impl RuleTemplate {
    pub fn all() -> Vec<Self> {
        vec![
            Self::AddPrefixNumber,
            Self::AddSuffixNumber,
            Self::SpaceToUnderscore,
            Self::ToLowercase,
            Self::RemoveDigitsBeforeExt,
            Self::Custom,
        ]
    }

    pub fn display_name(&self) -> &str {
        match self {
            Self::AddPrefixNumber => "添加数字前缀",
            Self::AddSuffixNumber => "添加数字后缀",
            Self::SpaceToUnderscore => "空格转下划线",
            Self::ToLowercase => "转小写",
            Self::RemoveDigitsBeforeExt => "移除扩展名前数字",
            Self::Custom => "自定义",
        }
    }

    pub fn to_replace_info(&self) -> ReplaceInfo {
        match self {
            Self::AddPrefixNumber => ReplaceInfo::new("".to_string(), "{n}_".to_string(), false),
            Self::AddSuffixNumber => ReplaceInfo::new("".to_string(), "_{n}".to_string(), false),
            Self::SpaceToUnderscore => {
                ReplaceInfo::new(" ".to_string(), "_".to_string(), false)
            }
            Self::ToLowercase => {
                ReplaceInfo::new("".to_string(), "".to_string(), false)
            }
            Self::RemoveDigitsBeforeExt => {
                ReplaceInfo::new(r"\d+(?=\.\w+$)".to_string(), "".to_string(), true)
            }
            Self::Custom => ReplaceInfo::default(),
        }
    }
}

impl fmt::Display for RuleTemplate {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.display_name())
    }
}
