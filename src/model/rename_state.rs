use crate::model::file_info::FileInfo;
use crate::model::replace_info::ReplaceInfo;
use crate::ui::rename::logic;
use crate::utils::common_utils::CommonUtils;
use fancy_regex::Regex;
use std::collections::HashMap;

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

#[derive(Clone, Debug, Default)]
pub struct ConflictInfo {
    pub target_name: String,
    pub source_indices: Vec<usize>,
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
    pub status: Option<crate::model::rename_result::RenameResult>,
    pub show_confirm: bool,

    // Undo system
    pub rule_history: Vec<Vec<ReplaceInfo>>,
    pub max_history: usize,

    // Conflict detection
    pub conflicts: Vec<ConflictInfo>,

    // Layout state
    pub rules_collapsed: Vec<bool>,
    pub left_panel_width: f32,
    pub display_limit: usize,
}

impl RenameState {
    pub fn new() -> Self {
        Self {
            filter_items: vec![FilterItem::new()],
            replace_infos: vec![ReplaceInfo::new()],
            max_history: 50,
            rules_collapsed: vec![false],
            left_panel_width: 320.0,
            display_limit: 500,
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

    // Undo system

    pub fn push_rule_history(&mut self) {
        self.rule_history.push(self.replace_infos.clone());
        if self.rule_history.len() > self.max_history {
            self.rule_history.remove(0);
        }
    }

    pub fn pop_rule_history(&mut self) -> Option<Vec<ReplaceInfo>> {
        self.rule_history.pop()
    }

    // Conflict detection

    pub fn detect_conflicts(&mut self) {
        let mut map: HashMap<String, Vec<usize>> = HashMap::new();

        for (i, file) in self.filter_file_list.iter().enumerate() {
            let new_name = logic::apply_replace_rules(&file.name, &self.replace_infos);
            if new_name != file.name {
                map.entry(new_name).or_default().push(i);
            }
        }

        self.conflicts = map
            .into_iter()
            .filter(|(_, indices)| indices.len() > 1)
            .map(|(target_name, source_indices)| ConflictInfo {
                target_name,
                source_indices,
            })
            .collect();
    }

    pub fn is_conflict_row(&self, index: usize) -> bool {
        self.conflicts
            .iter()
            .any(|c| c.source_indices.contains(&index))
    }

    // Rule collapse

    pub fn sync_rules_collapsed(&mut self) {
        while self.rules_collapsed.len() < self.replace_infos.len() {
            self.rules_collapsed.push(false);
        }
        while self.rules_collapsed.len() > self.replace_infos.len() {
            self.rules_collapsed.pop();
        }
    }

    pub fn toggle_rule_collapse(&mut self, index: usize) {
        if let Some(collapsed) = self.rules_collapsed.get_mut(index) {
            *collapsed = !*collapsed;
        }
    }

    // Display limit

    pub fn visible_file_count(&self) -> usize {
        self.filter_file_list.len().min(self.display_limit)
    }

    pub fn has_more_files(&self) -> bool {
        self.filter_file_list.len() > self.display_limit
    }

    pub fn load_more(&mut self) {
        self.display_limit = (self.display_limit + 500).min(self.filter_file_list.len());
    }
}
