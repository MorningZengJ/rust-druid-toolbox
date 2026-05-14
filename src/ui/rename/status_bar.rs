use crate::model::rename_result::RenameResult;
use crate::model::rename_state::ConflictInfo;
use crate::themes::get_theme;
use crate::ui::components::{ButtonType, MButton};
use crate::ui::rename::spacing;
use crate::ui::rename::Message;
use iced::widget::{button, container, row, text, Space};
use iced::{Element, Length};

pub fn view<'a>(
    conflicts: &[ConflictInfo],
    status: &'a Option<RenameResult>,
) -> Element<'a, Message> {
    // Left: conflict warnings
    let conflict_section: Element<'a, Message> = if conflicts.is_empty() {
        text("").into()
    } else {
        row![
            text("⚠").size(14).style(|theme| {
                let c_theme = get_theme(theme);
                iced::widget::text::Style {
                    color: Some(c_theme.warning_color()),
                }
            }),
            text(format!("{} 个文件名冲突", conflicts.len()))
                .size(12)
                .style(|theme| {
                    let c_theme = get_theme(theme);
                    iced::widget::text::Style {
                        color: Some(c_theme.warning_color()),
                    }
                }),
        ]
        .spacing(spacing::XS)
        .align_y(iced::Alignment::Center)
        .into()
    };

    // Center: status
    let status_section: Element<'a, Message> = match status {
        Some(result) => {
            let is_success = result.is_success();
            let icon = if is_success { "✓" } else { "✗" };
            row![
                text(icon).size(14).style(move |theme| {
                    let c_theme = get_theme(theme);
                    iced::widget::text::Style {
                        color: Some(if is_success {
                            c_theme.success_color()
                        } else {
                            c_theme.error_color()
                        }),
                    }
                }),
                text(result.summary()).size(12).style(|theme| {
                    let c_theme = get_theme(theme);
                    iced::widget::text::Style {
                        color: Some(c_theme.main_text_color()),
                    }
                }),
                button(text("×").size(14))
                    .on_press(Message::ClearStatus)
                    .padding([2, 6]),
            ]
            .spacing(spacing::XS)
            .align_y(iced::Alignment::Center)
            .into()
        }
        None => text("").into(),
    };

    // Right: execute button
    let execute_btn = MButton::new(
        ButtonType::Success,
        false,
        Some(Message::ShowConfirmDialog),
    )
    .svg_text_btn("assets/svg/playlist_add_check.svg", "执行重命名");

    let content = row![
        conflict_section,
        Space::new().width(Length::Fill),
        status_section,
        Space::new().width(Length::Fill),
        execute_btn,
    ]
    .spacing(spacing::MD)
    .align_y(iced::Alignment::Center);

    container(content)
        .padding([spacing::SM as u16, spacing::LG as u16])
        .width(Length::Fill)
        .height(Length::Fixed(spacing::BOTTOM_BAR_H))
        .style(|theme| {
            let c_theme = get_theme(theme);
            container::Style {
                background: Some(c_theme.bottom_bar_bg().into()),
                ..Default::default()
            }
        })
        .into()
}
