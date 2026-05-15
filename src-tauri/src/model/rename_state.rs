use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum QuickFilter {
    All,
    Folder,
    File,
    Extension(String),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilterItem {
    pub keyword: String,
    pub is_regex: bool,
}

impl Default for FilterItem {
    fn default() -> Self {
        Self {
            keyword: String::new(),
            is_regex: false,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConflictInfo {
    pub target_name: String,
    pub source_indices: Vec<usize>,
}
