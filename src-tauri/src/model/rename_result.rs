use serde::{Deserialize, Serialize};

#[derive(Clone, Default, Debug, Serialize, Deserialize)]
pub struct RenameResult {
    pub total: usize,
    pub success: usize,
    pub errors: Vec<RenameError>,
}

#[derive(Clone, Default, Debug, Serialize, Deserialize)]
pub struct RenameError {
    pub file_name: String,
    pub error: String,
}

impl RenameResult {
    pub fn is_success(&self) -> bool {
        self.errors.is_empty()
    }

    pub fn summary(&self) -> String {
        if self.is_success() {
            format!("成功重命名 {} 个文件", self.success)
        } else {
            format!(
                "完成 {}/{} 个文件，{} 个失败",
                self.success,
                self.total,
                self.errors.len()
            )
        }
    }
}
