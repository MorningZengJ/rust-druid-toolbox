use crate::model::file_info::FileInfo;
use crate::utils::common_utils::CommonUtils;
use im::{vector, Vector};
use std::fs::{DirEntry, FileType, Metadata};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use std::{fs, io};

pub struct FileUtils {
    entry: DirEntry,
    file_type: FileType,
    metadata: Option<Metadata>,
}

impl FileUtils {
    const KB: u64 = 1024;
    const MB: u64 = 1048576;
    const GB: u64 = 1073741824;

    fn new(entry: DirEntry) -> FileUtils {
        Self {
            file_type: entry.file_type().expect("Unable to get file type"),
            metadata: entry.metadata().ok(),
            entry,
        }
    }

    pub fn list_files<P: AsRef<Path>>(path: P) -> Vector<FileInfo> {
        match fs::read_dir(path) {
            Ok(iters) => {
                iters.filter_map(|entry| entry.ok())
                    .map(|entry| {
                        let path = entry.path().to_str().unwrap_or_default().to_string();
                        let entity = Self::new(entry);

                        FileInfo {
                            name: entity.name(),
                            path: path.clone(),
                            parent_path: CommonUtils::parent_path(&path),
                            is_dir: entity.file_type.is_dir(),
                            extension: entity.extension(),
                            size: entity.file_size(),
                            created_time: entity.timestamp(|metadata: &Metadata| { metadata.created() }),
                            modified_time: entity.timestamp(|metadata: &Metadata| { metadata.modified() }),
                            ..Default::default()
                        }
                    })
                    .collect::<Vector<FileInfo>>()
            }
            Err(_) => {
                vector![]
            }
        }
    }

    pub fn format_size(size: u64) -> String {
        match size {
            _ if size >= Self::GB => format!("{:.2} GB", size as f64 / Self::GB as f64),
            _ if size >= Self::MB => format!("{:.2} MB", size as f64 / Self::MB as f64),
            _ if size >= Self::KB => format!("{:.2} KB", size as f64 / Self::KB as f64),
            _ => format!("{:.2} B", size as f64),
        }
    }

    fn name(&self) -> String {
        self.entry.file_name().into_string().unwrap_or_default()
    }

    fn extension(&self) -> String {
        if self.file_type.is_dir() {
            return "".to_string();
        }
        if let Some(ex) = self.entry.path().extension() {
            if let Some(ext) = ex.to_str() {
                return ext.to_string();
            }
        }
        "".to_string()
    }

    fn file_size(&self) -> String {
        if self.file_type.is_dir() {
            return "".to_string();
        }
        if let Some(metadata) = &self.metadata {
            return Self::format_size(metadata.len());
        }
        "".to_string()
    }

    fn timestamp(&self, callback: fn(meta: &Metadata) -> io::Result<SystemTime>) -> u64 {
        if let Some(metadata) = &self.metadata {
            return callback(metadata).unwrap_or(SystemTime::UNIX_EPOCH)
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
        }
        0
    }
}