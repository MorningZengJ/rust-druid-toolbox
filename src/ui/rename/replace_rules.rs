use crate::model::replace_info::ReplaceInfo;
use crate::themes::get_theme;
use crate::ui::rename::spacing;
use crate::ui::rename::Message;
use iced::widget::{
    button, checkbox, column, container, row, scrollable, text, text_input, Space,
};
use iced::{Element, Length};

pub fn view<'a>(replace_infos: &'a [ReplaceInfo], collapsed: &'a [bool]) -> Element<'a, Message> {
    let items: Vec<Element<'a, Message>> = replace_infos
        .iter()
        .enumerate()
        .map(|(i, info)| {
            let is_collapsed = collapsed.get(i).copied().unwrap_or(false);
            rule_card(i, info, is_collapsed)
        })
        .collect();

    let list = column(items).spacing(spacing::SM).width(Length::Fill);

    scrollable(list)
        .height(Length::Fill)
        .width(Length::Fill)
        .into()
}

fn rule_card<'a>(index: usize, info: &'a ReplaceInfo, is_collapsed: bool) -> Element<'a, Message> {
    let collapse_icon = if is_collapsed { "▶" } else { "▼" };

    let content_preview = if info.content.is_empty() {
        "空规则".to_string()
    } else {
        info.content.clone()
    };

    // Header row - always visible
    let header = row![
        button(text(collapse_icon).size(12))
            .on_press(Message::ToggleRuleCollapse(index))
            .padding([spacing::XS as u16, spacing::SM as u16]),
        text(if is_collapsed {
            content_preview
        } else {
            format!("规则 {}", index + 1)
        })
        .size(13)
        .width(Length::Fill),
        Space::new().width(Length::Fill),
        row![
            checkbox(info.enable)
                .on_toggle(move |e| Message::ReplaceEnableToggled(index, e)),
            text("启用").size(12),
        ]
        .spacing(spacing::XS)
        .align_y(iced::Alignment::Center),
        row![
            checkbox(info.is_regex)
                .on_toggle(move |e| Message::ReplaceRegexToggled(index, e)),
            text("正则").size(12),
        ]
        .spacing(spacing::XS)
        .align_y(iced::Alignment::Center),
        button(text("×").size(14))
            .on_press(Message::RemoveReplaceItem(index))
            .padding([spacing::XS as u16, spacing::SM as u16]),
    ]
    .spacing(spacing::SM)
    .align_y(iced::Alignment::Center);

    // Body - visible when expanded
    let body: Option<Element<'a, Message>> = if !is_collapsed {
        Some(
            column![
                text_input("查找内容...", &info.content)
                    .on_input(move |s| Message::ReplaceContentChanged(index, s))
                    .width(Length::Fill),
                row![
                    text("→").size(14).style(|theme| {
                        let c_theme = get_theme(theme);
                        iced::widget::text::Style {
                            color: Some(c_theme.secondary_text_color()),
                        }
                    }),
                    Space::new().width(Length::Fill),
                ]
                .align_y(iced::Alignment::Center),
                text_input("替换为...", &info.target)
                    .on_input(move |s| Message::ReplaceTargetChanged(index, s))
                    .width(Length::Fill),
            ]
            .spacing(spacing::SM)
            .into(),
        )
    } else {
        None
    };

    let mut card_content = column![header].spacing(spacing::SM);
    if let Some(body) = body {
        card_content = card_content.push(body);
    }

    let is_error = info.is_error;
    container(card_content)
        .padding(spacing::MD)
        .width(Length::Fill)
        .style(move |theme| {
            let c_theme = get_theme(theme);
            container::Style {
                background: Some(c_theme.card_bg().into()),
                border: iced::Border {
                    radius: spacing::CARD_RADIUS.into(),
                    width: if is_error { 2.0 } else { 0.0 },
                    color: if is_error {
                        c_theme.error_color()
                    } else {
                        iced::Color::TRANSPARENT
                    },
                },
                ..Default::default()
            }
        })
        .into()
}
