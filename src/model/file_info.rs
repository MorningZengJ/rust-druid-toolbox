use crate::utils::date_utils::DateUtils;
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

impl FileInfo {
    pub fn modified_time_f(&self) -> String {
        DateUtils::format_by_pattern(self.modified_time * 1_000, DateUtils::YYYY_MM_DD_HH_MM)
    }
}