use serde::{Deserialize, Serialize};

#[derive(Clone, Default, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameResult {
    pub total: usize,
    pub success: usize,
    pub errors: Vec<RenameError>,
}

#[derive(Clone, Default, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameError {
    pub file_name: String,
    pub error: String,
}
