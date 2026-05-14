use crate::model::rename_result::RenameResult;
use crate::themes::get_theme;
use iced::widget::{container, row, text};
use iced::{Element, Length};

pub fn view<'a, Message: 'a>(status: &'a Option<RenameResult>) -> Option<Element<'a, Message>> {
    status.as_ref().map(|result| {
        let is_success = result.is_success();
        let icon = if is_success { "✓" } else { "✗" };

        let content = row![
            text(icon).size(14).style(move |theme| {
                let c_theme = get_theme(theme);
                text::Style {
                    color: Some(if is_success {
                        c_theme.success_color()
                    } else {
                        c_theme.error_color()
                    }),
                }
            }),
            text(result.summary()).size(13).style(|theme| {
                let c_theme = get_theme(theme);
                text::Style {
                    color: Some(c_theme.main_text_color()),
                }
            }),
        ]
        .spacing(8)
        .align_y(iced::Alignment::Center);

        container(content)
            .padding([8, 12])
            .width(Length::Fill)
            .style(move |theme| {
                let c_theme = get_theme(theme);
                let bg = if is_success {
                    c_theme.status_success_bg()
                } else {
                    c_theme.status_error_bg()
                };
                container::Style {
                    background: Some(bg.into()),
                    border: iced::Border {
                        radius: 8.0.into(),
                        ..Default::default()
                    },
                    ..Default::default()
                }
            })
            .into()
    })
}
