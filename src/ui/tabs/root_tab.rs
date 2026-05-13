use crate::ui::components::{ButtonType, MButton};
use crate::ui::navigation::route_page::RoutePage;
use iced::widget::{column, container};
use iced::{Alignment, Element, Length};

#[derive(Debug, Clone)]
pub enum Message {
    Tab(Page),
    Navigate(RoutePage),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Page {
    #[default]
    Rename,
    Settings,
}

pub fn view(active: Page) -> Element<'static, Message> {
    container(
        column![
            column!(
                iced::widget::Space::new().height(Length::Fill),
                MButton::new_vertical(
                    ButtonType::PrimaryNav,
                    Page::Rename == active,
                    if Page::Rename != active {
                        Some(Message::Tab(Page::Rename))
                    } else {
                        None
                    },
                )
                .svg_text_btn("assets/svg/border_color.svg", "重命名")
                .width(Length::Fill),
                MButton::new_vertical(
                    ButtonType::PrimaryNav,
                    Page::Settings == active,
                    if Page::Settings != active {
                        Some(Message::Tab(Page::Settings))
                    } else {
                        None
                    },
                )
                .svg_text_btn("assets/svg/settings.svg", "设置")
                .width(Length::Fill),
                iced::widget::Space::new().height(Length::Fill),
            )
            .height(Length::Fill),
        ]
        .padding(6),
    )
    .width(Length::Fixed(80.0))
    .height(Length::Fill)
    .align_x(Alignment::Center)
    .into()
}
