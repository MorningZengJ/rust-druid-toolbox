use crate::model::file_info::FileInfo;
use crate::model::rename_result::RenameResult;
use crate::model::replace_info::ReplaceInfo;
use crate::utils::common_utils::CommonUtils;
use fancy_regex::Regex;

#[derive(Clone, Default, Debug)]
pub struct FilterConfig {
    pub keyword: String,
    pub is_regex: bool,
}

#[derive(Clone, Default, Debug)]
pub struct RenameState {
    pub dir_path: String,
    pub filter: FilterConfig,
    pub file_list: Vec<FileInfo>,
    pub filter_file_list: Vec<FileInfo>,
    pub selected_file: Option<FileInfo>,
    pub replace_infos: Vec<ReplaceInfo>,
    pub status: Option<RenameResult>,
    pub show_confirm: bool,
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

    pub fn update_filter_file_list(&mut self) {
        self.filter_file_list = self.get_filtered_files();
    }

    fn get_filtered_files(&self) -> Vec<FileInfo> {
        let FilterConfig { keyword, is_regex } = &self.filter;
        if keyword.is_empty() {
            return self.file_list.clone();
        }

        let reg_opt = if *is_regex {
            Regex::new(keyword).ok()
        } else {
            None
        };

        self.file_list
            .iter()
            .filter(|info| {
                if let Some(regex) = &reg_opt {
                    regex.is_match(&info.name).unwrap_or(true)
                } else {
                    info.name.contains(keyword)
                }
            })
            .cloned()
            .collect()
    }

    pub fn parent_path(&self) -> String {
        CommonUtils::parent_path(&self.dir_path)
    }
}
