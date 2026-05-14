use crate::model::replace_info::ReplaceInfo;
use crate::themes::get_theme;
use crate::ui::rename::Message;
use iced::widget::{button, checkbox, column, container, row, scrollable, text, text_input};
use iced::{Element, Length};

pub fn view<'a>(replace_infos: &'a [ReplaceInfo]) -> Element<'a, Message> {
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
    .style(|theme| {
        let c_theme = get_theme(theme);
        container::Style {
            background: Some(c_theme.table_header_bg().into()),
            border: iced::Border {
                radius: iced::border::Radius {
                    top_left: 6.0,
                    top_right: 6.0,
                    bottom_right: 0.0,
                    bottom_left: 0.0,
                },
                ..Default::default()
            },
            ..Default::default()
        }
    })
    .width(Length::Fill);

    let items: Vec<Element<'a, Message>> = replace_infos
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

            let is_error = info.is_error;
            container(row)
                .width(Length::Fill)
                .style(move |theme| {
                    let c_theme = get_theme(theme);
                    container::Style {
                        border: if is_error {
                            iced::Border {
                                radius: 0.0.into(),
                                width: 1.0,
                                color: c_theme.error_color(),
                            }
                        } else {
                            c_theme.table_row_border()
                        },
                        ..Default::default()
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
