use crate::themes::get_theme;
use crate::ui::components::{ButtonType, MButton};
use crate::ui::navigation::route_page::RoutePage;
use iced::widget::{column, container, text};
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
    let app_title = container(text("Toolbox").size(16).width(Length::Fill))
        .padding([20, 10])
        .center_x(Length::Fill);

    let nav_buttons = column![
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
        iced::widget::Space::new().height(Length::Fixed(8.0)),
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
    ]
    .height(Length::Fill)
    .align_x(Alignment::Center);

    container(column![app_title, nav_buttons].padding(6))
        .width(Length::Fixed(90.0))
        .height(Length::Fill)
        .style(|theme| {
            let c_theme = get_theme(theme);
            container::Style::default()
                .background(c_theme.nav_bg())
        })
        .into()
}
