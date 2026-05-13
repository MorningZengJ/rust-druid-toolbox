use crate::model::file_info::FileInfo;
use crate::model::rename_state::RenameState;
use crate::model::replace_info::ReplaceInfo;
use crate::ui::PageWithNav;
use crate::utils::common_utils::CommonUtils;
use crate::utils::file_utils::FileUtils;
use fancy_regex::Regex;
use iced::widget::{
    button, checkbox, column, container, row, scrollable, text, text_input,
};
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
    ExecuteRename,
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
                self.state.parent_path();
                return self.load_files();
            }
            Message::FilterChanged(filter) => {
                self.state.filter.0 = filter;
                self.state.get_filter_file_list();
            }
            Message::FilterRegexToggled(is_regex) => {
                self.state.filter.1 = is_regex;
                self.state.get_filter_file_list();
            }
            Message::FileListLoaded(files) => {
                self.state.file_list = files;
                self.state.get_filter_file_list();
            }
            Message::FileSelected(file) => {
                self.state.selected_file = Some(file);
            }
            Message::FileDoubleClicked(file) => {
                if file.is_dir {
                    self.state.dir_path = file.path;
                    return self.load_files();
                }
            }
            Message::ReplaceContentChanged(index, content) => {
                if let Some(info) = self.state.replace_infos.get_mut(index) {
                    info.content = content;
                    info.is_error = info.is_regex && Regex::new(&info.content).is_err();
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
                    info.is_error = is_regex && Regex::new(&info.content).is_err();
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
            Message::ExecuteRename => {
                for info in &mut self.state.filter_file_list {
                    let replace_infos = &self.state.replace_infos;
                    for ri in replace_infos {
                        if ri.enable {
                            info.name = if ri.is_regex {
                                match Regex::new(&ri.content) {
                                    Ok(regex) => {
                                        regex.replace_all(&info.name, ri.target.clone()).to_string()
                                    }
                                    Err(_) => info.name.clone(),
                                }
                            } else {
                                info.name.replace(&ri.content, &ri.target)
                            };
                        }
                    }
                    let new_name = CommonUtils::join_path(&info.parent_path, &info.name);
                    let _ = std::fs::rename(&info.path, new_name);
                }
                return self.load_files();
            }
        }
        Task::none()
    }

    fn view(&self) -> Element<'_, Message> {
        // Directory path section
        let dir_path_section = container(
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
        });

        // Filter section
        let filter_section = container(
            column![
                text("过滤条件").size(14),
                row![
                    text_input("输入关键字或正则表达式...", &self.state.filter.0)
                        .on_input(Message::FilterChanged)
                        .width(Length::Fill),
                    row![
                        checkbox(self.state.filter.1).on_toggle(Message::FilterRegexToggled),
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
        });

        // File list section
        let file_count = self.state.filter_file_list.len();
        let file_list_section = container(
            column![
                row![
                    text("文件列表").size(14),
                    iced::widget::Space::new().width(Length::Fill),
                    text(format!("{} 个文件", file_count)).size(12),
                ],
                self.build_file_list(),
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

        // Divider
        let divider = container(text("").size(1))
            .height(Length::Fixed(1.0))
            .width(Length::Fill)
            .style(|_theme| container::Style {
                background: Some(iced::Color::from_rgb8(0x3E, 0x3E, 0x42).into()),
                ..Default::default()
            });

        // Replace rules section
        let rule_count = self.state.replace_infos.len();
        let replace_section = container(
            column![
                row![
                    text("替换规则").size(14),
                    iced::widget::Space::new().width(Length::Fill),
                    text(format!("{} 条规则", rule_count)).size(12),
                ],
                self.build_replace_list(),
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

        // Action buttons
        let buttons = container(
            row![
                button(
                    row![
                        text("+").size(16),
                        text(" 添加规则").size(13),
                    ]
                    .spacing(4)
                    .align_y(iced::Alignment::Center),
                )
                .on_press(Message::AddReplaceItem)
                .padding([8, 20]),
                iced::widget::Space::new().width(Length::Fill),
                button(
                    row![
                        text("▶").size(14),
                        text(" 执行重命名").size(13),
                    ]
                    .spacing(4)
                    .align_y(iced::Alignment::Center),
                )
                .on_press(Message::ExecuteRename)
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
        });

        column![
            dir_path_section,
            filter_section,
            file_list_section,
            divider,
            replace_section,
            buttons,
        ]
        .spacing(4)
        .width(Length::Fill)
        .height(Length::Fill)
        .into()
    }
}

impl Rename {
    fn load_files(&self) -> Task<Message> {
        let path = self.state.dir_path.clone();
        Task::perform(async move { FileUtils::list_files(&path) }, Message::FileListLoaded)
    }

    fn build_file_list(&self) -> Element<'_, Message> {
        let header = container(
            row![
                container(text("文件名").size(12))
                    .width(Length::FillPortion(3))
                    .padding(6),
                container(text("预览").size(12))
                    .width(Length::FillPortion(3))
                    .padding(6),
                container(text("类型").size(12))
                    .width(Length::FillPortion(1))
                    .padding(6),
                container(text("大小").size(12))
                    .width(Length::FillPortion(1))
                    .padding(6),
            ]
            .width(Length::Fill),
        )
        .style(|_theme| container::Style {
            background: Some(iced::Color::from_rgb8(0x2A, 0x2A, 0x2E).into()),
            ..Default::default()
        })
        .width(Length::Fill);

        let items: Vec<Element<'_, Message>> = self
            .state
            .filter_file_list
            .iter()
            .enumerate()
            .map(|(_i, file)| {
                let is_selected = self
                    .state
                    .selected_file
                    .as_ref()
                    .map(|s| s == file)
                    .unwrap_or(false);

                let preview_name = self.preview_name(&file.name);
                let file_type = if file.is_dir {
                    "📁"
                } else {
                    "📄"
                };

                let row = row![
                    container(text(&file.name).size(13))
                        .width(Length::FillPortion(3))
                        .padding(6),
                    container(text(preview_name).size(13))
                        .width(Length::FillPortion(3))
                        .padding(6),
                    container(text(file_type).size(13))
                        .width(Length::FillPortion(1))
                        .padding(6),
                    container(text(&file.size).size(12))
                        .width(Length::FillPortion(1))
                        .padding(6),
                ]
                .width(Length::Fill);

                let style = if is_selected {
                    container::Style {
                        background: Some(iced::Color::from_rgb8(0x00, 0x6B, 0xB0).into()),
                        ..Default::default()
                    }
                } else {
                    container::Style::default()
                };

                container(row)
                    .width(Length::Fill)
                    .style(move |_| style)
                    .into()
            })
            .collect();

        let list = column(std::iter::once(header.into()).chain(items)).width(Length::Fill);

        scrollable(list)
            .height(Length::Fill)
            .width(Length::Fill)
            .into()
    }

    fn build_replace_list(&self) -> Element<'_, Message> {
        let header = container(
            row![
                container(text("").size(12)).width(Length::Fixed(40.0)),
                container(text("查找内容").size(12))
                    .width(Length::FillPortion(1))
                    .padding(6),
                container(text("").size(12)).width(Length::Fixed(30.0)),
                container(text("替换为").size(12))
                    .width(Length::FillPortion(1))
                    .padding(6),
                container(text("启用").size(12)).width(Length::Fixed(50.0)),
                container(text("正则").size(12)).width(Length::Fixed(50.0)),
            ]
            .width(Length::Fill),
        )
        .style(|_theme| container::Style {
            background: Some(iced::Color::from_rgb8(0x2A, 0x2A, 0x2E).into()),
            ..Default::default()
        })
        .width(Length::Fill);

        let items: Vec<Element<'_, Message>> = self
            .state
            .replace_infos
            .iter()
            .enumerate()
            .map(|(i, info)| {
                let content_input = text_input("输入查找内容...", &info.content)
                    .on_input(move |s| Message::ReplaceContentChanged(i, s))
                    .width(Length::FillPortion(1));

                let target_input = text_input("输入替换内容...", &info.target)
                    .on_input(move |s| Message::ReplaceTargetChanged(i, s))
                    .width(Length::FillPortion(1));

                let row = row![
                    container(
                        button(text("×").size(16))
                            .on_press(Message::RemoveReplaceItem(i))
                            .padding([4, 8]),
                    )
                    .width(Length::Fixed(40.0))
                    .center_x(Length::Fill),
                    content_input,
                    container(text("→").size(16))
                        .width(Length::Fixed(30.0))
                        .center_x(Length::Fill),
                    target_input,
                    container(
                        checkbox(info.enable).on_toggle(move |e| Message::ReplaceEnableToggled(i, e)),
                    )
                    .width(Length::Fixed(50.0))
                    .center_x(Length::Fill),
                    container(
                        checkbox(info.is_regex).on_toggle(move |e| Message::ReplaceRegexToggled(i, e)),
                    )
                    .width(Length::Fixed(50.0))
                    .center_x(Length::Fill),
                ]
                .spacing(4)
                .padding([6, 4])
                .width(Length::Fill)
                .align_y(iced::Alignment::Center);

                container(row)
                    .width(Length::Fill)
                    .style(|_theme| container::Style {
                        border: iced::Border {
                            width: 1.0,
                            color: iced::Color::from_rgb8(0x3A, 0x3A, 0x3E),
                            ..Default::default()
                        },
                        ..Default::default()
                    })
                    .into()
            })
            .collect();

        let list = column(std::iter::once(header.into()).chain(items)).width(Length::Fill);

        scrollable(list)
            .height(Length::Fill)
            .width(Length::Fill)
            .into()
    }

    fn preview_name(&self, name: &str) -> String {
        let mut text = name.to_string();
        for info in &self.state.replace_infos {
            if info.enable {
                text = if info.is_regex {
                    match Regex::new(&info.content) {
                        Ok(regex) => regex.replace_all(&text, info.target.clone()).to_string(),
                        Err(_) => text,
                    }
                } else {
                    text.replace(&info.content, &info.target)
                };
            }
        }
        text
    }
}
