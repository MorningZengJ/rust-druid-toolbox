use serde::{Deserialize, Serialize};

#[derive(Clone, Default, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub parent_path: String,
    pub is_dir: bool,
    pub extension: String,
    pub size: String,
    pub size_bytes: u64,
    pub created_time: u64,
    pub modified_time: u64,
}
