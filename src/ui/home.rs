use crate::themes::get_theme;
use crate::ui::navigation::{route_page, NavigationAction, PageComponent};
use crate::ui::tabs::root_tab;
use crate::ui::{rename, PageWithNav};
use iced::widget::{container, row};
use iced::{Element, Length, Size, Subscription, Task};

#[derive(Debug, Clone)]
pub enum Message {
    Tab(root_tab::Message),
    Navigate(NavigationAction<route_page::RoutePage>),

    Rename(rename::Message),
}

#[derive(Debug, Default)]
pub struct Home {
    active_page: root_tab::Page,

    rename: rename::Rename,
}

impl PageComponent<Message> for Home {
    fn init(&self) -> Task<Message> {
        Task::none()
    }

    fn update(&mut self, message: Message) -> Task<Message> {
        match message {
            Message::Tab(message) => match message {
                root_tab::Message::Tab(page) => {
                    self.active_page = page;
                    Task::none()
                }
                root_tab::Message::Navigate(page) => {
                    Task::done(Message::Navigate(NavigationAction::Push(page)))
                }
            },
            Message::Rename(msg) => self.rename.update(msg).map(Message::Rename),
            Message::Navigate(_) => Task::none(),
        }
    }

    fn view(&self) -> Element<'_, Message> {
        let nav_element = root_tab::view(self.active_page).map(Message::Tab);

        let content = match self.active_page {
            root_tab::Page::Rename => self.rename.view().map(Message::Rename),
            root_tab::Page::Settings => {
                iced::widget::text("").into()
            }
        };

        let content = container(content)
            .padding(16)
            .width(Length::Fill)
            .height(Length::Fill)
            .style(|theme| {
                let c_theme = get_theme(theme);
                container::Style::default()
                    .background(c_theme.main_bg())
            });

        row![nav_element, content]
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
    }

    fn resize(&mut self, _size: Size) {}

    fn subscription(&self) -> Subscription<Message> {
        Subscription::none()
    }
}
