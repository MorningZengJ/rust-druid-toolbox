use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Default, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplaceInfo {
    pub id: Uuid,
    pub content: String,
    pub target: String,
    pub enable: bool,
    pub is_regex: bool,
    pub is_error: bool,
}

impl ReplaceInfo {
    pub fn new(content: String, target: String, is_regex: bool) -> Self {
        Self {
            id: Uuid::new_v4(),
            content,
            target,
            enable: true,
            is_regex,
            is_error: false,
        }
    }
}
