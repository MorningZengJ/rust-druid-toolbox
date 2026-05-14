mod file_list;
pub(crate) mod logic;
mod replace_rules;
mod status_bar;

use crate::model::file_info::FileInfo;
use crate::model::rename_result::{RenameError, RenameResult};
use crate::model::rename_state::{FilterItem, RenameState};
use crate::model::replace_info::ReplaceInfo;
use crate::model::rule_template::RuleTemplate;
use crate::themes::get_theme;
use crate::ui::components::{ButtonType, MButton};
use crate::ui::PageWithNav;
use crate::utils::common_utils::CommonUtils;
use crate::utils::file_utils::FileUtils;
use iced::widget::{button, checkbox, column, container, pick_list, row, text, text_input};
use iced::{Element, Length, Task};

#[derive(Debug, Clone)]
pub enum Message {
    DirPathChanged(String),
    ChooseDirectory,
    ParentDirectory,
    FilterChanged(usize, String),
    FilterRegexToggled(usize, bool),
    AddFilterItem,
    RemoveFilterItem(usize),
    ToggleFilterCollapsed,
    FileListLoaded(Vec<FileInfo>),
    FileSelected(FileInfo),
    FileDoubleClicked(FileInfo),
    ReplaceContentChanged(usize, String),
    ReplaceTargetChanged(usize, String),
    ReplaceEnableToggled(usize, bool),
    ReplaceRegexToggled(usize, bool),
    RemoveReplaceItem(usize),
    AddReplaceItem,
    ApplyRuleTemplate(RuleTemplate),
    ClearAllRules,
    ShowConfirmDialog,
    ConfirmRename,
    CancelRename,
    ClearStatus,
}

#[derive(Debug, Clone, Default)]
pub struct Rename {
    state: RenameState,
}

impl PageWithNav for Rename {
    type Message = Message;

    fn update(&mut self, msg: Message) -> Task<Message> {
        match msg {
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
            Message::FilterChanged(index, keyword) => {
                if let Some(filter) = self.state.filter_items.get_mut(index) {
                    filter.keyword = keyword;
                    self.state.update_filter_file_list();
                }
            }
            Message::FilterRegexToggled(index, is_regex) => {
                if let Some(filter) = self.state.filter_items.get_mut(index) {
                    filter.is_regex = is_regex;
                    self.state.update_filter_file_list();
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
                }
            }
            Message::ToggleFilterCollapsed => {
                self.state.filter_collapsed = !self.state.filter_collapsed;
            }
            Message::FileListLoaded(files) => {
                self.state.file_list = files;
                self.state.update_filter_file_list();
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
            Message::ReplaceContentChanged(index, content) => {
                if let Some(info) = self.state.replace_infos.get_mut(index) {
                    info.content = content;
                    info.is_error = info.is_regex && !logic::validate_regex(&info.content);
                }
            }
            Message::ReplaceTargetChanged(index, target) => {
                if let Some(info) = self.state.replace_infos.get_mut(index) {
                    info.target = target;
                }
            }
            Message::ReplaceEnableToggled(index, enable) => {
                if let Some(info) = self.state.replace_infos.get_mut(index) {
                    info.enable = enable;
                }
            }
            Message::ReplaceRegexToggled(index, is_regex) => {
                if let Some(info) = self.state.replace_infos.get_mut(index) {
                    info.is_regex = is_regex;
                    info.is_error = is_regex && !logic::validate_regex(&info.content);
                }
            }
            Message::RemoveReplaceItem(index) => {
                if index < self.state.replace_infos.len() {
                    self.state.replace_infos.remove(index);
                }
            }
            Message::AddReplaceItem => {
                let allow = self
                    .state
                    .replace_infos
                    .last()
                    .map(|last| !(last.content.is_empty() && last.target.is_empty()))
                    .unwrap_or(true);
                if allow {
                    self.state.replace_infos.push(ReplaceInfo::new());
                }
            }
            Message::ClearAllRules => {
                self.state.replace_infos.clear();
            }
            Message::ApplyRuleTemplate(template) => {
                self.state.replace_infos.push(template.to_replace_info());
            }
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
        let dir_path_section = self.build_dir_path_section();
        let filter_section = self.build_filter_section();

        let file_count = self.state.filter_file_list.len();
        let file_list_content = file_list::view(
            &self.state.filter_file_list,
            &self.state.selected_file,
            &self.state.replace_infos,
            Message::FileSelected,
            Message::FileDoubleClicked,
        );
        let file_list_section = Self::card(
            "文件列表",
            text(format!("{} 个文件", file_count)).size(12).style(|theme| {
                let c_theme = get_theme(theme);
                text::Style { color: Some(c_theme.secondary_text_color()) }
            }).into(),
            file_list_content,
        );

        let rule_count = self.state.replace_infos.len();
        let replace_content = replace_rules::view(&self.state.replace_infos);
        let templates = RuleTemplate::all();
        let replace_header = row![
            text(format!("{} 条规则", rule_count)).size(12).style(|theme| {
                let c_theme = get_theme(theme);
                text::Style { color: Some(c_theme.secondary_text_color()) }
            }),
            iced::widget::Space::new().width(Length::Fill),
            pick_list(
                templates,
                None::<RuleTemplate>,
                Message::ApplyRuleTemplate,
            )
            .placeholder("模板...")
            .width(Length::Fixed(120.0)),
            MButton::new(ButtonType::ContentBtn, false, Some(Message::ClearAllRules))
                .svg_size(16.0)
                .svg_text_btn("assets/svg/delete_outline.svg", "清除"),
            MButton::new(ButtonType::ContentBtn, false, Some(Message::AddReplaceItem))
                .svg_size(16.0)
                .svg_text_btn("assets/svg/playlist_add.svg", "添加规则"),
        ]
        .spacing(8)
        .align_y(iced::Alignment::Center);
        let replace_section = Self::card(
            "替换规则",
            replace_header.into(),
            replace_content,
        );

        let buttons = self.build_action_buttons();

        let mut content = column![].spacing(12).width(Length::Fill).height(Length::Fill);

        if let Some(status_element) = status_bar::view(&self.state.status) {
            content = content.push(status_element);
        }

        content = content
            .push(dir_path_section)
            .push(filter_section)
            .push(file_list_section)
            .push(replace_section)
            .push(buttons);

        if self.state.show_confirm {
            let overlay = self.build_confirm_dialog();
            content = content.push(overlay);
        }

        content.into()
    }
}

impl Rename {
    fn card<'a, Message: Clone + 'a>(
        title: &'a str,
        header_extra: Element<'a, Message>,
        content: Element<'a, Message>,
    ) -> Element<'a, Message> {
        container(
            column![
                row![
                    text(title).size(14).style(|theme| {
                        let c_theme = get_theme(theme);
                        text::Style { color: Some(c_theme.main_text_color()) }
                    }),
                    iced::widget::Space::new().width(Length::Fill),
                    header_extra,
                ]
                .align_y(iced::Alignment::Center),
                content,
            ]
            .spacing(10),
        )
        .padding(16)
        .width(Length::Fill)
        .style(|theme| {
            let c_theme = get_theme(theme);
            container::Style {
                background: Some(c_theme.card_bg().into()),
                border: c_theme.card_border(),
                ..Default::default()
            }
        })
        .into()
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

    fn build_dir_path_section(&self) -> Element<'_, Message> {
        let content = row![
            text_input("选择文件夹路径...", &self.state.dir_path)
                .on_input(Message::DirPathChanged)
                .width(Length::Fill),
            MButton::new(ButtonType::ContentBtn, false, Some(Message::ChooseDirectory))
                .text_btn("浏览..."),
            MButton::new(ButtonType::ContentBtn, false, Some(Message::ParentDirectory))
                .text_btn("↑ 上级"),
        ]
        .spacing(8);

        Self::card("文件路径", text("").into(), content.into())
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
            // 折叠状态：显示简单预览
            let summary = self.state.filter_summary();
            let header = row![
                text(count_text).size(12).style(|theme| {
                    let c_theme = get_theme(theme);
                    text::Style { color: Some(c_theme.secondary_text_color()) }
                }),
                iced::widget::Space::new().width(Length::Fill),
                text(summary).size(12).style(|theme| {
                    let c_theme = get_theme(theme);
                    text::Style { color: Some(c_theme.muted_text_color()) }
                }),
                MButton::new(ButtonType::ContentBtn, false, Some(Message::ToggleFilterCollapsed))
                    .svg_size(16.0)
                    .text_btn("展开"),
            ]
            .spacing(8)
            .align_y(iced::Alignment::Center);

            return Self::card("过滤条件", header.into(), text("").into());
        }

        // 展开状态：显示完整过滤条件列表
        let filter_items: Vec<Element<'_, Message>> = self.state.filter_items
            .iter()
            .enumerate()
            .map(|(i, filter)| {
                let content_input = text_input("输入关键字或正则表达式...", &filter.keyword)
                    .on_input(move |s| Message::FilterChanged(i, s))
                    .width(Length::Fill);

                let regex_toggle = row![
                    checkbox(filter.is_regex)
                        .on_toggle(move |v| Message::FilterRegexToggled(i, v)),
                    text("正则").size(13),
                ]
                .spacing(4)
                .align_y(iced::Alignment::Center);

                let remove_btn: Element<'_, Message> = if self.state.filter_items.len() > 1 {
                    button(text("×").size(16))
                        .on_press(Message::RemoveFilterItem(i))
                        .padding([4, 8])
                        .into()
                } else {
                    text("").into()
                };

                row![
                    remove_btn,
                    content_input,
                    regex_toggle,
                ]
                .spacing(8)
                .align_y(iced::Alignment::Center)
                .into()
            })
            .collect();

        let filter_list = column(filter_items).spacing(8);

        let header = row![
            text(count_text).size(12).style(|theme| {
                let c_theme = get_theme(theme);
                text::Style { color: Some(c_theme.secondary_text_color()) }
            }),
            iced::widget::Space::new().width(Length::Fill),
            MButton::new(ButtonType::ContentBtn, false, Some(Message::AddFilterItem))
                .svg_size(16.0)
                .text_btn("+ 添加条件"),
            MButton::new(ButtonType::ContentBtn, false, Some(Message::ToggleFilterCollapsed))
                .svg_size(16.0)
                .text_btn("折叠"),
        ]
        .spacing(8)
        .align_y(iced::Alignment::Center);

        Self::card("过滤条件", header.into(), filter_list.into())
    }

    fn build_action_buttons(&self) -> Element<'_, Message> {
        container(
            row![
                iced::widget::Space::new().width(Length::Fill),
                MButton::new(ButtonType::Success, false, Some(Message::ShowConfirmDialog))
                    .svg_text_btn("assets/svg/playlist_add_check.svg", "执行重命名"),
            ]
            .spacing(12)
            .align_y(iced::Alignment::Center),
        )
        .padding(iced::Padding {
            top: 4.0,
            right: 0.0,
            bottom: 0.0,
            left: 0.0,
        })
        .into()
    }

    fn build_confirm_dialog(&self) -> Element<'_, Message> {
        let file_count = self.state.filter_file_list.len();
        let rule_count = self.state.replace_infos.iter().filter(|r| r.enable).count();

        container(
            container(
                column![
                    text("确认重命名").size(16).style(|theme| {
                        let c_theme = get_theme(theme);
                        text::Style { color: Some(c_theme.main_text_color()) }
                    }),
                    text(format!(
                        "即将对 {} 个文件应用 {} 条替换规则",
                        file_count, rule_count
                    ))
                    .size(13)
                    .style(|theme| {
                        let c_theme = get_theme(theme);
                        text::Style { color: Some(c_theme.secondary_text_color()) }
                    }),
                    row![
                        MButton::new(ButtonType::ContentBtn, false, Some(Message::CancelRename))
                            .text_btn("取消"),
                        iced::widget::Space::new().width(Length::Fill),
                        MButton::new(ButtonType::Success, false, Some(Message::ConfirmRename))
                            .text_btn("确认执行"),
                    ]
                    .spacing(12)
                    .align_y(iced::Alignment::Center),
                ]
                .spacing(16)
                .padding(20),
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
