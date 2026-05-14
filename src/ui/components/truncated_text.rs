use iced::widget::{container, text, tooltip};
use iced::Element;

use crate::themes::get_theme;

/// Creates a truncated text element with tooltip showing full content.
/// The text will be clipped when it exceeds the container width,
/// and a tooltip will show the full text on hover.
pub fn truncated_text_with_tooltip<'a, Message>(
    content: &str,
    size: f32,
) -> Element<'a, Message>
where
    Message: 'a + Clone,
{
    let full_text = content.to_string();
    let truncated_text = content.to_string();

    let text_widget = text(truncated_text)
        .size(size)
        .wrapping(iced::widget::text::Wrapping::None)
        .style(|theme| {
            let c_theme = get_theme(theme);
            text::Style {
                color: Some(c_theme.main_text_color()),
            }
        });

    let tooltip_content = container(
        text(full_text)
            .size(size)
            .style(|theme| {
                let c_theme = get_theme(theme);
                text::Style {
                    color: Some(c_theme.main_text_color()),
                }
            }),
    )
    .padding(8)
    .style(|theme| {
        let c_theme = get_theme(theme);
        container::Style {
            background: Some(c_theme.table_header_bg().into()),
            border: iced::Border {
                radius: 4.0.into(),
                ..Default::default()
            },
            ..Default::default()
        }
    });

    tooltip(
        container(text_widget).clip(true),
        tooltip_content,
        tooltip::Position::Top,
    )
    .into()
}

/// Creates a truncated text element with muted style and tooltip.
pub fn truncated_text_muted_with_tooltip<'a, Message>(
    content: &str,
    size: f32,
) -> Element<'a, Message>
where
    Message: 'a + Clone,
{
    let full_text = content.to_string();
    let truncated_text = content.to_string();

    let text_widget = text(truncated_text)
        .size(size)
        .wrapping(iced::widget::text::Wrapping::None)
        .style(|theme| {
            let c_theme = get_theme(theme);
            text::Style {
                color: Some(c_theme.muted_text_color()),
            }
        });

    let tooltip_content = container(
        text(full_text)
            .size(size)
            .style(|theme| {
                let c_theme = get_theme(theme);
                text::Style {
                    color: Some(c_theme.muted_text_color()),
                }
            }),
    )
    .padding(8)
    .style(|theme| {
        let c_theme = get_theme(theme);
        container::Style {
            background: Some(c_theme.table_header_bg().into()),
            border: iced::Border {
                radius: 4.0.into(),
                ..Default::default()
            },
            ..Default::default()
        }
    });

    tooltip(
        container(text_widget).clip(true),
        tooltip_content,
        tooltip::Position::Top,
    )
    .into()
}
