use druid::{Data, Lens};

#[derive(Clone, Data, Lens, Default)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: String,
    pub size: u64,
    pub created_time: i64,
    pub modified_time: i64,
}