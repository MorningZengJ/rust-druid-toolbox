use crate::model::file_info::FileInfo;
use crate::model::replace_info::ReplaceInfo;
use crate::ui::rename::logic;
use crate::utils::common_utils::CommonUtils;
use fancy_regex::Regex;
use std::collections::HashMap;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum QuickFilter {
    All,
    Folder,
    File,
    Extension(String),
}

impl QuickFilter {
    pub fn display_name(&self) -> String {
        match self {
            QuickFilter::All => "全部".to_string(),
            QuickFilter::Folder => "文件夹".to_string(),
            QuickFilter::File => "文件".to_string(),
            QuickFilter::Extension(ext) => ext.clone(),
        }
    }
}

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
#[allow(dead_code)]
pub struct ConflictInfo {
    pub target_name: String,
    pub source_indices: Vec<usize>,
}

#[derive(Clone, Debug)]
pub struct RenameState {
    pub dir_path: String,
    pub filter_items: Vec<FilterItem>,
    pub filter_collapsed: bool,
    pub quick_filters: Vec<QuickFilter>,
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
    pub display_limit: usize,
}

impl Default for RenameState {
    fn default() -> Self {
        Self {
            dir_path: String::new(),
            filter_items: Vec::new(),
            filter_collapsed: false,
            quick_filters: vec![QuickFilter::All],
            file_list: Vec::new(),
            filter_file_list: Vec::new(),
            selected_file: None,
            replace_infos: Vec::new(),
            status: None,
            show_confirm: false,
            rule_history: Vec::new(),
            max_history: 50,
            conflicts: Vec::new(),
            rules_collapsed: Vec::new(),
            display_limit: 500,
        }
    }
}

impl RenameState {
    pub fn new() -> Self {
        Self {
            filter_items: vec![FilterItem::new()],
            replace_infos: vec![ReplaceInfo::new()],
            rules_collapsed: vec![false],
            ..Default::default()
        }
    }

    pub fn toggle_quick_filter(&mut self, filter: QuickFilter) {
        match &filter {
            QuickFilter::All => {
                // 选择"全部"时清空其他选项
                self.quick_filters = vec![QuickFilter::All];
            }
            _ => {
                // 选择其他选项时，移除"全部"
                self.quick_filters.retain(|f| *f != QuickFilter::All);
                // 切换选中状态
                if let Some(pos) = self.quick_filters.iter().position(|f| *f == filter) {
                    self.quick_filters.remove(pos);
                } else {
                    self.quick_filters.push(filter);
                }
                // 如果没有任何选择，恢复"全部"
                if self.quick_filters.is_empty() {
                    self.quick_filters = vec![QuickFilter::All];
                }
            }
        }
    }

    #[allow(dead_code)]
    pub fn set_dir_path(&mut self, path: &str) {
        self.dir_path = path.to_string();
    }

    pub fn update_filter_file_list(&mut self) {
        self.filter_file_list = self.get_filtered_files();
        self.sort_file_list();
    }

    pub fn available_extensions(&self) -> Vec<String> {
        let mut exts: Vec<String> = self.file_list
            .iter()
            .filter(|f| !f.is_dir && !f.extension.is_empty())
            .map(|f| f.extension.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();
        exts.sort();
        exts
    }

    fn sort_file_list(&mut self) {
        self.filter_file_list.sort_by(|a, b| {
            // 1. 文件夹优先
            b.is_dir.cmp(&a.is_dir)
                // 2. 名称排序（不区分大小写）
                .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });
    }

    fn get_filtered_files(&self) -> Vec<FileInfo> {
        let has_keyword_filter = !self.filter_items.is_empty()
            && self.filter_items.iter().any(|f| !f.keyword.is_empty());
        let has_quick_filter = !self.quick_filters.is_empty()
            && !self.quick_filters.contains(&QuickFilter::All);

        self.file_list
            .iter()
            .filter(|info| {
                // Quick filter (multi-select)
                if has_quick_filter {
                    let matched = self.quick_filters.iter().any(|filter| match filter {
                        QuickFilter::All => true,
                        QuickFilter::Folder => info.is_dir,
                        QuickFilter::File => !info.is_dir,
                        QuickFilter::Extension(ext) => !info.is_dir && info.extension == *ext,
                    });
                    if !matched {
                        return false;
                    }
                }

                // Keyword filter
                if has_keyword_filter {
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
                } else {
                    true
                }
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

    #[allow(dead_code)]
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

    #[allow(dead_code)]
    pub fn has_more_files(&self) -> bool {
        self.filter_file_list.len() > self.display_limit
    }

    pub fn load_more(&mut self) {
        self.display_limit = (self.display_limit + 500).min(self.filter_file_list.len());
    }
}
