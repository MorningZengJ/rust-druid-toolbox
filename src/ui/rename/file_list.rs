use crate::model::file_info::FileInfo;
use crate::model::replace_info::ReplaceInfo;
use crate::themes::get_theme;
use crate::ui::rename::logic;
use iced::widget::{column, container, row, scrollable, text};
use iced::{Element, Length};

pub fn view<'a, Message>(
    filter_file_list: &'a [FileInfo],
    selected_file: &Option<FileInfo>,
    replace_infos: &[ReplaceInfo],
) -> Element<'a, Message>
where
    Message: Clone + 'a,
{
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
    .style(|theme| {
        let c_theme = get_theme(theme);
        container::Style {
            background: Some(c_theme.table_header_bg().into()),
            ..Default::default()
        }
    })
    .width(Length::Fill);

    let items: Vec<Element<'a, Message>> = filter_file_list
        .iter()
        .map(|file| {
            let is_selected = selected_file.as_ref().map(|s| s == file).unwrap_or(false);
            let preview_name = logic::apply_replace_rules(&file.name, replace_infos);
            let file_type = if file.is_dir { "📁" } else { "📄" };

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

            container(row)
                .width(Length::Fill)
                .style(move |theme| {
                    let c_theme = get_theme(theme);
                    if is_selected {
                        container::Style {
                            background: Some(c_theme.selected_row_bg().into()),
                            ..Default::default()
                        }
                    } else {
                        container::Style::default()
                    }
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
