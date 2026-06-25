use serde::{Deserialize, Serialize};

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
    pub fn to_replace_info(&self) -> ReplaceInfo {
        match self {
            Self::AddPrefixNumber => ReplaceInfo::new("".to_string(), "{n}_".to_string(), false),
            Self::AddSuffixNumber => ReplaceInfo::new("".to_string(), "_{n}".to_string(), false),
            Self::SpaceToUnderscore => ReplaceInfo::new(" ".to_string(), "_".to_string(), false),
            Self::ToLowercase => ReplaceInfo::new("".to_string(), "".to_string(), false),
            Self::RemoveDigitsBeforeExt => {
                ReplaceInfo::new(r"\d+(?=\.\w+$)".to_string(), "".to_string(), true)
            }
            Self::Custom => ReplaceInfo::default(),
        }
    }
}
