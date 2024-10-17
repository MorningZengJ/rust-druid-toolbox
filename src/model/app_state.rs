use crate::additional_directory;
use crate::model::file_info::FileInfo;
use crate::model::replace_info::ReplaceInfo;
use crate::traits::directory_choose::DirectoryChoose;
use druid::{Data, Lens};
use im::{vector, Vector};
use regex::Regex;

#[derive(Clone, Data, Lens)]
pub struct AppState {
    pub(crate) rename_state: RenameState,

}


#[derive(Clone, Data, Lens, Default)]
pub struct RenameState {
    pub(crate) dir_path: String,
    pub(crate) filter: (String, bool),
    pub(crate) file_list: Vector<FileInfo>,
    pub(crate) filter_file_list: Vector<FileInfo>,
    pub(crate) selected_file: Option<FileInfo>,
    pub(crate) replace_infos: Vector<ReplaceInfo>,
}
additional_directory!(RenameState);

impl RenameState {
    pub fn new() -> Self {
        Self {
            replace_infos: vector![
                ReplaceInfo::new()
            ],
            ..Default::default()
        }
    }

    pub fn get_filter_file_list(&mut self) {
        let (filter, is_regex) = &self.filter;
        let mut reg_opt = None;
        if !filter.is_empty() && *is_regex {
            if let Ok(regex) = Regex::new(&filter) {
                reg_opt = Some(regex);
            }
        }
        self.filter_file_list = if filter.is_empty() {
            self.file_list.clone()
        } else {
            self.file_list.iter().filter(|info| {
                if let Some(regex) = &reg_opt { regex.is_match(&*info.name) } else { info.name.contains(filter) }
            }).cloned().collect()
        };
    }
}