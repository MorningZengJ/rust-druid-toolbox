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
        let dir_path_row = row![
            text("文件路径：").width(Length::Fixed(80.0)),
            text_input("文件路径", &self.state.dir_path)
                .on_input(Message::DirPathChanged)
                .width(Length::Fill),
            button(text("...").size(14))
                .on_press(Message::ChooseDirectory)
                .padding([4, 8]),
            button(text("↑").size(14))
                .on_press(Message::ParentDirectory)
                .padding([4, 8]),
        ]
        .spacing(5)
        .padding([5, 10]);

        let filter_row = row![
            text("过　滤：").width(Length::Fixed(80.0)),
            text_input("关键字或正则表达式", &self.state.filter.0)
                .on_input(Message::FilterChanged)
                .width(Length::Fill),
            checkbox(self.state.filter.1).on_toggle(Message::FilterRegexToggled),
        ]
        .spacing(5)
        .padding([5, 10]);

        let file_list = self.build_file_list();

        let replace_list = self.build_replace_list();

        let buttons = row![
            button(text("+ 添加规则").size(12))
                .on_press(Message::AddReplaceItem)
                .padding([6, 12]),
            button(text("执行重命名").size(12))
                .on_press(Message::ExecuteRename)
                .padding([6, 12]),
        ]
        .spacing(20)
        .padding(10);

        column![dir_path_row, filter_row, file_list, replace_list, buttons]
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

                let row = row![
                    container(text(&file.name).size(13))
                        .width(Length::FillPortion(1))
                        .padding(3),
                    container(text(preview_name).size(13))
                        .width(Length::FillPortion(1))
                        .padding(3),
                ]
                .width(Length::Fill);

                let style = if is_selected {
                    container::Style {
                        background: Some(iced::Color::from_rgb8(0x00, 0xA7, 0xFF).into()),
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

        let header = row![
            container(text("原文件名").size(13).width(Length::Fill))
                .width(Length::FillPortion(1))
                .padding(3),
            container(text("预览").size(13).width(Length::Fill))
                .width(Length::FillPortion(1))
                .padding(3),
        ]
        .width(Length::Fill);

        let list = column(std::iter::once(header.into()).chain(items)).width(Length::Fill);

        scrollable(list)
            .height(Length::FillPortion(1))
            .width(Length::Fill)
            .into()
    }

    fn build_replace_list(&self) -> Element<'_, Message> {
        let items: Vec<Element<'_, Message>> = self
            .state
            .replace_infos
            .iter()
            .enumerate()
            .map(|(i, info)| {
                let content_input = text_input("替换内容", &info.content)
                    .on_input(move |s| Message::ReplaceContentChanged(i, s))
                    .width(Length::FillPortion(1));

                let target_input = text_input("目标内容", &info.target)
                    .on_input(move |s| Message::ReplaceTargetChanged(i, s))
                    .width(Length::FillPortion(1));

                row![
                    button(text("×").size(14))
                        .on_press(Message::RemoveReplaceItem(i))
                        .padding([4, 8]),
                    content_input,
                    text(" → ").size(14),
                    target_input,
                    checkbox(info.enable).on_toggle(move |e| Message::ReplaceEnableToggled(i, e)),
                    checkbox(info.is_regex).on_toggle(move |e| Message::ReplaceRegexToggled(i, e)),
                ]
                .spacing(5)
                .padding([3, 5])
                .width(Length::Fill)
                .into()
            })
            .collect();

        scrollable(column(items))
            .height(Length::FillPortion(1))
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
