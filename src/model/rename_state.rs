use crate::model::file_info::FileInfo;
use crate::model::rename_result::RenameResult;
use crate::model::replace_info::ReplaceInfo;
use crate::utils::common_utils::CommonUtils;
use fancy_regex::Regex;

#[derive(Clone, Debug)]
pub struct FilterItem {
    pub keyword: String,
    pub is_regex: bool,
}

impl Default for FilterItem {
    fn default() -> Self {
        Self {
            keyword: String::new(),
            is_regex: false,
        }
    }
}

impl FilterItem {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn summary(&self) -> String {
        if self.keyword.is_empty() {
            return "空条件".to_string();
        }
        let prefix = if self.is_regex { "正则: " } else { "" };
        format!("{}{}", prefix, self.keyword)
    }
}

#[derive(Clone, Default, Debug)]
pub struct RenameState {
    pub dir_path: String,
    pub filter_items: Vec<FilterItem>,
    pub filter_collapsed: bool,
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
            filter_items: vec![FilterItem::new()],
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
        if self.filter_items.is_empty() || self.filter_items.iter().all(|f| f.keyword.is_empty()) {
            return self.file_list.clone();
        }

        self.file_list
            .iter()
            .filter(|info| {
                self.filter_items.iter().all(|filter| {
                    if filter.keyword.is_empty() {
                        return true;
                    }
                    let reg_opt = if filter.is_regex {
                        Regex::new(&filter.keyword).ok()
                    } else {
                        None
                    };
                    if let Some(regex) = &reg_opt {
                        regex.is_match(&info.name).unwrap_or(true)
                    } else {
                        info.name.contains(&filter.keyword)
                    }
                })
            })
            .cloned()
            .collect()
    }

    pub fn filter_summary(&self) -> String {
        let active_filters: Vec<&FilterItem> = self.filter_items
            .iter()
            .filter(|f| !f.keyword.is_empty())
            .collect();
        if active_filters.is_empty() {
            return "无过滤条件".to_string();
        }
        active_filters.iter()
            .map(|f| f.summary())
            .collect::<Vec<_>>()
            .join(" + ")
    }

    pub fn parent_path(&self) -> String {
        CommonUtils::parent_path(&self.dir_path)
    }
}
