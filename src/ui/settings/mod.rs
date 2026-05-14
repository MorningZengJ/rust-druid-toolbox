use crate::ui::navigation::{route_page, NavigationAction, PageComponent};
use iced::widget::{column, container, text};
use iced::{Element, Length, Task};

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub enum Message {
    Navigate(NavigationAction<route_page::RoutePage>),
}

#[derive(Debug, Default)]
pub struct Settings {}

impl PageComponent<Message> for Settings {
    fn update(&mut self, message: Message) -> Task<Message> {
        match message {
            Message::Navigate(_) => Task::none(),
        }
    }

    fn view(&self) -> Element<'_, Message> {
        container(
            column![
                text("设置").size(25),
                text("Hello Settings").size(16),
            ]
            .spacing(20)
            .padding(20),
        )
        .width(Length::Fill)
        .height(Length::Fill)
        .center_x(Length::Fill)
        .center_y(Length::Fill)
        .into()
    }
}
