use druid::{Data, Lens};

#[derive(Clone, Data, Lens, Default)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub parent_path: String,
    pub is_dir: bool,
    pub extension: String,
    pub size: String,
    pub created_time: u64,
    pub modified_time: u64,
}