use std::path::Path;

pub struct CommonUtils;

impl CommonUtils {
    pub fn parent_path(path: &str) -> String {
        Path::new(path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| path.to_string())
    }

    pub fn join_path(path: &str, name: &str) -> String {
        Path::new(path)
            .join(name)
            .to_string_lossy()
            .to_string()
    }
}
