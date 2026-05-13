use crate::model::file_info::FileInfo;
use crate::model::replace_info::ReplaceInfo;
use crate::utils::common_utils::CommonUtils;
use fancy_regex::Regex;

#[derive(Clone, Default, Debug)]
pub struct RenameState {
    pub dir_path: String,
    pub filter: (String, bool),
    pub file_list: Vec<FileInfo>,
    pub filter_file_list: Vec<FileInfo>,
    pub selected_file: Option<FileInfo>,
    pub replace_infos: Vec<ReplaceInfo>,
}

impl RenameState {
    pub fn new() -> Self {
        Self {
            replace_infos: vec![ReplaceInfo::new()],
            ..Default::default()
        }
    }

    pub fn set_dir_path(&mut self, path: &str) {
        self.dir_path = path.to_string();
    }

    pub fn get_filter_file_list(&mut self) {
        let (filter, is_regex) = &self.filter;
        let mut reg_opt = None;
        if !filter.is_empty() && *is_regex {
            if let Ok(regex) = Regex::new(filter) {
                reg_opt = Some(regex);
            }
        }
        self.filter_file_list = if filter.is_empty() {
            self.file_list.clone()
        } else {
            self.file_list
                .iter()
                .filter(|info| {
                    if let Some(regex) = &reg_opt {
                        if let Ok(ma) = regex.is_match(&info.name) {
                            return ma;
                        }
                        true
                    } else {
                        info.name.contains(filter)
                    }
                })
                .cloned()
                .collect()
        };
    }

    pub fn parent_path(&mut self) {
        self.dir_path = CommonUtils::parent_path(&self.dir_path);
    }
}
