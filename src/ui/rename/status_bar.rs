use crate::model::rename_result::RenameResult;
use crate::themes::get_theme;
use iced::widget::{container, row, text};
use iced::{Element, Length};

pub fn view<'a, Message: 'a>(status: &'a Option<RenameResult>) -> Option<Element<'a, Message>> {
    status.as_ref().map(|result| {
        let (icon, icon_color) = if result.is_success() {
            ("✓", [0x10, 0xB9, 0x81])
        } else {
            ("✗", [0xEF, 0x44, 0x44])
        };

        let content = row![
            text(icon).size(14).style(move |_| text::Style {
                color: Some(iced::Color::from_rgb8(
                    icon_color[0],
                    icon_color[1],
                    icon_color[2],
                )),
            }),
            text(result.summary()).size(13),
        ]
        .spacing(8)
        .align_y(iced::Alignment::Center);

        container(content)
            .padding([8, 12])
            .width(Length::Fill)
            .style(|theme| {
                let c_theme = get_theme(theme);
                let bg = if result.is_success() {
                    c_theme.status_success_bg()
                } else {
                    c_theme.status_error_bg()
                };
                container::Style {
                    background: Some(bg.into()),
                    border: iced::Border {
                        radius: 6.0.into(),
                        ..Default::default()
                    },
                    ..Default::default()
                }
            })
            .into()
    })
}
