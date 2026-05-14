mod file_list;
pub(crate) mod logic;
mod replace_rules;
mod spacing;
mod status_bar;
pub(crate) mod virtual_list;

use crate::model::file_info::FileInfo;
use crate::model::rename_result::{RenameError, RenameResult};
use crate::model::rename_state::{FilterItem, RenameState};
use crate::model::replace_info::ReplaceInfo;
use crate::model::rule_template::RuleTemplate;
use crate::themes::get_theme;
use crate::ui::components::{ButtonType, MButton};
use crate::ui::rename::file_list::FileListMessage;
use crate::ui::rename::virtual_list::VirtualState;
use crate::ui::PageWithNav;
use crate::utils::common_utils::CommonUtils;
use crate::utils::file_utils::FileUtils;
use iced::widget::{
    button, checkbox, column, container, pane_grid, pick_list, row, svg, text, text_input, Space,
};
use iced::{Element, Length, Task};

#[derive(Debug, Clone)]
pub enum Message {
    // Directory
    DirPathChanged(String),
    ChooseDirectory,
    ParentDirectory,

    // Filters
    FilterChanged(usize, String),
    FilterRegexToggled(usize, bool),
    AddFilterItem,
    RemoveFilterItem(usize),
    ToggleFilterCollapsed,

    // File list
    FileListLoaded(Vec<FileInfo>),
    #[allow(dead_code)]
    FileSelected(FileInfo),
    #[allow(dead_code)]
    FileDoubleClicked(FileInfo),
    FileListMessage(FileListMessage),

    // Replace rules
    ReplaceContentChanged(usize, String),
    ReplaceTargetChanged(usize, String),
    ReplaceEnableToggled(usize, bool),
    ReplaceRegexToggled(usize, bool),
    RemoveReplaceItem(usize),
    AddReplaceItem,
    ApplyRuleTemplate(RuleTemplate),
    ClearAllRules,
    ToggleRuleCollapse(usize),

    // Undo
    UndoRuleChange,

    // Layout
    PaneResized(pane_grid::ResizeEvent),

    // Confirm/Status
    ShowConfirmDialog,
    ConfirmRename,
    CancelRename,
    ClearStatus,
}

#[derive(Debug, Clone)]
pub struct Rename {
    state: RenameState,
    virtual_state: VirtualState,
    panes: pane_grid::State<RenamePane>,
}

impl Default for Rename {
    fn default() -> Self {
        Self {
            state: RenameState::new(),
            virtual_state: VirtualState::new(),
            panes: Self::build_panes(),
        }
    }
}

#[derive(Debug, Clone)]
enum RenamePane {
    Rules,
    Preview,
}

impl PageWithNav for Rename {
    type Message = Message;

    fn update(&mut self, msg: Message) -> Task<Message> {
        match msg {
            // Directory
            Message::DirPathChanged(path) => {
                self.state.dir_path = path;
                return self.load_files();
            }
            Message::ChooseDirectory => {
                if let Some(path) = rfd::FileDialog::new().pick_folder() {
                    self.state.dir_path = path.to_string_lossy().to_string();
                    return self.load_files();
                }
            }
            Message::ParentDirectory => {
                self.state.dir_path = self.state.parent_path();
                return self.load_files();
            }

            // Filters
            Message::FilterChanged(index, keyword) => {
                if let Some(filter) = self.state.filter_items.get_mut(index) {
                    filter.keyword = keyword;
                    self.state.update_filter_file_list();
                    self.state.detect_conflicts();
                }
            }
            Message::FilterRegexToggled(index, is_regex) => {
                if let Some(filter) = self.state.filter_items.get_mut(index) {
                    filter.is_regex = is_regex;
                    self.state.update_filter_file_list();
                    self.state.detect_conflicts();
                }
            }
            Message::AddFilterItem => {
                let allow = self
                    .state
                    .filter_items
                    .last()
                    .map(|last| !last.keyword.is_empty())
                    .unwrap_or(true);
                if allow {
                    self.state.filter_items.push(FilterItem::new());
                }
            }
            Message::RemoveFilterItem(index) => {
                if index < self.state.filter_items.len() {
                    self.state.filter_items.remove(index);
                    if self.state.filter_items.is_empty() {
                        self.state.filter_items.push(FilterItem::new());
                    }
                    self.state.update_filter_file_list();
                    self.state.detect_conflicts();
                }
            }
            Message::ToggleFilterCollapsed => {
                self.state.filter_collapsed = !self.state.filter_collapsed;
            }

            // File list
            Message::FileListLoaded(files) => {
                self.state.file_list = files;
                self.state.update_filter_file_list();
                self.state.detect_conflicts();
                self.state.display_limit = 500;
                self.virtual_state.scroll_offset = 0.0;
            }
            Message::FileSelected(file) => {
                self.state.selected_file = Some(file);
            }
            Message::FileDoubleClicked(file) => {
                if file.is_dir {
                    self.state.dir_path = file.path;
                    return self.load_files();
                } else {
                    let _ = std::process::Command::new("cmd")
                        .args(["/C", "start", "", &file.path])
                        .spawn();
                }
            }
            Message::FileListMessage(fl_msg) => match fl_msg {
                FileListMessage::FileSelected(file) => {
                    self.state.selected_file = Some(file);
                }
                FileListMessage::FileDoubleClicked(file) => {
                    if file.is_dir {
                        self.state.dir_path = file.path;
                        return self.load_files();
                    } else {
                        let _ = std::process::Command::new("cmd")
                            .args(["/C", "start", "", &file.path])
                            .spawn();
                    }
                }
                FileListMessage::VirtualScroll(delta_y) => {
                    let total = self.state.visible_file_count();
                    self.virtual_state.handle_scroll(
                        delta_y,
                        total,
                        spacing::ROW_H,
                        600.0,
                    );
                }
                FileListMessage::LoadMore => {
                    self.state.load_more();
                }
            },

            // Replace rules (with undo history)
            Message::ReplaceContentChanged(index, content) => {
                self.state.push_rule_history();
                if let Some(info) = self.state.replace_infos.get_mut(index) {
                    info.content = content;
                    info.is_error = info.is_regex && !logic::validate_regex(&info.content);
                }
                self.state.detect_conflicts();
            }
            Message::ReplaceTargetChanged(index, target) => {
                self.state.push_rule_history();
                if let Some(info) = self.state.replace_infos.get_mut(index) {
                    info.target = target;
                }
                self.state.detect_conflicts();
            }
            Message::ReplaceEnableToggled(index, enable) => {
                self.state.push_rule_history();
                if let Some(info) = self.state.replace_infos.get_mut(index) {
                    info.enable = enable;
                }
                self.state.detect_conflicts();
            }
            Message::ReplaceRegexToggled(index, is_regex) => {
                self.state.push_rule_history();
                if let Some(info) = self.state.replace_infos.get_mut(index) {
                    info.is_regex = is_regex;
                    info.is_error = is_regex && !logic::validate_regex(&info.content);
                }
                self.state.detect_conflicts();
            }
            Message::RemoveReplaceItem(index) => {
                self.state.push_rule_history();
                if index < self.state.replace_infos.len() {
                    self.state.replace_infos.remove(index);
                    self.state.sync_rules_collapsed();
                }
                self.state.detect_conflicts();
            }
            Message::AddReplaceItem => {
                let allow = self
                    .state
                    .replace_infos
                    .last()
                    .map(|last| !(last.content.is_empty() && last.target.is_empty()))
                    .unwrap_or(true);
                if allow {
                    self.state.push_rule_history();
                    self.state.replace_infos.push(ReplaceInfo::new());
                    self.state.sync_rules_collapsed();
                }
            }
            Message::ClearAllRules => {
                self.state.push_rule_history();
                self.state.replace_infos.clear();
                self.state.sync_rules_collapsed();
                self.state.detect_conflicts();
            }
            Message::ApplyRuleTemplate(template) => {
                self.state.push_rule_history();
                self.state.replace_infos.push(template.to_replace_info());
                self.state.sync_rules_collapsed();
                self.state.detect_conflicts();
            }
            Message::ToggleRuleCollapse(index) => {
                self.state.toggle_rule_collapse(index);
            }

            // Undo
            Message::UndoRuleChange => {
                if let Some(previous) = self.state.pop_rule_history() {
                    self.state.replace_infos = previous;
                    self.state.sync_rules_collapsed();
                    self.state.detect_conflicts();
                }
            }

            // Layout
            Message::PaneResized(event) => {
                self.panes.resize(event.split, event.ratio);
            }

            // Confirm/Status
            Message::ShowConfirmDialog => {
                self.state.show_confirm = true;
            }
            Message::ConfirmRename => {
                self.state.show_confirm = false;
                let result = self.execute_rename();
                self.state.status = Some(result);
                return self.load_files();
            }
            Message::CancelRename => {
                self.state.show_confirm = false;
            }
            Message::ClearStatus => {
                self.state.status = None;
            }
        }
        Task::none()
    }

    fn view(&self) -> Element<'_, Message> {
        let toolbar = self.build_toolbar();
        let panes = self.build_pane_grid();
        let bottom_bar = self.build_bottom_bar();

        let content = column![
            toolbar,
            panes,
            bottom_bar,
        ]
        .width(Length::Fill)
        .height(Length::Fill);

        if self.state.show_confirm {
            let overlay = self.build_confirm_dialog();
            // Stack overlay on top of content using a wrapper column
            // The overlay has Fill dimensions and centers itself, covering the content
            column![content].push(overlay).into()
        } else {
            content.into()
        }
    }
}

impl Rename {
    fn build_panes() -> pane_grid::State<RenamePane> {
        pane_grid::State::with_configuration(pane_grid::Configuration::Split {
            axis: pane_grid::Axis::Vertical,
            ratio: spacing::LEFT_PANEL_RATIO,
            a: Box::new(pane_grid::Configuration::Pane(RenamePane::Rules)),
            b: Box::new(pane_grid::Configuration::Pane(RenamePane::Preview)),
        })
    }

    fn load_files(&self) -> Task<Message> {
        let path = self.state.dir_path.clone();
        Task::perform(async move { FileUtils::list_files(&path) }, Message::FileListLoaded)
    }

    fn execute_rename(&self) -> RenameResult {
        let mut result = RenameResult {
            total: self.state.filter_file_list.len(),
            ..Default::default()
        };

        for info in &self.state.filter_file_list {
            let new_name = logic::apply_replace_rules(&info.name, &self.state.replace_infos);
            let new_path = CommonUtils::join_path(&info.parent_path, &new_name);

            match std::fs::rename(&info.path, &new_path) {
                Ok(_) => result.success += 1,
                Err(e) => result.errors.push(RenameError {
                    file_name: info.name.clone(),
                    error: e.to_string(),
                }),
            }
        }

        result
    }

    // --- Toolbar ---

    fn build_toolbar(&self) -> Element<'_, Message> {
        let has_history = !self.state.rule_history.is_empty();

        let undo_btn = MButton::new(
            ButtonType::ContentBtn,
            false,
            if has_history {
                Some(Message::UndoRuleChange)
            } else {
                None
            },
        )
        .svg_text_btn("assets/svg/arrow_circle_up.svg", "撤销");

        let content = row![
            svg(svg::Handle::from_path("assets/svg/folder.svg"))
                .width(Length::Fixed(18.0))
                .height(Length::Fixed(18.0)),
            text_input("选择文件夹路径...", &self.state.dir_path)
                .on_input(Message::DirPathChanged)
                .width(Length::Fill),
            MButton::new(ButtonType::ContentBtn, false, Some(Message::ChooseDirectory))
                .text_btn("浏览..."),
            MButton::new(ButtonType::ContentBtn, false, Some(Message::ParentDirectory))
                .text_btn("↑ 上级"),
            Space::new().width(Length::Fill),
            undo_btn,
        ]
        .spacing(spacing::SM)
        .align_y(iced::Alignment::Center);

        container(content)
            .padding([spacing::SM as u16, spacing::MD as u16])
            .width(Length::Fill)
            .style(|theme| {
                let c_theme = get_theme(theme);
                container::Style {
                    background: Some(c_theme.toolbar_bg().into()),
                    ..Default::default()
                }
            })
            .into()
    }

    // --- Left Panel ---

    fn build_left_panel(&self) -> Element<'_, Message> {
        let filter_section = self.build_filter_section();
        let rule_cards = replace_rules::view(
            &self.state.replace_infos,
            &self.state.rules_collapsed,
        );

        let templates = RuleTemplate::all();
        let rule_actions = row![
            pick_list(templates, None::<RuleTemplate>, Message::ApplyRuleTemplate)
                .placeholder("模板...")
                .width(Length::Fixed(100.0)),
            Space::new().width(Length::Fill),
            MButton::new(ButtonType::ContentBtn, false, Some(Message::ClearAllRules))
                .svg_size(16.0)
                .svg_text_btn("assets/svg/delete_outline.svg", "清除"),
            MButton::new(ButtonType::ContentBtn, false, Some(Message::AddReplaceItem))
                .svg_size(16.0)
                .svg_text_btn("assets/svg/playlist_add.svg", "添加"),
        ]
        .spacing(spacing::SM)
        .align_y(iced::Alignment::Center);

        let mut panel_content = column![].spacing(spacing::MD).width(Length::Fill);
        panel_content = panel_content.push(filter_section);
        panel_content = panel_content.push(
            text("替换规则")
                .size(13)
                .style(|theme| {
                    let c_theme = get_theme(theme);
                    text::Style {
                        color: Some(c_theme.secondary_text_color()),
                    }
                }),
        );
        panel_content = panel_content.push(rule_cards);
        panel_content = panel_content.push(rule_actions);

        container(
            iced::widget::scrollable(panel_content)
                .width(Length::Fill)
                .height(Length::Fill),
        )
        .padding(spacing::MD)
        .width(Length::Fill)
        .height(Length::Fill)
        .style(|theme| {
            let c_theme = get_theme(theme);
            container::Style {
                background: Some(c_theme.panel_bg().into()),
                ..Default::default()
            }
        })
        .into()
    }

    fn build_filter_section(&self) -> Element<'_, Message> {
        let total_count = self.state.file_list.len();
        let filtered_count = self.state.filter_file_list.len();
        let count_text = if total_count == filtered_count {
            format!("{} 个文件", total_count)
        } else {
            format!("{} / {} 个文件", filtered_count, total_count)
        };

        if self.state.filter_collapsed {
            let summary = self.state.filter_summary();
            return row![
                text(count_text).size(12).style(|theme| {
                    let c_theme = get_theme(theme);
                    text::Style {
                        color: Some(c_theme.secondary_text_color()),
                    }
                }),
                Space::new().width(Length::Fill),
                text(summary).size(12).style(|theme| {
                    let c_theme = get_theme(theme);
                    text::Style {
                        color: Some(c_theme.muted_text_color()),
                    }
                }),
                button(text("展开").size(12))
                    .on_press(Message::ToggleFilterCollapsed)
                    .padding([spacing::XS as u16, spacing::SM as u16]),
            ]
            .spacing(spacing::SM)
            .align_y(iced::Alignment::Center)
            .into();
        }

        let filter_items: Vec<Element<'_, Message>> = self
            .state
            .filter_items
            .iter()
            .enumerate()
            .map(|(i, filter)| {
                let content_input = text_input("输入关键字或正则...", &filter.keyword)
                    .on_input(move |s| Message::FilterChanged(i, s))
                    .width(Length::Fill);

                let regex_toggle = row![
                    checkbox(filter.is_regex)
                        .on_toggle(move |v| Message::FilterRegexToggled(i, v)),
                    text("正则").size(12),
                ]
                .spacing(spacing::XS)
                .align_y(iced::Alignment::Center);

                let remove_btn: Element<'_, Message> = if self.state.filter_items.len() > 1 {
                    button(text("×").size(14))
                        .on_press(Message::RemoveFilterItem(i))
                        .padding([spacing::XS as u16, spacing::SM as u16])
                        .into()
                } else {
                    text("").into()
                };

                row![remove_btn, content_input, regex_toggle]
                    .spacing(spacing::SM)
                    .align_y(iced::Alignment::Center)
                    .into()
            })
            .collect();

        let filter_list = column(filter_items).spacing(spacing::SM);

        let header = row![
            text(count_text).size(12).style(|theme| {
                let c_theme = get_theme(theme);
                text::Style {
                    color: Some(c_theme.secondary_text_color()),
                }
            }),
            Space::new().width(Length::Fill),
            button(text("+ 添加条件").size(12))
                .on_press(Message::AddFilterItem)
                .padding([spacing::XS as u16, spacing::SM as u16]),
            button(text("折叠").size(12))
                .on_press(Message::ToggleFilterCollapsed)
                .padding([spacing::XS as u16, spacing::SM as u16]),
        ]
        .spacing(spacing::SM)
        .align_y(iced::Alignment::Center);

        column![
            text("过滤条件")
                .size(13)
                .style(|theme| {
                    let c_theme = get_theme(theme);
                    text::Style {
                        color: Some(c_theme.secondary_text_color()),
                    }
                }),
            header,
            filter_list,
        ]
        .spacing(spacing::SM)
        .width(Length::Fill)
        .into()
    }

    // --- Panes ---

    fn build_pane_grid(&self) -> Element<'_, Message> {
        pane_grid(&self.panes, |_pane, pane, _is_maximized| {
            pane_grid::Content::new(match pane {
                RenamePane::Rules => self.build_left_panel(),
                RenamePane::Preview => self.build_right_panel(),
            })
        })
        .width(Length::Fill)
        .height(Length::Fill)
        .spacing(1.0)
        .min_size(spacing::LEFT_PANEL_MIN)
        .on_resize(spacing::PANE_RESIZE_LEEWAY, Message::PaneResized)
        .style(|theme| {
            let c_theme = get_theme(theme);
            pane_grid::Style {
                hovered_region: pane_grid::Highlight {
                    background: iced::Background::Color(iced::Color {
                        a: 0.08,
                        ..c_theme.accent_color()
                    }),
                    border: iced::Border {
                        width: 1.0,
                        color: c_theme.border_color(),
                        radius: 0.0.into(),
                    },
                },
                hovered_split: pane_grid::Line {
                    color: c_theme.splitter_hover_bg(),
                    width: 2.0,
                },
                picked_split: pane_grid::Line {
                    color: c_theme.splitter_hover_bg(),
                    width: 2.0,
                },
            }
        })
        .into()
    }

    // --- Right Panel ---

    fn build_right_panel(&self) -> Element<'_, Message> {
        let file_count_text = format!(
            "{} / {} 个文件",
            self.state.visible_file_count(),
            self.state.filter_file_list.len()
        );

        let file_list_content = file_list::view(
            &self.state.filter_file_list,
            &self.state.selected_file,
            &self.state.replace_infos,
            &self.state.conflicts,
            &self.virtual_state,
            self.state.display_limit,
        );

        let mapped = file_list_content.map(Message::FileListMessage);

        column![
            container(
                row![
                    text("文件预览")
                        .size(13)
                        .style(|theme| {
                            let c_theme = get_theme(theme);
                            text::Style {
                                color: Some(c_theme.secondary_text_color()),
                            }
                        }),
                    Space::new().width(Length::Fill),
                    text(file_count_text).size(12).style(|theme| {
                        let c_theme = get_theme(theme);
                        text::Style {
                            color: Some(c_theme.muted_text_color()),
                        }
                    }),
                ]
                .align_y(iced::Alignment::Center)
            )
            .padding([spacing::SM as u16, spacing::MD as u16]),
            mapped,
        ]
        .spacing(spacing::XS)
        .width(Length::Fill)
        .height(Length::Fill)
        .into()
    }

    // --- Bottom Bar ---

    fn build_bottom_bar(&self) -> Element<'_, Message> {
        status_bar::view(&self.state.conflicts, &self.state.status)
    }

    // --- Confirm Dialog ---

    fn build_confirm_dialog(&self) -> Element<'_, Message> {
        let file_count = self.state.filter_file_list.len();
        let rule_count = self.state.replace_infos.iter().filter(|r| r.enable).count();

        container(
            container(
                column![
                    text("确认重命名").size(16).style(|theme| {
                        let c_theme = get_theme(theme);
                        text::Style {
                            color: Some(c_theme.main_text_color()),
                        }
                    }),
                    text(format!(
                        "即将对 {} 个文件应用 {} 条替换规则",
                        file_count, rule_count
                    ))
                    .size(13)
                    .style(|theme| {
                        let c_theme = get_theme(theme);
                        text::Style {
                            color: Some(c_theme.secondary_text_color()),
                        }
                    }),
                    row![
                        MButton::new(
                            ButtonType::ContentBtn,
                            false,
                            Some(Message::CancelRename)
                        )
                        .text_btn("取消"),
                        Space::new().width(Length::Fill),
                        MButton::new(
                            ButtonType::Success,
                            false,
                            Some(Message::ConfirmRename)
                        )
                        .text_btn("确认执行"),
                    ]
                    .spacing(spacing::MD)
                    .align_y(iced::Alignment::Center),
                ]
                .spacing(spacing::LG)
                .padding(spacing::XL),
            )
            .style(|theme| {
                let c_theme = get_theme(theme);
                container::Style {
                    background: Some(c_theme.card_bg().into()),
                    border: iced::Border {
                        radius: 12.0.into(),
                        width: 1.0,
                        color: c_theme.border_color(),
                    },
                    ..Default::default()
                }
            })
            .width(Length::Fixed(380.0)),
        )
        .width(Length::Fill)
        .height(Length::Fill)
        .center_x(Length::Fill)
        .center_y(Length::Fill)
        .style(|_theme| container::Style {
            background: Some(iced::Color::from_rgba(0.0, 0.0, 0.0, 0.5).into()),
            ..Default::default()
        })
        .into()
    }
}
