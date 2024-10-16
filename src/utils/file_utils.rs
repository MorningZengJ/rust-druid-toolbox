use crate::model::file_info::FileInfo;
use im::{vector, Vector};
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct FileUtils;

impl FileUtils {
    pub fn list_files<P: AsRef<Path>>(path: P) -> Vector<FileInfo> {
        match fs::read_dir(path) {
            Ok(iters) => {
                iters.filter_map(|entry| entry.ok())
                    .map(|entry| {
                        let file_type = entry.file_type().expect("Unable to get file type");
                        let metadata = entry.metadata().expect("Unable to get metadata");
                        let modified_time = metadata
                            .modified()
                            .unwrap_or(SystemTime::UNIX_EPOCH)
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs();
                        let created_time = metadata
                            .created()
                            .unwrap_or(SystemTime::UNIX_EPOCH)
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs();

                        FileInfo {
                            name: entry.file_name().into_string().unwrap_or_default(),
                            path: entry.path().to_str().unwrap_or_default().to_string(),
                            is_dir: file_type.is_dir(),
                            extension: entry.path().extension().and_then(|ext| ext.to_str()).unwrap_or_default().to_string(),
                            size: metadata.len(),
                            created_time,
                            modified_time,
                        }
                    })
                    .collect::<Vector<FileInfo>>()
            }
            Err(_) => {
                vector![]
            }
        }
    }
}