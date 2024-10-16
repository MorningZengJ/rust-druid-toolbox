use std::path::Path;

pub struct CommonUtils;

impl CommonUtils {
    pub fn parent_path(path: &str) -> String {
        if let Some(parent) = Path::new(path).parent() {
            if let Some(path) = parent.to_str() {
                return path.to_string()
            }
        }
        path.to_string()
    }

    pub fn join_path(path: &str, name: &str) -> String {
        let path_buf = Path::new(path).join(name);
        path_buf.to_str().expect("join exception").to_string()
    }
}