mod file_list;
pub(crate) mod logic;
mod replace_rules;
mod status_bar;

use crate::model::file_info::FileInfo;
use crate::model::rename_result::{RenameError, RenameResult};
use crate::model::rename_state::RenameState;
use crate::model::replace_info::ReplaceInfo;
use crate::themes::get_theme;
use crate::ui::PageWithNav;
use crate::utils::common_utils::CommonUtils;
use crate::utils::file_utils::FileUtils;
use iced::widget::{button, checkbox, column, container, row, text, text_input};
use iced::{Element, Length, Task};

#[derive(Debug, Clone)]
pub enum Message {
    DirPathChanged(String),
    ChooseDirectory,
    ParentDirectory,
    FilterChanged(String),
    FilterRegexToggled(bool),
    FileListLoaded(Vec<FileInfo>),
    FileSelected(FileInfo),
    FileDoubleClicked(FileInfo),
    ReplaceContentChanged(usize, String),
    ReplaceTargetChanged(usize, String),
    ReplaceEnableToggled(usize, bool),
    ReplaceRegexToggled(usize, bool),
    RemoveReplaceItem(usize),
    AddReplaceItem,
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
            Message::FilterChanged(keyword) => {
                self.state.filter.keyword = keyword;
                self.state.update_filter_file_list();
            }
            Message::FilterRegexToggled(is_regex) => {
                self.state.filter.is_regex = is_regex;
                self.state.update_filter_file_list();
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
        let file_list_section = container(
            column![
                row![
                    text("文件列表").size(14),
                    iced::widget::Space::new().width(Length::Fill),
                    text(format!("{} 个文件", file_count)).size(12),
                ],
                file_list::view(
                    &self.state.filter_file_list,
                    &self.state.selected_file,
                    &self.state.replace_infos,
                    Message::FileSelected,
                    Message::FileDoubleClicked,
                ),
            ]
            .spacing(8),
        )
        .height(Length::FillPortion(1))
        .padding(iced::Padding {
            top: 0.0,
            right: 0.0,
            bottom: 8.0,
            left: 0.0,
        });

        let divider = container(text("").size(1))
            .height(Length::Fixed(1.0))
            .width(Length::Fill)
            .style(|theme| {
                let c_theme = get_theme(theme);
                container::Style {
                    background: Some(c_theme.border_color().into()),
                    ..Default::default()
                }
            });

        let rule_count = self.state.replace_infos.len();
        let replace_section = container(
            column![
                row![
                    text("替换规则").size(14),
                    iced::widget::Space::new().width(Length::Fill),
                    text(format!("{} 条规则", rule_count)).size(12),
                ],
                replace_rules::view(&self.state.replace_infos),
            ]
            .spacing(8),
        )
        .height(Length::FillPortion(1))
        .padding(iced::Padding {
            top: 8.0,
            right: 0.0,
            bottom: 0.0,
            left: 0.0,
        });

        let buttons = self.build_action_buttons();

        let mut content = column![].spacing(4).width(Length::Fill).height(Length::Fill);

        if let Some(status_element) = status_bar::view(&self.state.status) {
            content = content.push(status_element);
        }

        content = content
            .push(dir_path_section)
            .push(filter_section)
            .push(file_list_section)
            .push(divider)
            .push(replace_section)
            .push(buttons);

        if self.state.show_confirm {
            let overlay = self.build_confirm_dialog();
            // Note: Iced doesn't have built-in modal support, so we show the dialog inline
            content = content.push(overlay);
        }

        content.into()
    }
}

impl Rename {
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
        container(
            column![
                text("文件路径").size(14),
                row![
                    text_input("选择文件夹路径...", &self.state.dir_path)
                        .on_input(Message::DirPathChanged)
                        .width(Length::Fill),
                    button(text("浏览...").size(13))
                        .on_press(Message::ChooseDirectory)
                        .padding([8, 16]),
                    button(text("↑ 上级").size(13))
                        .on_press(Message::ParentDirectory)
                        .padding([8, 12]),
                ]
                .spacing(8),
            ]
            .spacing(6),
        )
        .padding(iced::Padding {
            top: 0.0,
            right: 0.0,
            bottom: 16.0,
            left: 0.0,
        })
        .into()
    }

    fn build_filter_section(&self) -> Element<'_, Message> {
        container(
            column![
                text("过滤条件").size(14),
                row![
                    text_input("输入关键字或正则表达式...", &self.state.filter.keyword)
                        .on_input(Message::FilterChanged)
                        .width(Length::Fill),
                    row![
                        checkbox(self.state.filter.is_regex)
                            .on_toggle(Message::FilterRegexToggled),
                        text("正则").size(13),
                    ]
                    .spacing(4)
                    .align_y(iced::Alignment::Center),
                ]
                .spacing(8),
            ]
            .spacing(6),
        )
        .padding(iced::Padding {
            top: 0.0,
            right: 0.0,
            bottom: 16.0,
            left: 0.0,
        })
        .into()
    }

    fn build_action_buttons(&self) -> Element<'_, Message> {
        container(
            row![
                button(
                    row![text("+").size(16), text(" 添加规则").size(13),]
                        .spacing(4)
                        .align_y(iced::Alignment::Center),
                )
                .on_press(Message::AddReplaceItem)
                .padding([8, 20]),
                iced::widget::Space::new().width(Length::Fill),
                button(
                    row![text("▶").size(14), text(" 执行重命名").size(13),]
                        .spacing(4)
                        .align_y(iced::Alignment::Center),
                )
                .on_press(Message::ShowConfirmDialog)
                .padding([8, 20]),
            ]
            .spacing(12)
            .align_y(iced::Alignment::Center),
        )
        .padding(iced::Padding {
            top: 16.0,
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
                    text("确认重命名").size(16),
                    text(format!(
                        "即将对 {} 个文件应用 {} 条替换规则",
                        file_count, rule_count
                    ))
                    .size(13),
                    row![
                        button(text("取消").size(13))
                            .on_press(Message::CancelRename)
                            .padding([8, 20]),
                        iced::widget::Space::new().width(Length::Fill),
                        button(text("确认执行").size(13))
                            .on_press(Message::ConfirmRename)
                            .padding([8, 20]),
                    ]
                    .spacing(12)
                    .align_y(iced::Alignment::Center),
                ]
                .spacing(12)
                .padding(16),
            )
            .style(|theme| {
                let c_theme = get_theme(theme);
                container::Style {
                    background: Some(c_theme.card_bg().into()),
                    border: iced::Border {
                        radius: 8.0.into(),
                        width: 1.0,
                        color: c_theme.border_color(),
                    },
                    ..Default::default()
                }
            })
            .width(Length::Fixed(350.0)),
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
